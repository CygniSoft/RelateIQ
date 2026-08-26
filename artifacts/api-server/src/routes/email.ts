import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import nodemailer from "nodemailer";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_RECIPIENT = "manager@cygnisoft.com";
const CONTACT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_MAX_REQUESTS = 5;
const contactRequests = new Map<string, number[]>();

function hasControlChars(value: string): boolean {
  // Reject CR/LF and other control characters to prevent header injection.
  // eslint-disable-next-line no-control-regex
  return /[\r\n\u0000-\u001f\u007f]/.test(value);
}

function buildFrom(address: string, fromName?: unknown): string {
  if (typeof fromName !== "string") return address;
  const name = fromName.replace(/[\r\n"\\<>]/g, "").trim();
  if (name === "") return address;
  return `${name} <${address}>`;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (contactRequests.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < CONTACT_WINDOW_MS,
  );

  if (recent.length >= CONTACT_MAX_REQUESTS) {
    contactRequests.set(ip, recent);
    return true;
  }

  recent.push(now);
  contactRequests.set(ip, recent);
  return false;
}

type SmtpAuth = { user: string; pass: string };

interface ResolvedTransport {
  options:
    | { host: string; port: number; secure: boolean; auth: SmtpAuth }
    | { service: "gmail"; auth: SmtpAuth };
  fromAddress: string;
}

/**
 * Resolve SMTP credentials from env, provider-agnostic.
 *
 * Preferred: generic SMTP via SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
 * (works with any provider — Outlook, Yahoo, iCloud, SendGrid, Mailgun, a work
 * mailbox, etc.). SMTP_SECURE ("true"/"false") and SMTP_FROM (custom verified
 * sender address) are optional; port defaults to 587, secure defaults to
 * port === 465, and the from-address defaults to SMTP_USER.
 *
 * Fallback: legacy Gmail via GMAIL_USER / GMAIL_APP_PASSWORD.
 *
 * Returns null when nothing is configured.
 */
function resolveSmtpTransport(): ResolvedTransport | null {
  const host = process.env["SMTP_HOST"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  if (host && user && pass) {
    const port = Number(process.env["SMTP_PORT"]) || 587;
    const secureEnv = process.env["SMTP_SECURE"];
    const secure =
      secureEnv === undefined ? port === 465 : secureEnv === "true";
    const fromAddress = process.env["SMTP_FROM"]?.trim() || user;
    return { options: { host, port, secure, auth: { user, pass } }, fromAddress };
  }

  const gmailUser = process.env["GMAIL_USER"];
  const gmailPass = process.env["GMAIL_APP_PASSWORD"];
  if (gmailUser && gmailPass) {
    return {
      options: { service: "gmail", auth: { user: gmailUser, pass: gmailPass } },
      fromAddress: gmailUser,
    };
  }

  return null;
}

router.post("/contact", async (req, res): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({
      error: "Too many messages. Please wait a few minutes and try again.",
    });
    return;
  }

  const { name, email, message, website } = (req.body ?? {}) as Record<
    string,
    unknown
  >;

  // Bots commonly fill hidden fields. Return success without sending.
  if (typeof website === "string" && website.trim() !== "") {
    res.json({ success: true });
    return;
  }

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim() : "";
  const cleanMessage = typeof message === "string" ? message.trim() : "";

  if (
    cleanName.length < 2 ||
    cleanName.length > 100 ||
    hasControlChars(cleanName)
  ) {
    res.status(400).json({ error: "Please enter a valid name." });
    return;
  }
  if (
    cleanEmail.length > 254 ||
    !EMAIL_RE.test(cleanEmail) ||
    hasControlChars(cleanEmail)
  ) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  if (cleanMessage.length < 10 || cleanMessage.length > 5000) {
    res.status(400).json({
      error: "Your message must be between 10 and 5,000 characters.",
    });
    return;
  }

  const transport = resolveSmtpTransport();
  if (!transport) {
    req.log.error("SMTP is not configured for website contact messages");
    res.status(503).json({
      error: "Messaging is temporarily unavailable. Please try again later.",
    });
    return;
  }

  const transporter = nodemailer.createTransport(transport.options);

  try {
    const info = await transporter.sendMail({
      from: buildFrom(transport.fromAddress, "RelateIQ+ Website"),
      to: CONTACT_RECIPIENT,
      subject: `RelateIQ+ website inquiry from ${cleanName}`,
      text: [
        "New message from the RelateIQ+ website",
        "",
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        "",
        cleanMessage,
      ].join("\n"),
      replyTo: cleanEmail,
    });

    req.log.info(
      { to: CONTACT_RECIPIENT, id: info.messageId },
      "Website contact message sent",
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error(
      { err, to: CONTACT_RECIPIENT },
      "Failed to send website contact message",
    );
    res.status(502).json({
      error: "We could not send your message. Please try again shortly.",
    });
  }
});

router.post("/send-email", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { to, subject, body, fromName, replyTo } = (req.body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof to !== "string" || !EMAIL_RE.test(to)) {
    res.status(400).json({ error: "Invalid or missing 'to' email address" });
    return;
  }
  if (
    typeof subject !== "string" ||
    subject.trim() === "" ||
    subject.length > 998 ||
    hasControlChars(subject)
  ) {
    res.status(400).json({ error: "Invalid or missing 'subject'" });
    return;
  }
  if (typeof body !== "string" || body.trim() === "") {
    res.status(400).json({ error: "Missing 'body'" });
    return;
  }
  if (
    replyTo !== undefined &&
    (typeof replyTo !== "string" || !EMAIL_RE.test(replyTo))
  ) {
    res.status(400).json({ error: "Invalid 'replyTo' email address" });
    return;
  }

  const transport = resolveSmtpTransport();
  if (!transport) {
    req.log.error(
      "SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS, or GMAIL_USER/GMAIL_APP_PASSWORD)",
    );
    res.status(500).json({
      error: "Email sending is not configured (missing SMTP credentials)",
    });
    return;
  }

  // Most SMTP providers (incl. Gmail) require the authenticated account as the
  // envelope sender, so the address is the configured account (or SMTP_FROM if
  // the provider allows a custom verified sender). We show the sending user's
  // name as the display name, and route replies to their own email.
  const from = buildFrom(transport.fromAddress, fromName);

  const transporter = nodemailer.createTransport(transport.options);

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      // Replies go straight back to the person who sent the introduction.
      replyTo: typeof replyTo === "string" ? replyTo : undefined,
    });

    req.log.info({ to, id: info.messageId }, "Email sent successfully");
    res.json({ success: true, id: info.messageId });
  } catch (err) {
    req.log.error({ err, to }, "Failed to send email");
    res.status(502).json({
      error: "Failed to send email",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
