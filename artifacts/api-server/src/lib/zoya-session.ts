import { pool, ensureSchema } from "./zoya-db";
import { randomUUID } from "crypto";
import type { Request } from "express";

export interface Session {
  userId: string;
  isGuest: boolean;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export const COOKIE_NAME = "zoya_session";
const SESSION_DURATION_DAYS = 30;

export async function getSession(req: Request): Promise<Session | null> {
  try {
    await ensureSchema();
    const raw = req.headers.cookie ?? "";
    const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
    const sessionId = match?.[1];
    if (!sessionId) return null;

    const result = await pool.query(
      `SELECT us.user_id, u.is_guest, u.name, u.email, u.avatar_url
       FROM user_sessions us
       JOIN users u ON u.id = us.user_id
       WHERE us.id = $1 AND us.expires_at > NOW()`,
      [sessionId]
    );

    if (result.rows.length === 0) return null;

    await pool.query(`UPDATE users SET last_seen_at = NOW() WHERE id = $1`, [result.rows[0].user_id]);

    return {
      userId: result.rows[0].user_id,
      isGuest: result.rows[0].is_guest,
      name: result.rows[0].name,
      email: result.rows[0].email,
      avatarUrl: result.rows[0].avatar_url,
    };
  } catch {
    return null;
  }
}

export async function createGuestSession(): Promise<string> {
  await ensureSchema();
  const userId = `guest_${randomUUID()}`;
  const sessionId = randomUUID();

  await pool.query(`INSERT INTO users (id, name, is_guest) VALUES ($1, 'Guest', true)`, [userId]);
  await pool.query(
    `INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '${SESSION_DURATION_DAYS} days')`,
    [sessionId, userId]
  );
  return sessionId;
}

export async function createNamedSession(name: string, email: string | null): Promise<string> {
  await ensureSchema();
  const userId = `user_${randomUUID()}`;
  const sessionId = randomUUID();

  await pool.query(
    `INSERT INTO users (id, name, email, is_guest) VALUES ($1, $2, $3, false)`,
    [userId, name, email]
  );
  await pool.query(
    `INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '${SESSION_DURATION_DAYS} days')`,
    [sessionId, userId]
  );
  return sessionId;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS,
    path: "/",
  };
}
