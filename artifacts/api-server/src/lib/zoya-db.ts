import { Pool } from "pg";
import { logger } from "./logger";

export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  ssl: process.env["DATABASE_URL"]?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        avatar_url TEXT,
        is_guest BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) DEFAULT 'New Chat',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        memory_key VARCHAR(255) NOT NULL,
        memory_value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, memory_key)
      );
    `);
    schemaReady = true;
  } catch (err) {
    logger.error({ err }, "Schema ensure failed");
    throw err;
  } finally {
    client.release();
  }
}
