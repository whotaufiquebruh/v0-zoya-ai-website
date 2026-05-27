import { Router } from "express";
import { pool, ensureSchema } from "../lib/zoya-db";
import { getSession } from "../lib/zoya-session";

const router = Router();

router.get("/conversations", async (req, res) => {
  try {
    await ensureSchema();
    const session = await getSession(req);
    if (!session) { res.json({ conversations: [] }); return; }

    const result = await pool.query(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM conversations c
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC
       LIMIT 50`,
      [session.userId]
    );

    res.json({ conversations: result.rows });
  } catch (err) {
    req.log.error({ err }, "Conversations GET error");
    res.json({ conversations: [] });
  }
});

router.delete("/conversations", async (req, res) => {
  try {
    const { id } = req.body as { id?: string };
    const session = await getSession(req);
    if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }

    await pool.query(
      `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, session.userId]
    );

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Conversations DELETE error");
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const session = await getSession(req);
    if (!session) { res.json({ messages: [] }); return; }

    const verify = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, session.userId]
    );
    if (verify.rows.length === 0) { res.json({ messages: [] }); return; }

    const result = await pool.query(
      `SELECT id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    req.log.error({ err }, "Messages GET error");
    res.json({ messages: [] });
  }
});

export default router;
