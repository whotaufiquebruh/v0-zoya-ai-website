import { NextRequest } from 'next/server'
import { pool, ensureSchema } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    await ensureSchema()
    const session = await getSession()
    if (!session) return Response.json({ memory: [] })

    const result = await pool.query(
      `SELECT memory_key, memory_value, updated_at
       FROM user_memory WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [session.userId]
    )

    return Response.json({ memory: result.rows })
  } catch {
    return Response.json({ memory: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json()
    const session = await getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    await pool.query(
      `INSERT INTO user_memory (user_id, memory_key, memory_value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, memory_key)
       DO UPDATE SET memory_value = $3, updated_at = NOW()`,
      [session.userId, key, value]
    )

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
