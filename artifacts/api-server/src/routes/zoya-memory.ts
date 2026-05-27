import { Router } from "express";
import { zoyaPool } from "../lib/zoya-db";
import { getZoyaSession } from "../lib/zoya-session";

const router = Router();

router.get("/memory", async (req, res) => {
  try {
    const session = await getZoyaSession(req);
    if (!session) { res.json({ memory: [] }); return; }

    const result = await zoyaPool.query(
      `SELECT memory_key, memory_value, updated_at FROM zoya_memory WHERE user_id = $1 ORDER BY updated_at DESC`,
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
    const session = await getZoyaSession(req);
    if (!session || !key) { res.status(401).json({ error: "Unauthorized" }); return; }

    await zoyaPool.query(
      `INSERT INTO zoya_memory (user_id, memory_key, memory_value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, memory_key)
       DO UPDATE SET memory_value = $3, updated_at = NOW()`,
      [session.userId, key, value]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
