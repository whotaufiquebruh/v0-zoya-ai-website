import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return Response.json({ authenticated: false, session: null })
    }
    return Response.json({
      authenticated: true,
      session: {
        userId: session.userId,
        isGuest: session.isGuest,
        name: session.name,
        email: session.email,
        avatarUrl: session.avatarUrl,
      },
    })
  } catch {
    return Response.json({ authenticated: false, session: null })
  }
}
