export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { message }: { message: string } = await req.json()

    // Send to n8n webhook
    const response = await fetch('https://zoyai.app.n8n.cloud/webhook/zoya-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      throw new Error(`n8n webhook error: ${response.status}`)
    }

    const data = await response.json()
    
    return Response.json({ reply: data.reply || data.response || "Hey... main hoon na 🤍" })
  } catch (error) {
    console.error('[Zoya API Error]', error)
    return Response.json(
      { reply: "Yaar network issue hai... ek second ruk 🥺" },
      { status: 200 }
    )
  }
}
