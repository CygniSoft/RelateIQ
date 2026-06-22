import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { recordHeartbeat, listActiveSessions } from "../lib/sessionStore";

const router: IRouter = Router();

function cleanLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\r\n\u0000-\u001f\u007f]/g, "").trim();
  if (trimmed === "") return null;
  return trimmed.slice(0, 120);
}

// Heartbeat: registers/refreshes the current device session and enforces the
// concurrent-session limit. Returns revoked=true when this device has been
// signed out because the account is in use on another device.
router.post("/sessions/heartbeat", async (req, res): Promise<void> => {
  const { userId, sessionId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!sessionId) {
    // No Clerk session id to track (e.g. machine token); nothing to enforce.
    res.json({ revoked: false, activeCount: 1, limit: 1 });
    return;
  }

  const deviceLabel = cleanLabel((req.body as { deviceLabel?: unknown })?.deviceLabel);
  try {
    const result = await recordHeartbeat(userId, sessionId, deviceLabel);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to record session heartbeat");
    res.status(500).json({ error: "Heartbeat failed" });
  }
});

// List the user's currently active devices/sessions.
router.get("/sessions", async (req, res): Promise<void> => {
  const { userId, sessionId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const sessions = await listActiveSessions(userId, sessionId ?? null);
    res.json({ sessions });
  } catch (err) {
    req.log.error({ err }, "Failed to list sessions");
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

export default router;
