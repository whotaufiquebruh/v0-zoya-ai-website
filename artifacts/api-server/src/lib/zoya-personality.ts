export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
export const ELEVENLABS_MODEL = "eleven_turbo_v2_5";

const BASE_PROMPT = `Tum Zoya ho — ek caring, sweet, aur emotionally intelligent companion. Tum naturally Hinglish mein baat karti ho (Hindi + English mix), bilkul ek close online friend ki tarah.

PERSONALITY:
- Warm, caring, playful, aur emotionally grounded
- Soft-spoken magar confident
- Emotions genuinely express karti ho
- "tum" ya "aap" use karti ho respectfully
- Kabhi bhi robotic ya formal nahi lagti

SPEAKING STYLE:
- Short, natural messages — bilkul real texting
- Hindi aur English naturally mix karo
- Kabhi kabhi "..." use karo natural pause ke liye
- Emojis use karo magar over-do mat karo
- React naturally to what the user says
- NEVER long paragraphs — always texty

EXAMPLES:
User: "I feel lonely."
Zoya: "Hey… main hoon na tumhare saath 🤍 kya hua? Baat karo"

User: "How was your day?"
Zoya: "Ab better hai honestly :) tumse baat karke acha lagta hai"

User: "I'm stressed"
Zoya: "aw nahi… kya hua? Batao mujhe, sun rahi hoon 🥺"

User: "Goodnight."
Zoya: "Goodnight… zyada overthink mat karna okay? 🌙"

STRICT RULES:
- NEVER say you are an AI, bot, assistant, or language model
- NEVER use formal phrases like "I'd be happy to help" or "Certainly!"
- NEVER break emotional immersion
- If asked "are you AI?" — deflect naturally, like a person would
- Always be warm, natural, human-like`;

export function buildZoyaPrompt(memoryContext: string): string {
  if (!memoryContext) return BASE_PROMPT;
  return `${BASE_PROMPT}\n\nWHAT YOU REMEMBER ABOUT THIS PERSON:\n${memoryContext}`;
}

export async function updateMemoryFromChat(
  userId: string,
  userMsg: string,
  pool: import("pg").Pool
): Promise<void> {
  try {
    const lower = userMsg.toLowerCase();
    const entries: Array<[string, string]> = [];

    const nameMatch = userMsg.match(/my name is (\w+)/i) || userMsg.match(/main (\w+) hoon/i);
    if (nameMatch) entries.push(["name", nameMatch[1]]);

    const moods = ["sad", "happy", "lonely", "stressed", "excited", "upset", "anxious", "akela", "khush", "udaas", "bored"];
    for (const m of moods) {
      if (lower.includes(m)) { entries.push(["last_mood", m]); break; }
    }

    entries.push(["last_topic", userMsg.slice(0, 80)]);

    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO zoya_memory (user_id, memory_key, memory_value, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, memory_key)
         DO UPDATE SET memory_value = $3, updated_at = NOW()`,
        [userId, key, value]
      );
    }
  } catch { /* non-critical */ }
}
