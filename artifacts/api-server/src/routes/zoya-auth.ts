import { Router } from "express";
import { getSession, createGuestSession, createNamedSession, getSessionCookieOptions, COOKIE_NAME } from "../lib/zoya-session";

const router = Router();

router.get("/auth/session", async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      res.json({ authenticated: false, session: null });
      return;
    }
    res.json({
      authenticated: true,
      session: {
        userId: session.userId,
        isGuest: session.isGuest,
        name: session.name,
        email: session.email,
        avatarUrl: session.avatarUrl,
      },
    });
  } catch {
    res.json({ authenticated: false, session: null });
  }
});

router.post("/auth/guest", async (req, res) => {
  try {
    const sessionId = await createGuestSession();
    const opts = getSessionCookieOptions();
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${sessionId}; Path=${opts.path}; Max-Age=${opts.maxAge}; SameSite=${opts.sameSite}${opts.httpOnly ? "; HttpOnly" : ""}${opts.secure ? "; Secure" : ""}`
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Guest session error");
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Named registration — creates a real account with name (and optional email)
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const sessionId = await createNamedSession(name.trim(), email?.trim() || null);
    const opts = getSessionCookieOptions();
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${sessionId}; Path=${opts.path}; Max-Age=${opts.maxAge}; SameSite=${opts.sameSite}${opts.httpOnly ? "; HttpOnly" : ""}${opts.secure ? "; Secure" : ""}`
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Failed to create account" });
  }
});

// Upgrade guest → named account
router.post("/auth/upgrade", async (req, res) => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: "No active session" });
      return;
    }
    // If already named, just update
    const { pool } = await import("../lib/zoya-db");
    await pool.query(
      `UPDATE users SET name = $1, email = $2, is_guest = false WHERE id = $3`,
      [name.trim(), email?.trim() || null, session.userId]
    );
    res.json({ success: true, name: name.trim() });
  } catch (err) {
    req.log.error({ err }, "Upgrade error");
    res.status(500).json({ error: "Failed to upgrade" });
  }
});

export default router;
