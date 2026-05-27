import { Router } from "express";
import { getSession, createGuestSession, getSessionCookieOptions, COOKIE_NAME } from "../lib/zoya-session";

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

export default router;
