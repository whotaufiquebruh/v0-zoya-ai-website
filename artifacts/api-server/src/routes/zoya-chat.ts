import { Router } from "express";
import Groq from "groq-sdk";
import { pool, ensureSchema } from "../lib/zoya-db";
import { getSession } from "../lib/zoya-session";
import { buildSystemPrompt, GROQ_MODEL, GROQ_VOICE_MODEL } from "../lib/zoya-ai";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    await ensureSchema();
    const { message, conversationId, mode } = req.body as { message?: string; conversationId?: string; mode?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: "Message required" });
      return;
    }

    const session = await getSession(req);
    const userId = session?.userId ?? null;

    let activeConversationId = conversationId ?? null;

    if (userId) {
      if (!activeConversationId) {
        const convoResult = await pool.query(
          `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id`,
          [userId, message.slice(0, 60)]
        );
        activeConversationId = convoResult.rows[0].id;
      }
      await pool.query(
        `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
        [activeConversationId, message]
      );
    }

    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    let memoryContext = "";

    if (userId && activeConversationId) {
      const msgResult = await pool.query(
        `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [activeConversationId]
      );
      history = msgResult.rows.reverse().slice(0, -1).map((r: { role: string; content: string }) => ({
        role: r.role as "user" | "assistant",
        content: r.content,
      }));

      const memResult = await pool.query(
        `SELECT memory_key, memory_value FROM user_memory WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 15`,
        [userId]
      );
      if (memResult.rows.length > 0) {
        memoryContext = memResult.rows
          .map((r: { memory_key: string; memory_value: string }) => `- ${r.memory_key}: ${r.memory_value}`)
          .join("\n");
      }
    }

    const groqKey = process.env["GROQ_API_KEY"];
    if (!groqKey) {
      res.json({ reply: "AI service not configured. Please add GROQ_API_KEY.", conversationId: activeConversationId });
      return;
    }

    const groq = new Groq({ apiKey: groqKey });
    const isVoice = mode === "voice";

    const completion = await groq.chat.completions.create({
      model: isVoice ? GROQ_VOICE_MODEL : GROQ_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt(memoryContext, isVoice) },
        ...history,
        { role: "user", content: message },
      ],
      temperature: 0.80,
      max_tokens: isVoice ? 120 : 300, // voice needs short answers for fast TTS
      top_p: 0.9,
    });

    const reply = completion.choices[0]?.message?.content ?? "Hey… main hoon na 🤍";

    if (userId && activeConversationId) {
      await pool.query(
        `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
        [activeConversationId, reply]
      );
      await pool.query(
        `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
        [activeConversationId]
      );
      await updateMemory(userId, message, activeConversationId);
    }

    res.json({ reply, conversationId: activeConversationId });
  } catch (err) {
    req.log.error({ err }, "Chat API error");
    res.json({ reply: "Yaar network issue hai… ek second ruk 🥺", conversationId: null });
  }
});

async function updateMemory(userId: string, userMsg: string, _convId: string) {
  try {
    const lower = userMsg.toLowerCase();
    const entries: Array<[string, string]> = [];

    if (lower.includes("my name is") || (lower.includes("main") && lower.includes("hoon"))) {
      const nameMatch = userMsg.match(/my name is (\w+)/i) || userMsg.match(/main (\w+) hoon/i);
      if (nameMatch) entries.push(["name", nameMatch[1]]);
    }

    const moodWords = ["sad", "happy", "lonely", "stressed", "excited", "upset", "anxious", "akela", "khush", "udaas"];
    for (const word of moodWords) {
      if (lower.includes(word)) { entries.push(["last_mood", word]); break; }
    }

    if (lower.includes("love") || lower.includes("favorite") || lower.includes("pasand")) {
      entries.push(["interests_note", userMsg.slice(0, 100)]);
    }

    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO user_memory (user_id, memory_key, memory_value, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, memory_key) DO UPDATE SET memory_value = $3, updated_at = NOW()`,
        [userId, key, value]
      );
    }

    await pool.query(
      `INSERT INTO user_memory (user_id, memory_key, memory_value, updated_at)
       VALUES ($1, 'last_topic', $2, NOW())
       ON CONFLICT (user_id, memory_key) DO UPDATE SET memory_value = $2, updated_at = NOW()`,
      [userId, userMsg.slice(0, 80)]
    );
  } catch { /* non-critical */ }
}

export default router;
