# AGENTS.md — motube

## Communication Style (Caveman Mode)

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop articles (a/an/the), filler (just/really/basically/actually), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
- Pattern: `[thing] [action] [reason]. [next step].`
- Not: "Sure! I'd be happy to help you..."
- Yes: "Bug in auth middleware. Fix:"

Default level: **full**. User can request `/caveman lite|full|ultra`.
Stop: "stop caveman" or "normal mode".

Auto-Clarity: drop caveman for security warnings, irreversible ops, user confusion. Resume after.

---

## Persistent Memory

When user asks about previous work ("did we fix this?", "what did we do last session?"):
Use available MCP memory tools (`search` → `timeline` → `get_observations`).
Filter before fetching — never bulk-fetch full records.

---

## Project: motube (Instructify)

Automated YouTube faceless video platform. Key facts:

**Stack**: Remotion 4.x · Next.js 16.2 · SQLite (better-sqlite3) · BullMQ · Redis · Claude API · ElevenLabs TTS · Gemini Flash

**Layout**:
- `src/` — Remotion video templates (ESM, "type": "module")
- `pipeline/` — Node.js scripts (tsx runtime, never compiled)
- `dashboard/` — Next.js 16.2 app
- `data/motube.db` — SQLite source of truth
- `assets/audio/{episodeId}/` — MP3 per scene
- `output/` — rendered mp4s

**Hard constraints**:
- No `asChild` on `<Button>` — @base-ui/react, not Radix
- No pipeline imports in Next.js routes — use `spawn("npx", ["tsx", "pipeline/xxx.ts"])`
- `serverExternalPackages: ["better-sqlite3"]` in next.config.ts
- No `bullmq`/`ioredis` in Next.js routes (Turbopack crash)
- Never install new deps without asking
- Never modify DB schema without migration plan
- Env vars in `.env.local` only

**Episode status flow**: `draft → scripted → translated → tts_done → rendered → published | failed`

**DB helpers** (`pipeline/lib/db.ts`): `db.episodes.create()` requires full shape including `id`, `slug`, `language`, `status`, `heygen_video_ids` — run via `npx tsx`, never `node` (source is .ts, never compiled).

**Phases done**: Phase 0 (schema+providers), Phase 1 (character service), CI fixed (noble deps + tsx seed script). Phase 2 next: clip prompts → Kling image-to-video → scene assembly.
