import type { Request, Response } from "express";
import { zoyaPool, ensureZoyaSchema } from "./zoya-db";
import { v4 as uuidv4 } from "uuid";

export interface ZoyaSession {
  userId: string;
  isGuest: boolean;
  name: string | null;
  email: string | null;
}

const SESSION_COOKIE = "zoya_session";
const SESSION_DAYS = 30;

export async function getZoyaSession(req: Request): Promise<ZoyaSession | null> {
  try {
    await ensureZoyaSchema();
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (!sessionId) return null;

    const result = await zoyaPool.query(
      `SELECT s.user_id, u.is_guest, u.name, u.email
       FROM zoya_sessions s
       JOIN zoya_users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [sessionId]
    );
    if (!result.rows.length) return null;

    await zoyaPool.query(
      `UPDATE zoya_users SET last_seen_at = NOW() WHERE id = $1`,
      [result.rows[0].user_id]
    );

    return {
      userId: result.rows[0].user_id,
      isGuest: result.rows[0].is_guest,
      name: result.rows[0].name,
      email: result.rows[0].email,
    };
  } catch {
    return null;
  }
}

export async function createGuestSession(res: Response): Promise<ZoyaSession> {
  await ensureZoyaSchema();
  const userId = `guest_${uuidv4()}`;
  const sessionId = uuidv4();

  await zoyaPool.query(
    `INSERT INTO zoya_users (id, name, is_guest) VALUES ($1, 'Guest', true)`,
    [userId]
  );
  await zoyaPool.query(
    `INSERT INTO zoya_sessions (id, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '${SESSION_DAYS} days')`,
    [sessionId, userId]
  );

  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * SESSION_DAYS * 1000,
    path: "/",
  });

  return { userId, isGuest: true, name: "Guest", email: null };
}
