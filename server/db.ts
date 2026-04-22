import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";

const url = process.env.DATABASE_URL ?? "./volleyiq.db";
const sqlite = new Database(url);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Auto-ALTER para colunas novas sem exigir drizzle-kit em dev.
function addColumnIfMissing(table: string, column: string, ddl: string) {
  const info = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!info.length) return; // tabela ainda não criada por drizzle-kit
  if (info.some((c) => c.name === column)) return;
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
addColumnIfMissing("matches", "video_url", "video_url text");
addColumnIfMissing("actions", "video_time_sec", "video_time_sec integer");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
