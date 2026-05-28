import { Router } from "express";
import Groq from "groq-sdk";
import { pool, ensureSchema } from "../lib/zoya-db";
import { getSession } from "../lib/zoya-session";
import { buildSystemPrompt, getCurrentMood, GROQ_MODEL, GROQ_VOICE_MODEL, type ZoyaMood } from "../lib/zoya-ai";

const router = Router();

// ── /api/mood — returns current mood for UI ──────────────────────────────────
router.get("/mood", (_req, res) => {
  res.json({ mood: getCurrentMood() });
});

// ── /api/chat ─────────────────────────────────────────────────────────────────
router.post("/chat", async (req, res) => {
  try {
    await ensureSchema();
    const { message, conversationId, mode, mood } = req.body as {
      message?: string; conversationId?: string; mode?: string; mood?: ZoyaMood;
    };
    if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }

    const session = await getSession(req);
    const userId = session?.userId ?? null;
    let activeConversationId = conversationId ?? null;

    if (userId) {
      if (!activeConversationId) {
        const r = await pool.query(
          `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id`,
          [userId, message.slice(0, 60)]
        );
        activeConversationId = r.rows[0].id;
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
        role: r.role as "user" | "assistant", content: r.content,
      }));

      const memResult = await pool.query(
        `SELECT memory_key, memory_value FROM user_memory WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20`,
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
      res.json({ reply: "Yaar abhi configure nahi hua main… ek second 🥺", conversationId: activeConversationId });
      return;
    }

    const groq = new Groq({ apiKey: groqKey });
    const isVoice = mode === "voice";
    const activeMood = mood ?? getCurrentMood();

    const completion = await groq.chat.completions.create({
      model: isVoice ? GROQ_VOICE_MODEL : GROQ_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt(memoryContext, isVoice, activeMood) },
        ...history,
        { role: "user", content: message },
      ],
      temperature: 0.88,
      max_tokens: isVoice ? 120 : 280,
      top_p: 0.92,
    });

    const reply = completion.choices[0]?.message?.content ?? "Main hoon na 🤍";

    if (userId && activeConversationId) {
      await pool.query(
        `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
        [activeConversationId, reply]
      );
      await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [activeConversationId]);
      updateMemory(userId, message, reply, activeConversationId).catch(() => {});
    }

    res.json({ reply, conversationId: activeConversationId, mood: activeMood });
  } catch (err) {
    req.log.error({ err }, "Chat API error");
    res.json({ reply: "Yaar network issue hai… ek second ruk 🥺", conversationId: null });
  }
});

// ── Smart memory extraction ───────────────────────────────────────────────────
async function updateMemory(userId: string, userMsg: string, aiReply: string, _convId: string) {
  const lower = userMsg.toLowerCase();
  const entries: Array<[string, string]> = [];

  const nameMatch = userMsg.match(/(?:my name is|i(?:'m| am)|mera naam hai|main hoon)\s+([A-Za-z]{2,20})/i)
    || userMsg.match(/(?:call me|mujhe bulao)\s+([A-Za-z]{2,20})/i);
  if (nameMatch) entries.push(["name", nameMatch[1]]);

  const ageMatch = userMsg.match(/(?:i(?:'m| am)|main hoon|meri umar|i am)\s+(\d{1,2})\s*(?:years old|sal ka|years)/i)
    || userMsg.match(/(\d{1,2})\s*(?:year|sal)\s*(?:old|ka|ki)/i);
  if (ageMatch) entries.push(["age", ageMatch[1]]);

  const moods: Record<string, string> = {
    sad: "sad", unhappy: "sad", dukhi: "sad", udaas: "sad", upset: "upset",
    happy: "happy", khush: "happy", excited: "excited", bored: "bored", bore: "bored",
    lonely: "lonely", akela: "lonely", anxious: "anxious", stressed: "stressed",
    tired: "tired", thaka: "tired", angry: "angry", gussa: "angry",
  };
  for (const [word, mood] of Object.entries(moods)) {
    if (lower.includes(word)) { entries.push(["last_mood", mood]); break; }
  }

  if (lower.match(/(?:my )?(?:girlfriend|boyfriend|gf|bf|partner|wife|husband)/)) {
    const status = lower.includes("no ") || lower.includes("don't have") || lower.includes("nahi hai")
      ? "single" : "in relationship";
    entries.push(["relationship", status]);
  }
  if (lower.includes("single") || lower.includes("akela hoon")) entries.push(["relationship", "single"]);

  // Favourite song / music
  const songMatch = userMsg.match(/(?:favourite|favorite|fav|love|like|sunna pasand|pasand hai)\s+(?:song|music|track|band|artist)\s+(?:is\s+)?([^.!?]{2,40})/i)
    || userMsg.match(/(?:song|music)\s+(?:sun raha|bajao|play)\s+([^.!?]{2,30})/i);
  if (songMatch) entries.push(["fav_song", songMatch[1].trim().slice(0, 60)]);

  const hobbyMatch = userMsg.match(/(?:i love|i like|mujhe pasand hai|mera hobby|i enjoy)\s+([^.!?]{3,40})/i);
  if (hobbyMatch) entries.push(["interest", hobbyMatch[1].trim().slice(0, 60)]);

  const cityMatch = userMsg.match(/(?:i(?:'m| am) from|i live in|main rehta hoon|main rehti hoon)\s+([A-Za-z\s]{2,30})/i);
  if (cityMatch) entries.push(["location", cityMatch[1].trim().slice(0, 40)]);

  const workMatch = userMsg.match(/(?:i(?:'m| am) a|i work as|i study|main padh raha|main karta hoon)\s+([^.!?]{3,40})/i);
  if (workMatch) entries.push(["occupation", workMatch[1].trim().slice(0, 60)]);

  // Birthday
  const bdayMatch = userMsg.match(/(?:birthday|janamdin|bday)\s+(?:is\s+)?(?:on\s+)?([A-Za-z0-9\s,]+)/i);
  if (bdayMatch) entries.push(["birthday", bdayMatch[1].trim().slice(0, 30)]);

  // Rain / weather preference (easter egg trigger)
  if (lower.includes("rain") || lower.includes("barish") || lower.includes("baarish"))
    entries.push(["loves_rain", "true"]);

  entries.push(["last_topic", userMsg.slice(0, 80)]);
  entries.push(["last_zoya_reply", aiReply.slice(0, 100)]);

  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO user_memory (user_id, memory_key, memory_value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, memory_key) DO UPDATE SET memory_value = $3, updated_at = NOW()`,
      [userId, key, value]
    );
  }
}

export default router;
