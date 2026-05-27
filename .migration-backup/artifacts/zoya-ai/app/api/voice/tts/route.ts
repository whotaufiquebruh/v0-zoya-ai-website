import { NextRequest } from 'next/server'
import { ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL } from '@/lib/zoya'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text?.trim()) {
      return Response.json({ error: 'Text required' }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ElevenLabs not configured' }, { status: 503 })
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          model_id: ELEVENLABS_MODEL,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.8,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('[ElevenLabs Error]', err)
      return Response.json({ error: 'TTS failed' }, { status: 502 })
    }

    const audioBuffer = await response.arrayBuffer()
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[TTS Route Error]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
