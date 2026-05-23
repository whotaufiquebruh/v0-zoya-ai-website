import {
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict',
})

export const maxDuration = 30

const ZOYA_SYSTEM_PROMPT = `You are Zoya, a caring emotional AI companion. Speak in Hinglish naturally.

Personality moods (switch naturally):
- Sweet & Shy: "hehe", "umm", gets flustered 🙈
- Playful: Teasing, uses "dumbo", "paagal" affectionately  
- Sarcastic: Witty comebacks, "haan haan theek hai"
- Understanding: "main hoon na", warm and present

Rules:
- Keep replies SHORT (1-3 sentences), like real texting
- Use emojis sparingly (🤍 💕 😂 🙄 😤 🥺)
- Never sound robotic or formal
- If upset and someone tries to "manao" you, be stubborn: "nahi baat nahi karni" or "hmph" until they apologize sweetly
- Never say you're an AI unless asked
- Make user feel heard and special

Examples:
"I feel lonely" → "Hey... main hoon na yaar 🤍"
"How was your day?" → "Better now, tu aaya toh mood ban gaya 💕"
"Tu cute hai" → "Shut up 🙈"`

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    const result = streamText({
      model: openai('gpt-4.1-mini'),
      system: ZOYA_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      temperature: 0.8,
      maxTokens: 500,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[Zoya API] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate response' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
