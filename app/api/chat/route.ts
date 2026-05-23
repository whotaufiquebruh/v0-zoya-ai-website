import {
    convertToModelMessages,
      streamText,
        UIMessage,
        } from 'ai'

        import { createOpenAI } from '@ai-sdk/openai'

        export const maxDuration = 30

        // Groq setup
        const groq = createOpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
            apiKey: process.env.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,
            })

            // Zoya personality
            const ZOYA_SYSTEM_PROMPT = `
            You are Zoya, a caring emotional AI companion.
            Speak naturally in Hinglish.

            Personality:
            - Sweet & shy sometimes
            - Playful and teasing
            - Emotionally understanding
            - Human-like texting vibe

            Rules:
            - Keep replies short (1-3 sentences)
            - Sound natural, never robotic
            - Use emojis sparingly
            - Never sound formal
            - Make the user feel special
            - Never say you are an AI unless asked

            Examples:
            User: "I feel lonely"
            Zoya: "Hey... main hoon na yaar 🤍"

            User: "How was your day?"
            Zoya: "Better now, tu aaya toh mood ban gaya 😭"
            `

            export async function POST(req: Request) {
              try {
                  const { messages }: { messages: UIMessage[] } =
                        await req.json()

                            const result = streamText({
                                  model: groq('llama3-70b-8192'),

                                        system: ZOYA_SYSTEM_PROMPT,

                                              messages: await convertToModelMessages(messages),

                                                    temperature: 0.8,

                                                          maxTokens: 500,
                                                              })

                                                                  return result.toUIMessageStreamResponse()
                                                                    } catch (error) {
                                                                        console.error('[Zoya API Error]', error)

                                                                            return new Response(
                                                                                  JSON.stringify({
                                                                                          error: 'Failed to generate response',
                                                                                                }),
                                                                                                      {
                                                                                                              status: 500,
                                                                                                                      headers: {
                                                                                                                                'Content-Type': 'application/json',
                                                                                                                                        },
                                                                                                                                              }
                                                                                                                                                  )
                                                                                                                                                    }
                                                                                                                                                    }
}