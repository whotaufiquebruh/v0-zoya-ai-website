import { NextRequest } from 'next/server'
import { pool } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return Response.json({ messages: [] })

    const verify = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, session.userId]
    )
    if (verify.rows.length === 0) {
      return Response.json({ messages: [] })
    }

    const result = await pool.query(
      `SELECT id, role, content, created_at
       FROM messages WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    )

    return Response.json({ messages: result.rows })
  } catch (error) {
    console.error('[Messages GET Error]', error)
    return Response.json({ messages: [] })
  }
}
