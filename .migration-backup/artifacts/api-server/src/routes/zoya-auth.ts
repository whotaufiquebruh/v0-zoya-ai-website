import { Router } from "express";
import { getZoyaSession, createGuestSession } from "../lib/zoya-session";

const router = Router();

router.get("/auth/session", async (req, res) => {
  try {
    const session = await getZoyaSession(req);
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
      },
    });
  } catch {
    res.json({ authenticated: false, session: null });
  }
});

router.post("/auth/guest", async (req, res) => {
  try {
    const session = await createGuestSession(res);
    res.json({ success: true, session });
  } catch (err) {
    req.log.error(err, "Guest session error");
    res.status(500).json({ error: "Failed to create session" });
  }
});

export default router;
