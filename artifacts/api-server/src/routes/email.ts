import { Router, type IRouter } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import nodemailer from "nodemailer";
import {
  claimMeetingInvite,
  markMeetingInviteFailed,
  markMeetingInviteSending,
  markMeetingInviteSent,
  releaseMeetingInviteClaim,
} from "../lib/meetingInviteStore";
import {
  buildMeetingInviteIcs,
  parseFutureIsoDate,
} from "../lib/meetingInviteIcs";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_RECIPIENT = "manager@cygnisoft.com";
const CONTACT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_MAX_REQUESTS = 5;
const contactRequests = new Map<string, number[]>();
const MEETING_INVITE_WINDOW_MS = 15 * 60 * 1000;
const MEETING_INVITE_MAX_REQUESTS = 10;
const meetingInviteRequests = new Map<string, number[]>();
const UUID_LIKE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function isMeetingInviteRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (meetingInviteRequests.get(key) ?? []).filter(
    (timestamp) => now - timestamp < MEETING_INVITE_WINDOW_MS,
  );

  if (recent.length >= MEETING_INVITE_MAX_REQUESTS) {
    meetingInviteRequests.set(key, recent);
    return true;
  }

  recent.push(now);
  meetingInviteRequests.set(key, recent);
  return false;
}

function isValidEmail(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 254 &&
    !hasControlChars(value) &&
    EMAIL_RE.test(value)
  );
}

async function getVerifiedOrganizer(
  userId: string,
): Promise<{ email: string; name: string } | null> {
  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.primaryEmailAddress;
    if (
      !email ||
      email.verification?.status !== "verified" ||
      !isValidEmail(email.emailAddress)
    ) {
      return null;
    }
    const rawName =
      user.fullName?.trim() ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      email.emailAddress;
    const name = cleanBoundedString(rawName, 120, false) || email.emailAddress;
    return { email: email.emailAddress, name };
  } catch {
    return null;
  }
}

function cleanBoundedString(
  value: unknown,
  maxLength: number,
  required = true,
): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (
    (required && clean.length === 0) ||
    clean.length > maxLength ||
    hasControlChars(clean)
  ) {
    return null;
  }
  return clean;
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

router.post("/meeting-invite", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const uid = typeof body.uid === "string" ? body.uid.trim() : "";
  const to = cleanBoundedString(body.to, 254);
  const title = cleanBoundedString(body.title, 255);
  const location =
    body.location === undefined ? undefined : cleanBoundedString(body.location, 500);
  const description =
    body.description === undefined
      ? undefined
      : cleanBoundedString(body.description, 5_000, false);
  const startDate = parseFutureIsoDate(body.startDate);
  const endDate = parseFutureIsoDate(body.endDate);
  const reminderMinutes = body.reminderMinutes;

  if (
    uid.length > 64 ||
    !UUID_LIKE_RE.test(uid) ||
    !to ||
    !isValidEmail(to) ||
    !title ||
    location === null ||
    description === null ||
    !startDate ||
    !endDate ||
    endDate.getTime() <= startDate.getTime() ||
    endDate.getTime() - startDate.getTime() > 24 * 60 * 60 * 1000 ||
    (reminderMinutes !== undefined &&
      (!Number.isInteger(reminderMinutes) ||
        typeof reminderMinutes !== "number" ||
        reminderMinutes < 0 ||
        reminderMinutes > 10_080))
  ) {
    res.status(400).json({ error: "Invalid meeting invitation request." });
    return;
  }

  const organizer = await getVerifiedOrganizer(userId);
  if (!organizer) {
    res.status(422).json({
      error: "A verified account email is required to send invitations.",
    });
    return;
  }

  let claim;
  try {
    claim = await claimMeetingInvite(userId, uid);
  } catch {
    req.log.error("Failed to claim meeting invitation");
    res
      .status(503)
      .json({ error: "Meeting invitations are temporarily unavailable." });
    return;
  }
  if (claim.outcome === "sent") {
    res.json({ success: true, deduplicated: true, deliveryStatus: "sent" });
    return;
  }
  if (claim.outcome === "unknown") {
    res.status(202).json({ success: true, deliveryStatus: "unknown" });
    return;
  }
  if (claim.outcome === "busy") {
    res
      .status(409)
      .json({ success: true, deliveryStatus: "pending" });
    return;
  }
  if (claim.outcome === "rate_limited") {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }
  // This is defense-in-depth only; durable per-user event rows above enforce
  // the actual invitation quota across API processes.
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (isMeetingInviteRateLimited(`${userId}:${ip}`)) {
    await releaseMeetingInviteClaim(userId, uid, claim.claimToken).catch(() =>
      req.log.error("Failed to release meeting invitation claim"),
    );
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }

  const transport = resolveSmtpTransport();
  if (!transport) {
    req.log.error("SMTP is not configured for meeting invitations");
    await releaseMeetingInviteClaim(userId, uid, claim.claimToken).catch(() =>
      req.log.error("Failed to release meeting invitation claim"),
    );
    res
      .status(503)
      .json({ error: "Meeting invitations are temporarily unavailable." });
    return;
  }

  const invite = buildMeetingInviteIcs({
    uid,
    to,
    organizerName: organizer.name,
    organizerEmail: organizer.email,
    title,
    startDate,
    endDate,
    location: location || undefined,
    description: description || undefined,
    reminderMinutes: reminderMinutes as number | undefined,
  });

  try {
    const markedSending = await markMeetingInviteSending(
      userId,
      uid,
      claim.claimToken,
    );
    if (!markedSending) {
      req.log.error("Meeting invitation claim was not ready for delivery");
      res.status(409).json({ success: true, deliveryStatus: "pending" });
      return;
    }
  } catch {
    req.log.error("Failed to record meeting invitation delivery start");
    res
      .status(503)
      .json({ error: "Meeting invitations are temporarily unavailable." });
    return;
  }

  try {
    await nodemailer.createTransport(transport.options).sendMail({
      from: buildFrom(transport.fromAddress, "ConnectIQ"),
      to,
      replyTo: organizer.email,
      subject: `Meeting invitation: ${title}`,
      text: "You have received a meeting invitation from ConnectIQ.",
      attachments: [
        {
          filename: "meeting-invitation.ics",
          content: invite,
          contentType: "text/calendar; charset=utf-8; method=REQUEST",
        },
      ],
    });
  } catch {
    req.log.error("Failed to send meeting invitation");
    await markMeetingInviteFailed(userId, uid, claim.claimToken).catch(() =>
      req.log.error("Failed to mark meeting invitation delivery failed"),
    );
    res
      .status(502)
      .json({ error: "Meeting invitations are temporarily unavailable." });
    return;
  }

  try {
    const recorded = await markMeetingInviteSent(userId, uid, claim.claimToken);
    if (!recorded) {
      req.log.error("Meeting invitation delivery record was not updated");
    }
  } catch {
    // SMTP accepted the message. Do not invite a client retry or mark this
    // failed when the durable confirmation cannot be written.
    req.log.error("Failed to record meeting invitation delivery");
  }
  req.log.info("Meeting invitation sent");
  res.json({ success: true, deliveryStatus: "sent" });
});

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
