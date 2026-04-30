import { ElevenLabsClient } from "elevenlabs";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const MONTHLY_QUOTA = Number(process.env.ELEVENLABS_QUOTA ?? 30_000); // Starter = 30K, Free = 10K

let _client: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not set in .env.local");
  if (!_client) _client = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
  return _client;
}

// ─── Quota tracking (simple file-based counter) ───────────────────────────────

const QUOTA_FILE = path.resolve("data/elevenlabs-quota.json");

interface QuotaData {
  month: string; // "2026-04"
  used: number;
}

function readQuota(): QuotaData {
  const month = new Date().toISOString().slice(0, 7);
  try {
    const raw = JSON.parse(fs.readFileSync(QUOTA_FILE, "utf-8")) as QuotaData;
    if (raw.month !== month) return { month, used: 0 };
    return raw;
  } catch {
    return { month, used: 0 };
  }
}

function writeQuota(data: QuotaData) {
  fs.mkdirSync(path.dirname(QUOTA_FILE), { recursive: true });
  fs.writeFileSync(QUOTA_FILE, JSON.stringify(data, null, 2));
}

export function getRemainingQuota(): number {
  const q = readQuota();
  return Math.max(0, MONTHLY_QUOTA - q.used);
}

export function trackUsage(chars: number) {
  const q = readQuota();
  q.used += chars;
  writeQuota(q);
}

// ─── TTS ──────────────────────────────────────────────────────────────────────

export interface TtsOptions {
  text: string;
  voiceId?: string;
  outputPath: string;
  modelId?: string;
}

/** Generate MP3 audio from text. Returns output path. */
export async function textToSpeech(opts: TtsOptions): Promise<string> {
  const { text, voiceId = "21m00Tcm4TlvDq8ikWAM", outputPath, modelId = "eleven_multilingual_v2" } = opts;

  const remaining = getRemainingQuota();
  if (text.length > remaining) {
    throw new Error(
      `ElevenLabs quota exceeded. Need ${text.length} chars but only ${remaining} remaining this month. ` +
      `Upgrade at elevenlabs.io or wait until next month.`
    );
  }

  const client = getElevenLabsClient();
  let attempts = 0;

  while (attempts < 3) {
    try {
      const audio = await client.textToSpeech.convert(voiceId, {
        text,
        model_id: modelId,
        output_format: "mp3_44100_128",
      });

      // Stream → Buffer → File
      const chunks: Uint8Array[] = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, buffer);
      trackUsage(text.length);

      return outputPath;
    } catch (err: unknown) {
      attempts++;
      if (attempts >= 3) throw err;
      const delay = attempts * 2000;
      console.warn(`ElevenLabs TTS attempt ${attempts} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("TTS failed after 3 attempts");
}

// ─── Voice cloning ────────────────────────────────────────────────────────────

export interface CloneVoiceOptions {
  name: string;
  filePaths: string[]; // audio sample files
  description?: string;
}

export async function cloneVoice(opts: CloneVoiceOptions): Promise<string> {
  const { name, filePaths, description } = opts;
  const client = getElevenLabsClient();

  const files = filePaths.map((p) => fs.createReadStream(p));

  const voice = await client.voices.add({
    name,
    description,
    files,
  });

  return voice.voice_id;
}

// ─── List voices ──────────────────────────────────────────────────────────────

export async function listVoices() {
  const client = getElevenLabsClient();
  const response = await client.voices.getAll();
  return response.voices.map((v) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category,
    labels: v.labels,
  }));
}
