import { createGuestSession, getSessionCookieOptions, COOKIE_NAME } from '@/lib/session'

export async function POST() {
  try {
    const sessionId = await createGuestSession()

    const opts = getSessionCookieOptions()
    const cookieValue = `${COOKIE_NAME}=${sessionId}; Path=${opts.path}; Max-Age=${opts.maxAge}; SameSite=${opts.sameSite}${opts.httpOnly ? '; HttpOnly' : ''}${opts.secure ? '; Secure' : ''}`

    return Response.json(
      { success: true },
      {
        headers: {
          'Set-Cookie': cookieValue,
        },
      }
    )
  } catch (error) {
    console.error('[Guest Session Error]', error)
    return Response.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
