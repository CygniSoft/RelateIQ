import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import nodemailer from "nodemailer";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const gmailUser = process.env["GMAIL_USER"];
  const gmailPass = process.env["GMAIL_APP_PASSWORD"];
  if (!gmailUser || !gmailPass) {
    req.log.error("GMAIL_USER or GMAIL_APP_PASSWORD is not configured");
    res.status(500).json({
      error: "Email sending is not configured (missing Gmail credentials)",
    });
    return;
  }

  // Gmail requires the authenticated account as the envelope sender, so the
  // address is always the configured Gmail account. We show the sending user's
  // name as the display name, and route replies to their own email.
  const from = buildFrom(gmailUser, fromName);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

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
