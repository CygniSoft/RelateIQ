import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { Resend } from "resend";

const router: IRouter = Router();

const DEFAULT_FROM = "RelateIQ+ <onboarding@resend.dev>";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hasControlChars(value: string): boolean {
  // Reject CR/LF and other control characters to prevent header injection.
  // eslint-disable-next-line no-control-regex
  return /[\r\n\u0000-\u001f\u007f]/.test(value);
}

function buildFrom(baseFrom: string, fromName?: unknown): string {
  if (typeof fromName !== "string") return baseFrom;
  const name = fromName.replace(/[\r\n"\\<>]/g, "").trim();
  if (name === "") return baseFrom;
  const match = baseFrom.match(/<([^>]+)>/);
  const address = match ? match[1] : baseFrom.trim();
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
  if (replyTo !== undefined && (typeof replyTo !== "string" || !EMAIL_RE.test(replyTo))) {
    res.status(400).json({ error: "Invalid 'replyTo' email address" });
    return;
  }

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    req.log.error("RESEND_API_KEY is not configured");
    res
      .status(500)
      .json({ error: "Email sending is not configured (missing RESEND_API_KEY)" });
    return;
  }

  // EMAIL_FROM is an address on a domain verified in Resend, e.g.
  // "RelateIQ+ <intros@relateiq.app>". Falls back to Resend's shared
  // onboarding sender for initial testing.
  const baseFrom = process.env["EMAIL_FROM"] || DEFAULT_FROM;
  // Show the sender's name as the display name while keeping the verified
  // app-domain address, so recipients see who the intro is from.
  const from = buildFrom(baseFrom, fromName);

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      text: body,
      // Replies go straight back to the person who sent the introduction.
      replyTo: typeof replyTo === "string" ? replyTo : undefined,
    });

    if (error) {
      req.log.error({ err: error, to }, "Failed to send email");
      res.status(502).json({ error: "Failed to send email", detail: error.message });
      return;
    }

    req.log.info({ to, id: data?.id }, "Email sent successfully");
    res.json({ success: true, id: data?.id });
  } catch (err) {
    req.log.error({ err, to }, "Failed to send email");
    res.status(500).json({
      error: "Failed to send email",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
