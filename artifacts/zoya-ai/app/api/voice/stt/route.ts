import { NextRequest } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'Deepgram not configured' }, { status: 503 })
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    if (!audioFile) {
      return Response.json({ error: 'No audio' }, { status: 400 })
    }

    const audioBuffer = await audioFile.arrayBuffer()

    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&language=en-IN&smart_format=true&punctuate=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': audioFile.type || 'audio/webm',
        },
        body: audioBuffer,
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('[Deepgram Error]', err)
      return Response.json({ error: 'STT failed', transcript: '' }, { status: 200 })
    }

    const data = await response.json()
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''

    return Response.json({ transcript })
  } catch (error) {
    console.error('[STT Route Error]', error)
    return Response.json({ error: 'Internal error', transcript: '' }, { status: 200 })
  }
}
