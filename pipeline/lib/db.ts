import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DB_PATH ??
  path.resolve(__dirname, "../../data/motube.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS episodes (
      id          TEXT PRIMARY KEY,
      slug        TEXT UNIQUE NOT NULL,
      title       TEXT NOT NULL,
      template    TEXT NOT NULL DEFAULT 'karpathy',
      language    TEXT NOT NULL DEFAULT 'en',
      source_type TEXT,
      source_url  TEXT,
      status      TEXT NOT NULL DEFAULT 'draft',
      script_path TEXT,
      audio_path  TEXT,
      video_path  TEXT,
      props_json  TEXT,
      seo_json    TEXT,
      error            TEXT,
      render_progress  INTEGER DEFAULT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS translations (
      id           TEXT PRIMARY KEY,
      episode_id   TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      language     TEXT NOT NULL,
      script_path  TEXT,
      audio_path   TEXT,
      video_path   TEXT,
      props_json   TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS publications (
      id            TEXT PRIMARY KEY,
      episode_id    TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      platform      TEXT NOT NULL,
      platform_id   TEXT,
      url           TEXT,
      status        TEXT NOT NULL DEFAULT 'pending',
      published_at  TEXT,
      metadata_json TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics_snapshots (
      id             TEXT PRIMARY KEY,
      publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
      snapshot_date  TEXT NOT NULL,
      views          INTEGER DEFAULT 0,
      watch_time     INTEGER DEFAULT 0,
      revenue_usd    REAL DEFAULT 0,
      ctr            REAL DEFAULT 0,
      avg_duration   REAL DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS voice_profiles (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      elevenlabs_id  TEXT UNIQUE,
      language       TEXT NOT NULL DEFAULT 'en',
      sample_path    TEXT,
      is_default     INTEGER DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Additive migrations — safe to run multiple times
  try { db.exec("ALTER TABLE episodes ADD COLUMN render_progress INTEGER DEFAULT NULL"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE episodes ADD COLUMN heygen_video_ids TEXT DEFAULT NULL"); } catch { /* already exists */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EpisodeStatus =
  | "draft"
  | "scripted"
  | "translated"
  | "tts_done"
  | "heygen_chunked"
  | "heygen_done"
  | "rendered"
  | "published"
  | "failed";

export type EpisodeTemplate = "karpathy" | "arabic-story" | "short-form" | "concept" | "stick-figure";

export interface Episode {
  id: string;
  slug: string;
  title: string;
  template: EpisodeTemplate;
  language: string;
  source_type: string | null;
  source_url: string | null;
  status: EpisodeStatus;
  script_path: string | null;
  audio_path: string | null;
  video_path: string | null;
  props_json: string | null;
  seo_json: string | null;
  error: string | null;
  heygen_video_ids: string | null;
  created_at: string;
  updated_at: string;
}

export interface Translation {
  id: string;
  episode_id: string;
  language: string;
  script_path: string | null;
  audio_path: string | null;
  video_path: string | null;
  props_json: string | null;
  status: string;
  created_at: string;
}

export interface Publication {
  id: string;
  episode_id: string;
  platform: string;
  platform_id: string | null;
  url: string | null;
  status: string;
  published_at: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  elevenlabs_id: string | null;
  language: string;
  sample_path: string | null;
  is_default: number;
  created_at: string;
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export const db = {
  episodes: {
    list(filters?: { status?: string; template?: string }): Episode[] {
      const d = getDb();
      let sql = "SELECT * FROM episodes WHERE 1=1";
      const params: string[] = [];
      if (filters?.status) { sql += " AND status = ?"; params.push(filters.status); }
      if (filters?.template) { sql += " AND template = ?"; params.push(filters.template); }
      sql += " ORDER BY created_at DESC";
      return d.prepare(sql).all(...params) as Episode[];
    },

    get(id: string): Episode | null {
      return (getDb().prepare("SELECT * FROM episodes WHERE id = ?").get(id) as Episode) ?? null;
    },

    getBySlug(slug: string): Episode | null {
      return (getDb().prepare("SELECT * FROM episodes WHERE slug = ?").get(slug) as Episode) ?? null;
    },

    create(row: Omit<Episode, "created_at" | "updated_at">): void {
      getDb().prepare(`
        INSERT INTO episodes (id, slug, title, template, language, source_type, source_url,
          status, script_path, audio_path, video_path, props_json, seo_json, error)
        VALUES (@id, @slug, @title, @template, @language, @source_type, @source_url,
          @status, @script_path, @audio_path, @video_path, @props_json, @seo_json, @error)
      `).run(row);
    },

    update(id: string, fields: Partial<Episode>): void {
      const entries = Object.entries({ ...fields, updated_at: new Date().toISOString() })
        .filter(([k]) => k !== "id");
      const set = entries.map(([k]) => `${k} = @${k}`).join(", ");
      getDb().prepare(`UPDATE episodes SET ${set} WHERE id = @id`).run({ id, ...Object.fromEntries(entries) });
    },

    delete(id: string): void {
      getDb().prepare("DELETE FROM episodes WHERE id = ?").run(id);
    },

    stats(): { total: number; published: number; draft: number; rendered: number } {
      const d = getDb();
      const total = (d.prepare("SELECT COUNT(*) as n FROM episodes").get() as { n: number }).n;
      const published = (d.prepare("SELECT COUNT(*) as n FROM episodes WHERE status = 'published'").get() as { n: number }).n;
      const draft = (d.prepare("SELECT COUNT(*) as n FROM episodes WHERE status = 'draft'").get() as { n: number }).n;
      const rendered = (d.prepare("SELECT COUNT(*) as n FROM episodes WHERE status = 'rendered'").get() as { n: number }).n;
      return { total, published, draft, rendered };
    },
  },

  voices: {
    list(): VoiceProfile[] {
      return getDb().prepare("SELECT * FROM voice_profiles ORDER BY is_default DESC, created_at DESC").all() as VoiceProfile[];
    },
    get(id: string): VoiceProfile | null {
      return (getDb().prepare("SELECT * FROM voice_profiles WHERE id = ?").get(id) as VoiceProfile) ?? null;
    },
    create(row: Omit<VoiceProfile, "created_at">): void {
      getDb().prepare(`
        INSERT INTO voice_profiles (id, name, elevenlabs_id, language, sample_path, is_default)
        VALUES (@id, @name, @elevenlabs_id, @language, @sample_path, @is_default)
      `).run(row);
    },
    setDefault(id: string, language: string): void {
      const d = getDb();
      d.prepare("UPDATE voice_profiles SET is_default = 0 WHERE language = ?").run(language);
      d.prepare("UPDATE voice_profiles SET is_default = 1 WHERE id = ?").run(id);
    },
  },

  publications: {
    list(episodeId?: string): Publication[] {
      if (episodeId) {
        return getDb().prepare("SELECT * FROM publications WHERE episode_id = ? ORDER BY created_at DESC").all(episodeId) as Publication[];
      }
      return getDb().prepare("SELECT * FROM publications ORDER BY created_at DESC LIMIT 50").all() as Publication[];
    },
    create(row: Omit<Publication, "created_at">): void {
      getDb().prepare(`
        INSERT INTO publications (id, episode_id, platform, platform_id, url, status, published_at, metadata_json)
        VALUES (@id, @episode_id, @platform, @platform_id, @url, @status, @published_at, @metadata_json)
      `).run(row);
    },
    update(id: string, fields: Partial<Publication>): void {
      const entries = Object.entries(fields).filter(([k]) => k !== "id");
      const set = entries.map(([k]) => `${k} = @${k}`).join(", ");
      getDb().prepare(`UPDATE publications SET ${set} WHERE id = @id`).run({ id, ...Object.fromEntries(entries) });
    },
  },
};
