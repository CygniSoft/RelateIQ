import { Router, type IRouter } from "express";
import nodemailer from "nodemailer";

const router: IRouter = Router();

function createTransporter() {
  const user = process.env["GMAIL_USER"];
  const pass = process.env["GMAIL_APP_PASSWORD"]?.replace(/\s/g, "");

  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

router.post("/send-email", async (req, res): Promise<void> => {
  const { to, subject, body, fromName } = req.body ?? {};

  if (typeof to !== "string" || !to.includes("@")) {
    res.status(400).json({ error: "Invalid or missing 'to' email address" });
    return;
  }
  if (typeof subject !== "string" || subject.trim() === "") {
    res.status(400).json({ error: "Missing 'subject'" });
    return;
  }
  if (typeof body !== "string" || body.trim() === "") {
    res.status(400).json({ error: "Missing 'body'" });
    return;
  }

  const gmailUser = process.env["GMAIL_USER"];

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: fromName ? `"${fromName}" <${gmailUser}>` : gmailUser,
      to,
      subject,
      text: body,
    });
    req.log.info({ to }, "Email sent successfully");
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err, to }, "Failed to send email");
    res.status(500).json({
      error: "Failed to send email",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
