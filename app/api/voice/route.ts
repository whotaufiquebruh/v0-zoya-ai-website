export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Create new FormData for n8n
    const n8nFormData = new FormData()
    n8nFormData.append('audio', audioFile, 'voice.webm')

    // Send to n8n voice webhook
    const response = await fetch('https://zoyai.app.n8n.cloud/webhook/zoya-voice', {
      method: 'POST',
      body: n8nFormData,
    })

    if (!response.ok) {
      throw new Error(`n8n voice webhook error: ${response.status}`)
    }

    const data = await response.json()
    
    return Response.json({
      reply: data.reply || data.response || "Main sun rahi hoon...",
      audio: data.audio || null,
    })
  } catch (error) {
    console.error('[Zoya Voice API Error]', error)
    return Response.json(
      { 
        reply: "Voice connection mein issue hai... text try karo na 🥺",
        audio: null 
      },
      { status: 200 }
    )
  }
}
