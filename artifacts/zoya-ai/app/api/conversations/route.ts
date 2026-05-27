import { NextRequest } from 'next/server'
import { pool, ensureSchema } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    await ensureSchema()
    const session = await getSession()
    if (!session) return Response.json({ conversations: [] })

    const result = await pool.query(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM conversations c
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC
       LIMIT 50`,
      [session.userId]
    )

    return Response.json({ conversations: result.rows })
  } catch (error) {
    console.error('[Conversations GET Error]', error)
    return Response.json({ conversations: [] })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const session = await getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    await pool.query(
      `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, session.userId]
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error('[Conversations DELETE Error]', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
