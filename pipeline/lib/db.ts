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

    -- ─── Character-driven pipeline (Phase 0) ─────────────────────────────────

    CREATE TABLE IF NOT EXISTS characters (
      id              TEXT PRIMARY KEY,
      slug            TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      description     TEXT,
      style_prompt    TEXT NOT NULL,
      negative_prompt TEXT,
      base_seed       INTEGER NOT NULL,
      image_provider  TEXT NOT NULL DEFAULT 'fal-flux',
      video_provider  TEXT NOT NULL DEFAULT 'kling',
      lora_ref        TEXT,
      version         INTEGER NOT NULL DEFAULT 1,
      status          TEXT NOT NULL DEFAULT 'draft',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS character_sheets (
      id            TEXT PRIMARY KEY,
      character_id  TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      kind          TEXT NOT NULL,
      image_path    TEXT NOT NULL,
      prompt_used   TEXT NOT NULL,
      seed_used     INTEGER NOT NULL,
      version       INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_character_sheets_char ON character_sheets(character_id);

    CREATE TABLE IF NOT EXISTS story_templates (
      id              TEXT PRIMARY KEY,
      slug            TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      description     TEXT,
      structure_json  TEXT NOT NULL,
      language        TEXT NOT NULL DEFAULT 'en',
      format          TEXT NOT NULL DEFAULT '16:9',
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clips (
      id                  TEXT PRIMARY KEY,
      episode_id          TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      scene_index         INTEGER NOT NULL,
      character_ids_json  TEXT NOT NULL DEFAULT '[]',
      image_prompt        TEXT NOT NULL,
      motion_prompt       TEXT,
      duration_ms         INTEGER NOT NULL,
      audio_segment_path  TEXT,
      image_path          TEXT,
      video_path          TEXT,
      image_provider      TEXT,
      video_provider      TEXT,
      status              TEXT NOT NULL DEFAULT 'pending',
      error               TEXT,
      cost_usd            REAL NOT NULL DEFAULT 0,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_clips_episode ON clips(episode_id);
    CREATE INDEX IF NOT EXISTS idx_clips_status  ON clips(status);
  `);

  // Additive migrations — safe to run multiple times
  try { db.exec("ALTER TABLE episodes ADD COLUMN render_progress INTEGER DEFAULT NULL"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE episodes ADD COLUMN heygen_video_ids TEXT DEFAULT NULL"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE episodes ADD COLUMN story_template_id TEXT DEFAULT NULL"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE episodes ADD COLUMN character_cast_json TEXT DEFAULT NULL"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE episodes ADD COLUMN assembly_method TEXT DEFAULT NULL"); } catch { /* already exists */ }
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

  characters: {
    list(): Character[] {
      return getDb().prepare("SELECT * FROM characters ORDER BY created_at DESC").all() as Character[];
    },
    get(id: string): Character | null {
      return (getDb().prepare("SELECT * FROM characters WHERE id = ?").get(id) as Character) ?? null;
    },
    getBySlug(slug: string): Character | null {
      return (getDb().prepare("SELECT * FROM characters WHERE slug = ?").get(slug) as Character) ?? null;
    },
    create(row: Omit<Character, "created_at" | "updated_at">): void {
      getDb().prepare(`
        INSERT INTO characters (id, slug, name, description, style_prompt, negative_prompt,
          base_seed, image_provider, video_provider, lora_ref, version, status)
        VALUES (@id, @slug, @name, @description, @style_prompt, @negative_prompt,
          @base_seed, @image_provider, @video_provider, @lora_ref, @version, @status)
      `).run(row);
    },
    update(id: string, fields: Partial<Character>): void {
      const entries = Object.entries({ ...fields, updated_at: new Date().toISOString() })
        .filter(([k]) => k !== "id");
      const set = entries.map(([k]) => `${k} = @${k}`).join(", ");
      getDb().prepare(`UPDATE characters SET ${set} WHERE id = @id`).run({ id, ...Object.fromEntries(entries) });
    },
    delete(id: string): void {
      getDb().prepare("DELETE FROM characters WHERE id = ?").run(id);
    },
  },

  characterSheets: {
    listByCharacter(characterId: string): CharacterSheet[] {
      return getDb()
        .prepare("SELECT * FROM character_sheets WHERE character_id = ? ORDER BY created_at ASC")
        .all(characterId) as CharacterSheet[];
    },
    create(row: Omit<CharacterSheet, "created_at">): void {
      getDb().prepare(`
        INSERT INTO character_sheets (id, character_id, kind, image_path, prompt_used, seed_used, version)
        VALUES (@id, @character_id, @kind, @image_path, @prompt_used, @seed_used, @version)
      `).run(row);
    },
    deleteByCharacter(characterId: string): void {
      getDb().prepare("DELETE FROM character_sheets WHERE character_id = ?").run(characterId);
    },
  },

  storyTemplates: {
    list(): StoryTemplate[] {
      return getDb().prepare("SELECT * FROM story_templates ORDER BY created_at DESC").all() as StoryTemplate[];
    },
    get(id: string): StoryTemplate | null {
      return (getDb().prepare("SELECT * FROM story_templates WHERE id = ?").get(id) as StoryTemplate) ?? null;
    },
    create(row: Omit<StoryTemplate, "created_at">): void {
      getDb().prepare(`
        INSERT INTO story_templates (id, slug, name, description, structure_json, language, format)
        VALUES (@id, @slug, @name, @description, @structure_json, @language, @format)
      `).run(row);
    },
  },

  clips: {
    listByEpisode(episodeId: string): Clip[] {
      return getDb()
        .prepare("SELECT * FROM clips WHERE episode_id = ? ORDER BY scene_index ASC")
        .all(episodeId) as Clip[];
    },
    get(id: string): Clip | null {
      return (getDb().prepare("SELECT * FROM clips WHERE id = ?").get(id) as Clip) ?? null;
    },
    create(row: Omit<Clip, "created_at" | "updated_at">): void {
      getDb().prepare(`
        INSERT INTO clips (id, episode_id, scene_index, character_ids_json, image_prompt,
          motion_prompt, duration_ms, audio_segment_path, image_path, video_path,
          image_provider, video_provider, status, error, cost_usd)
        VALUES (@id, @episode_id, @scene_index, @character_ids_json, @image_prompt,
          @motion_prompt, @duration_ms, @audio_segment_path, @image_path, @video_path,
          @image_provider, @video_provider, @status, @error, @cost_usd)
      `).run(row);
    },
    update(id: string, fields: Partial<Clip>): void {
      const entries = Object.entries({ ...fields, updated_at: new Date().toISOString() })
        .filter(([k]) => k !== "id");
      const set = entries.map(([k]) => `${k} = @${k}`).join(", ");
      getDb().prepare(`UPDATE clips SET ${set} WHERE id = @id`).run({ id, ...Object.fromEntries(entries) });
    },
    addCost(id: string, deltaUsd: number): void {
      getDb()
        .prepare("UPDATE clips SET cost_usd = cost_usd + ?, updated_at = datetime('now') WHERE id = ?")
        .run(deltaUsd, id);
    },
  },
};

// ─── Phase 0 entity types ─────────────────────────────────────────────────────

export type CharacterStatus = "draft" | "sheet_pending" | "ready" | "failed";

export interface Character {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  style_prompt: string;
  negative_prompt: string | null;
  base_seed: number;
  image_provider: string;
  video_provider: string;
  lora_ref: string | null;
  version: number;
  status: CharacterStatus;
  created_at: string;
  updated_at: string;
}

export type CharacterSheetKind =
  | "front"
  | "side"
  | "three_quarter"
  | "expression_neutral"
  | "expression_happy"
  | "expression_sad"
  | "expression_angry"
  | "expression_surprised"
  | "pose_idle"
  | "pose_walk"
  | "pose_run";

export interface CharacterSheet {
  id: string;
  character_id: string;
  kind: CharacterSheetKind;
  image_path: string;
  prompt_used: string;
  seed_used: number;
  version: number;
  created_at: string;
}

export interface StoryTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  structure_json: string;
  language: string;
  format: string;
  created_at: string;
}

export type ClipStatus =
  | "pending"
  | "image_ready"
  | "video_ready"
  | "failed";

export interface Clip {
  id: string;
  episode_id: string;
  scene_index: number;
  character_ids_json: string;
  image_prompt: string;
  motion_prompt: string | null;
  duration_ms: number;
  audio_segment_path: string | null;
  image_path: string | null;
  video_path: string | null;
  image_provider: string | null;
  video_provider: string | null;
  status: ClipStatus;
  error: string | null;
  cost_usd: number;
  created_at: string;
  updated_at: string;
}
