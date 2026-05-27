import { Router } from "express";
import Groq from "groq-sdk";
import { getZoyaSession } from "../lib/zoya-session";
import { zoyaPool, ensureZoyaSchema } from "../lib/zoya-db";
import {
  GROQ_MODEL,
  buildZoyaPrompt,
  updateMemoryFromChat,
} from "../lib/zoya-personality";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    await ensureZoyaSchema();
    const { message, conversationId } = req.body as {
      message?: string;
      conversationId?: string;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "Message required" });
      return;
    }

    const session = await getZoyaSession(req);
    const userId = session?.userId ?? null;
    let activeConvId: string | null = conversationId ?? null;

    if (userId) {
      if (!activeConvId) {
        const r = await zoyaPool.query(
          `INSERT INTO zoya_conversations (user_id, title) VALUES ($1, $2) RETURNING id`,
          [userId, message.slice(0, 60)]
        );
        activeConvId = r.rows[0].id as string;
      }
      await zoyaPool.query(
        `INSERT INTO zoya_messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
        [activeConvId, message]
      );
    }

    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    let memoryCtx = "";

    if (userId && activeConvId) {
      const msgRes = await zoyaPool.query(
        `SELECT role, content FROM zoya_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [activeConvId]
      );
      history = msgRes.rows
        .reverse()
        .slice(0, -1)
        .map((r: { role: string; content: string }) => ({
          role: r.role as "user" | "assistant",
          content: r.content as string,
        }));

      const memRes = await zoyaPool.query(
        `SELECT memory_key, memory_value FROM zoya_memory WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 15`,
        [userId]
      );
      if (memRes.rows.length > 0) {
        memoryCtx = memRes.rows
          .map((r: { memory_key: string; memory_value: string }) => `- ${r.memory_key}: ${r.memory_value}`)
          .join("\n");
      }
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: buildZoyaPrompt(memoryCtx) },
        ...history,
        { role: "user", content: message },
      ],
      temperature: 0.85,
      max_tokens: 300,
      top_p: 0.9,
    });

    const reply =
      completion.choices[0]?.message?.content ?? "Hey… main hoon na 🤍";

    if (userId && activeConvId) {
      await zoyaPool.query(
        `INSERT INTO zoya_messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
        [activeConvId, reply]
      );
      await zoyaPool.query(
        `UPDATE zoya_conversations SET updated_at = NOW() WHERE id = $1`,
        [activeConvId]
      );
      await updateMemoryFromChat(userId, message, zoyaPool);
    }

    res.json({ reply, conversationId: activeConvId });
  } catch (err) {
    req.log.error(err, "Chat route error");
    res.json({
      reply: "Yaar network issue hai… ek second ruk 🥺",
      conversationId: null,
    });
  }
});

export default router;
