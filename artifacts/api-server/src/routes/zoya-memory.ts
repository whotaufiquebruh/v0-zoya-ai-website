import { Router } from "express";
import { pool, ensureSchema } from "../lib/zoya-db";
import { getSession } from "../lib/zoya-session";

const router = Router();

router.get("/memory", async (req, res) => {
  try {
    await ensureSchema();
    const session = await getSession(req);
    if (!session) { res.json({ memory: [] }); return; }

    const result = await pool.query(
      `SELECT memory_key, memory_value, updated_at FROM user_memory WHERE user_id = $1 ORDER BY updated_at DESC`,
      [session.userId]
    );

    res.json({ memory: result.rows });
  } catch {
    res.json({ memory: [] });
  }
});

router.post("/memory", async (req, res) => {
  try {
    const { key, value } = req.body as { key?: string; value?: string };
    const session = await getSession(req);
    if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }

    await pool.query(
      `INSERT INTO user_memory (user_id, memory_key, memory_value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, memory_key) DO UPDATE SET memory_value = $3, updated_at = NOW()`,
      [session.userId, key, value]
    );

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
