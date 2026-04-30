/**
 * render.ts — Rendu headless Remotion d'un épisode.
 * Usage: npx tsx pipeline/render.ts --episode-id <id> [--quality preview|full]
 *
 * v1 features:
 * - Bundle caching (hash-based, ~/.motube-bundle-cache/)
 * - Zod props validation before render
 * - Structured error logging with stage labels
 */

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import dotenv from "dotenv";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { db, getDb } from "./lib/db.js";
import { assertValidEpisodeProps } from "./lib/schema.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const REMOTION_ENTRY = path.join(ROOT, "src", "Root", "index.tsx");
const OUTPUT_DIR = path.join(ROOT, "output");
const BUNDLE_CACHE_DIR = path.join(ROOT, ".bundle-cache");

// ─── Audio duration helpers ───────────────────────────────────────────────────

const FPS = 30;
const AUDIO_END_PADDING_FRAMES = 15; // 0.5s buffer

function getAudioDurationSeconds(filePath: string): number | null {
  try {
    const raw = execSync(
      `ffprobe -v quiet -print_format json -show_streams -select_streams a:0 "${filePath}"`,
      { encoding: "utf-8", timeout: 5000 }
    );
    const parsed = JSON.parse(raw) as { streams?: Array<{ duration?: string }> };
    const dur = parsed.streams?.[0]?.duration;
    return dur ? parseFloat(dur) : null;
  } catch {
    return null;
  }
}

/**
 * Back-fill durationInFrames for scenes that have audioPath but no durationInFrames.
 * Called before render to ensure correct timing even for episodes TTS'd before this fix.
 */
function backfillAudioDurations(props: { scenes: Array<{ durationInFrames?: number; data: Record<string, unknown> }> }, audioDir: string): boolean {
  let changed = false;
  for (let i = 0; i < props.scenes.length; i++) {
    const scene = props.scenes[i];
    const audioPath = scene.data.audioPath as string | undefined;
    if (!audioPath) continue;

    // Always measure from actual audio file — hardcoded script-gen values are unreliable
    const absPath = path.join(ROOT, audioPath);
    if (!fs.existsSync(absPath)) continue;

    const durationSec = getAudioDurationSeconds(absPath);
    if (durationSec !== null) {
      const frames = Math.ceil(durationSec * FPS) + AUDIO_END_PADDING_FRAMES;
      if (scene.durationInFrames !== frames) {
        scene.durationInFrames = frames;
        changed = true;
      }
    }
  }
  return changed;
}

// ─── Composition ID resolver ─────────────────────────────────────────────────
function getCompositionId(template: string): string {
  switch (template) {
    case "arabic-story":  return "ArabicStoryEpisode";
    case "short-form":    return "ShortFormEpisode";
    case "concept":       return "ConceptEpisode";
    case "stick-figure":  return "StickFigureEpisode";
    default:              return "KarpathyEpisode";
  }
}

// ─── Bundle caching ──────────────────────────────────────────────────────────

function getBundleCacheKey(entryPoint: string): string {
  // Hash: entry file path + mtime of src/ directory tree
  const srcDir = path.join(ROOT, "src");
  const mtimes: string[] = [];

  function walkDir(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full);
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        const stat = fs.statSync(full);
        mtimes.push(`${full}:${stat.mtimeMs}`);
      }
    }
  }
  walkDir(srcDir);

  const hash = crypto
    .createHash("sha1")
    .update(entryPoint + "\n" + mtimes.sort().join("\n"))
    .digest("hex")
    .slice(0, 12);

  return hash;
}

