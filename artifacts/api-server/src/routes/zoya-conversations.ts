import { Router } from "express";
import { zoyaPool } from "../lib/zoya-db";
import { getZoyaSession } from "../lib/zoya-session";

const router = Router();

router.get("/conversations", async (req, res) => {
  try {
    const session = await getZoyaSession(req);
    if (!session) { res.json({ conversations: [] }); return; }

    const result = await zoyaPool.query(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              (SELECT content FROM zoya_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM zoya_conversations c
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC
       LIMIT 50`,
      [session.userId]
    );
    res.json({ conversations: result.rows });
  } catch (err) {
    req.log.error(err, "List conversations error");
    res.json({ conversations: [] });
  }
});

router.delete("/conversations", async (req, res) => {
  try {
    const { id } = req.body as { id?: string };
    const session = await getZoyaSession(req);
    if (!session || !id) { res.status(401).json({ error: "Unauthorized" }); return; }

    await zoyaPool.query(
      `DELETE FROM zoya_conversations WHERE id = $1 AND user_id = $2`,
      [id, session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Delete conversation error");
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const session = await getZoyaSession(req);
    if (!session) { res.json({ messages: [] }); return; }

    const verify = await zoyaPool.query(
      `SELECT id FROM zoya_conversations WHERE id = $1 AND user_id = $2`,
      [req.params.id, session.userId]
    );
    if (!verify.rows.length) { res.json({ messages: [] }); return; }

    const result = await zoyaPool.query(
      `SELECT id, role, content, created_at FROM zoya_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    req.log.error(err, "Get messages error");
    res.json({ messages: [] });
  }
});

export default router;
