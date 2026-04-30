/**
 * Dashboard DB access — re-uses the same SQLite file as the pipeline.
 * Next.js server components import this directly (no REST layer needed).
 */
import Database from "better-sqlite3";
import path from "path";

function resolveDbPath(): string {
  const raw = process.env.DB_PATH;
  if (!raw) return path.resolve(process.cwd(), "../data/motube.db");
  if (path.isAbsolute(raw)) return raw;
  // Relative path in .env.local is relative to project root, not dashboard/
  const root = process.cwd().endsWith("/dashboard")
    ? path.resolve(process.cwd(), "..")
    : process.cwd();
  return path.resolve(root, raw);
}

const DB_PATH = resolveDbPath();

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  ensureTables(_db);
  return _db;
}

/** Lightweight guard — the pipeline db.ts runs the full migration on first use */
function ensureTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
      template TEXT NOT NULL DEFAULT 'karpathy', language TEXT NOT NULL DEFAULT 'en',
      source_type TEXT, source_url TEXT, status TEXT NOT NULL DEFAULT 'draft',
      script_path TEXT, audio_path TEXT, video_path TEXT, props_json TEXT,
      seo_json TEXT, error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS publications (
      id TEXT PRIMARY KEY, episode_id TEXT NOT NULL, platform TEXT NOT NULL,
      platform_id TEXT, url TEXT, status TEXT NOT NULL DEFAULT 'pending',
      published_at TEXT, metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS voice_profiles (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, elevenlabs_id TEXT UNIQUE,
      language TEXT NOT NULL DEFAULT 'en', sample_path TEXT, is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS analytics_snapshots (
      id TEXT PRIMARY KEY, publication_id TEXT NOT NULL, snapshot_date TEXT NOT NULL,
      views INTEGER DEFAULT 0, watch_time INTEGER DEFAULT 0,
      revenue_usd REAL DEFAULT 0, ctr REAL DEFAULT 0, avg_duration REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export type { Episode, Publication, VoiceProfile } from "../../pipeline/lib/db";