async function getCachedBundle(entryPoint: string): Promise<string> {
  fs.mkdirSync(BUNDLE_CACHE_DIR, { recursive: true });

  const cacheKey = getBundleCacheKey(entryPoint);
  const cacheFile = path.join(BUNDLE_CACHE_DIR, `${cacheKey}.txt`);

  if (fs.existsSync(cacheFile)) {
    const cachedPath = fs.readFileSync(cacheFile, "utf-8").trim();
    // Verify the cached bundle still exists
    if (fs.existsSync(cachedPath)) {
      console.log(`[BUNDLE] Cache hit (key: ${cacheKey}) → ${cachedPath}`);
      return cachedPath;
    }
    console.log(`[BUNDLE] Cache stale — rebundling...`);
  } else {
    console.log(`[BUNDLE] Cache miss (key: ${cacheKey}) — bundling...`);
  }

  const bundledPath = await bundle({
    entryPoint,
    publicDir: ROOT, // serves project root as static files → assets/audio/... accessible
    webpackOverride: (config) => config,
  });

  fs.writeFileSync(cacheFile, bundledPath);
  console.log(`[BUNDLE] Bundled and cached → ${bundledPath}`);
  return bundledPath;
}

// ─── Render options ───────────────────────────────────────────────────────────

export interface RenderOptions {
  episodeId: string;
  quality?: "preview" | "full";
  translationId?: string;
  onProgress?: (progress: number) => void;
}

export interface RenderResult {
  outputPath: string;
  durationMs: number;
}

// ─── Main render function ─────────────────────────────────────────────────────

