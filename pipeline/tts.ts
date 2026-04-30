/**
 * tts.ts — Génère un fichier MP3 par scène via ElevenLabs.
 * Usage: npx tsx pipeline/tts.ts --episode-id <id> [--voice-id <voice_id>]
 */

import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import dotenv from "dotenv";
import { db, getDb } from "./lib/db.js";
import { textToSpeech, getRemainingQuota } from "./lib/elevenlabs.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.resolve(__dirname, "../assets/audio");
const FPS = 30;
const AUDIO_END_PADDING_FRAMES = 15; // 0.5s buffer after audio ends

// ─── Get audio duration via ffprobe ─────────────────────────────────────────

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

// ─── Extract narration text from a scene ─────────────────────────────────────

interface SceneData {
  [key: string]: string | undefined;
}

interface Scene {
  type: string;
  data: SceneData;
  durationInFrames?: number;
}

function extractNarrationText(scene: Scene): string | null {
  const { type, data } = scene;

  switch (type) {
    case "title":
      return data.narration ?? [data.title, data.subtitle].filter(Boolean).join(". ");
    case "concept":
      return [data.heading, data.body].filter(Boolean).join(". ");
    case "code":
      return data.explanation ?? data.narration ?? null;
    case "transition":
      return data.narration ?? data.text ?? null;
    case "bullet_points":
      return data.narration ?? data.heading ?? null;
    case "diagram":
      return data.narration ?? data.heading ?? null;
    case "code_walkthrough":
      return data.narration ?? null;
    case "arabic-narrator":
      return data.arabicText ?? data.translatedText ?? null;
    case "arabic-title":
      return data.arabicTitle ?? data.translatedTitle ?? null;
    case "arabic-dialogue":
      return data.arabicLine ?? data.translatedLine ?? null;
    case "hook":
      return [data.headline, data.subtext].filter(Boolean).join(". ");
    case "point":
      return data.text ?? null;
    case "cta":
      return data.text ?? null;
    default:
      return null;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export interface TtsOptions {
  episodeId: string;
  voiceId?: string;
  translationId?: string; // if generating audio for a translation
}

export interface TtsResult {
  audioPaths: string[];
  totalChars: number;
  quotaRemaining: number;
}

export async function generateEpisodeTts(opts: TtsOptions): Promise<TtsResult> {
  const { episodeId, translationId } = opts;

  const episode = db.episodes.get(episodeId);
  if (!episode) throw new Error(`Episode ${episodeId} not found`);

  // Resolve props JSON
  const propsJson = translationId
    ? (getDb().prepare("SELECT props_json FROM translations WHERE id = ?").get(translationId) as { props_json: string | null } | null)?.props_json
    : episode.props_json;

  if (!propsJson) throw new Error("No props_json found — generate script first");

  const props = JSON.parse(propsJson) as { title: string; scenes: Scene[] };

  // Resolve voice ID: explicit → DB default → ElevenLabs built-in Rachel
  let voiceId = opts.voiceId;
  if (!voiceId) {
    const defaultVoice = db.voices.list().find((v) => v.is_default === 1);
    voiceId = defaultVoice?.elevenlabs_id ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel (free)
  }

  // Check quota before starting
  const totalChars = props.scenes
    .map((s) => extractNarrationText(s) ?? "")
    .reduce((sum, t) => sum + t.length, 0);

  const remaining = getRemainingQuota();
  if (totalChars > remaining) {
    throw new Error(
      `Not enough ElevenLabs quota. Need ${totalChars} chars, ${remaining} remaining this month.`
    );
  }

  // Output directory
  const suffix = translationId ? `${episodeId}/translation-${translationId}` : episodeId;
  const outputDir = path.join(AUDIO_DIR, suffix);

  const audioPaths: string[] = [];

  for (let i = 0; i < props.scenes.length; i++) {
    const scene = props.scenes[i];
    const text = extractNarrationText(scene);

    if (!text || text.trim().length < 3) {
      audioPaths.push(""); // placeholder for scenes with no narration
      continue;
    }

    const outputPath = path.join(outputDir, `scene-${i}.mp3`);
    console.log(`TTS scene ${i + 1}/${props.scenes.length} (${text.length} chars)...`);

    await textToSpeech({ text, voiceId, outputPath });
    audioPaths.push(outputPath);

    // Compute durationInFrames from actual audio length
    const durationSec = getAudioDurationSeconds(outputPath);
    if (durationSec !== null) {
      const frames = Math.ceil(durationSec * FPS) + AUDIO_END_PADDING_FRAMES;
      props.scenes[i].durationInFrames = frames;
      console.log(`  → ${durationSec.toFixed(2)}s = ${frames} frames`);
    }

    // Small delay to avoid rate limiting
    if (i < props.scenes.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Inject audioPath into each scene's data in props_json
  for (let i = 0; i < props.scenes.length; i++) {
    if (audioPaths[i]) {
      // Store relative path from project root for portability
      props.scenes[i].data.audioPath = `assets/audio/${translationId ? `${episodeId}/translation-${translationId}` : episodeId}/scene-${i}.mp3`;
    }
  }
  const updatedPropsJson = JSON.stringify(props);

  // Update DB status
  if (!translationId) {
    db.episodes.update(episodeId, {
      status: "tts_done",
      audio_path: outputDir,
      props_json: updatedPropsJson,
      error: null,
    });
  } else {
    getDb().prepare("UPDATE translations SET audio_path = ?, props_json = ?, status = 'tts_done' WHERE id = ?")
      .run(outputDir, updatedPropsJson, translationId);
  }

  return { audioPaths, totalChars, quotaRemaining: getRemainingQuota() };
}

// ─── CLI entrypoint ──────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const episodeId = getArg("--episode-id");
  const voiceId = getArg("--voice-id");

  if (!episodeId) {
    console.error("Usage: npx tsx pipeline/tts.ts --episode-id <id> [--voice-id <id>]");
    console.error(`Quota remaining: ${getRemainingQuota()} chars`);
    process.exit(1);
  }

  generateEpisodeTts({ episodeId, voiceId })
    .then(({ audioPaths, totalChars, quotaRemaining }) => {
      console.log(`✓ Generated ${audioPaths.filter(Boolean).length} audio files (${totalChars} chars used)`);
      console.log(`  Quota remaining: ${quotaRemaining} chars`);
    })
    .catch((e) => {
      console.error("✗", e.message);
      try {
        db.episodes.update(episodeId, { status: "failed", error: e.message });
      } catch { /* DB might not be accessible */ }
      process.exit(1);
    });
}