export async function renderEpisode(opts: RenderOptions): Promise<RenderResult> {
  const { episodeId, quality = "full", translationId, onProgress } = opts;
  const start = Date.now();
  const tag = `[RENDER][${episodeId}]`;

  // ── 1. Load episode ──────────────────────────────────────────────────────
  console.log(`${tag} Loading episode...`);
  const episode = db.episodes.get(episodeId);
  if (!episode) throw new Error(`${tag} Episode not found`);

  // ── 2. Resolve props JSON ────────────────────────────────────────────────
  const propsJson = translationId
    ? (getDb().prepare("SELECT props_json FROM translations WHERE id = ?").get(translationId) as { props_json: string | null } | null)?.props_json
    : episode.props_json;

  if (!propsJson) {
    throw new Error(`${tag} No props_json — run script-gen first`);
  }

  // ── 2b. Back-fill durationInFrames from audio files if missing ───────────
  let resolvedPropsJson = propsJson;
  const audioDir = path.join(ROOT, "assets", "audio", episodeId);
  try {
    const parsedForBackfill = JSON.parse(propsJson) as { scenes: Array<{ durationInFrames?: number; data: Record<string, unknown> }> };
    if (backfillAudioDurations(parsedForBackfill, audioDir)) {
      resolvedPropsJson = JSON.stringify(parsedForBackfill);
      console.log(`${tag} Back-filled audio durations into props_json`);
      // Persist to DB so future renders skip this step
      if (!translationId) {
        getDb().prepare("UPDATE episodes SET props_json = ? WHERE id = ?").run(resolvedPropsJson, episodeId);
      } else {
        getDb().prepare("UPDATE translations SET props_json = ? WHERE id = ?").run(resolvedPropsJson, translationId);
      }
    }
  } catch { /* non-fatal — proceed with original props */ }

  // ── 3. Validate props ────────────────────────────────────────────────────
  console.log(`${tag} Validating script props...`);
  const compositionId = getCompositionId(episode.template);
  let inputProps: Record<string, unknown>;
  try {
    if (compositionId === "ConceptEpisode") {
      // Build ConceptEpisodeProps from chunks + transcripts JSON files
      const chunksPath = path.join(ROOT, "data", "chunks", `${episodeId}.json`);
      const transcriptPath = path.join(ROOT, "data", "transcripts", `${episodeId}.json`);

      if (!fs.existsSync(chunksPath)) {
        throw new Error(`No chunks file — run chunk-script first`);
      }

      type ChunkRecord = { index: number; videoPath: string | null; audioPath: string | null; estimatedDuration: number };
      const chunks = JSON.parse(fs.readFileSync(chunksPath, "utf-8")) as ChunkRecord[];

      // TODO: parse transcript for word-highlight overlays (Phase 5)
      const motionEvents: Record<string, unknown>[] = [];

      inputProps = {
        chunks: chunks
          .filter(c => c.videoPath)
          .map(c => ({
            videoSrc: c.videoPath!,
            audioSrc: c.audioPath ?? "",
            duration: c.estimatedDuration,
          })),
        motionEvents,
        lang: episode.language as "fr" | "en" | "ar" | "es",
        title: episode.title,
      };
    } else {
      inputProps = JSON.parse(resolvedPropsJson) as Record<string, unknown>;
      // Only validate KarpathyEpisode — Arabic/ShortForm have their own schemas
      if (compositionId === "KarpathyEpisode") {
        assertValidEpisodeProps(inputProps, episodeId);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.episodes.update(episodeId, { status: "failed", error: msg });
    throw new Error(`${tag} Props validation failed: ${msg}`);
  }

  // Output path
  const suffix = translationId ? `${episodeId}-${translationId}` : episodeId;
  const outputPath = path.join(OUTPUT_DIR, `${suffix}.mp4`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── 4. Bundle (with cache) ───────────────────────────────────────────────
  let bundled: string;
  try {
    bundled = await getCachedBundle(REMOTION_ENTRY);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.episodes.update(episodeId, { status: "failed", error: `Bundle failed: ${msg}` });
    throw new Error(`${tag} Bundle failed: ${msg}`);
  }

  // ── 5. Select composition ────────────────────────────────────────────────
  console.log(`${tag} Selecting composition: ${compositionId}...`);
  let composition;
  try {
    composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
      inputProps,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.episodes.update(episodeId, { status: "failed", error: `Composition select failed: ${msg}` });
    throw new Error(`${tag} selectComposition failed: ${msg}`);
  }

  // Quality settings
  const crf = quality === "preview" ? 32 : 18;
  const scale = quality === "preview" ? 0.5 : 1;

  // ── 6. Render ────────────────────────────────────────────────────────────
  console.log(`${tag} Rendering (quality: ${quality}, crf: ${crf})...`);
  db.episodes.update(episodeId, { render_progress: 0 } as never);
  let lastWrittenPct = -1;
  try {
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      crf,
      scale,
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 10 === 0) console.log(`${tag}   ${pct}%`);
        if (pct !== lastWrittenPct && pct % 5 === 0) {
          getDb().prepare("UPDATE episodes SET render_progress = ? WHERE id = ?").run(pct, episodeId);
          lastWrittenPct = pct;
        }
        onProgress?.(pct);
      },
      timeoutInMilliseconds: 10 * 60 * 1000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.episodes.update(episodeId, { status: "failed", error: `Render failed: ${msg}` });
    throw new Error(`${tag} renderMedia failed: ${msg}`);
  }

  const durationMs = Date.now() - start;

  // ── 7. Update DB ─────────────────────────────────────────────────────────
  if (!translationId) {
    db.episodes.update(episodeId, {
      status: "rendered",
      video_path: outputPath,
      error: null,
      render_progress: 100,
    } as never);
  } else {
    getDb().prepare("UPDATE translations SET video_path = ?, status = 'rendered' WHERE id = ?")
      .run(outputPath, translationId);
  }

  console.log(`${tag} Done in ${Math.round(durationMs / 1000)}s → ${outputPath}`);
  return { outputPath, durationMs };
}

// ─── CLI entrypoint ──────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const episodeId = getArg("--episode-id");
  const quality = (getArg("--quality") ?? "full") as "preview" | "full";
  const translationId = getArg("--translation-id");

  if (!episodeId) {
    console.error("Usage: npx tsx pipeline/render.ts --episode-id <id> [--quality preview|full] [--translation-id <id>]");
    process.exit(1);
  }

  renderEpisode({ episodeId, quality, translationId })
    .then(({ outputPath, durationMs }) => {
      console.log(`✓ Done in ${Math.round(durationMs / 1000)}s`);
      console.log(`  Output: ${outputPath}`);
    })
    .catch((e: unknown) => {
      console.error("✗", e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
