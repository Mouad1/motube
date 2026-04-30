import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { db, getDb } from "./lib/db.js";
import { uploadAudio, createAvatarVideo } from "./lib/heygen.js";
import { textToSpeech } from "./lib/elevenlabs.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHUNKS_DIR = path.join(ROOT, "data", "chunks");
const AUDIO_DIR = path.join(ROOT, "assets", "audio");

export interface HeygenSubmitOptions {
  episodeId: string;
  voiceId?: string;
}

export async function submitHeygenChunks(opts: HeygenSubmitOptions): Promise<void> {
  const { episodeId, voiceId = "21m00Tcm4TlvDq8ikWAM" } = opts;
  const avatarId = process.env.HEYGEN_AVATAR_ID ?? "";
  if (!avatarId) throw new Error("HEYGEN_AVATAR_ID not set in .env.local");

  const chunksPath = path.join(CHUNKS_DIR, `${episodeId}.json`);
  if (!fs.existsSync(chunksPath)) throw new Error(`No chunks file — run chunk-script first`);

  const chunks = JSON.parse(fs.readFileSync(chunksPath, "utf-8")) as Array<{
    index: number; text: string; estimatedDuration: number;
    audioPath: string | null; videoId: string | null; videoPath: string | null;
  }>;

  const chunkAudioDir = path.join(AUDIO_DIR, episodeId, "chunks");
  fs.mkdirSync(chunkAudioDir, { recursive: true });

  const videoIds: string[] = [];

  for (const chunk of chunks) {
    console.log(`\n[HEYGEN] Processing chunk ${chunk.index + 1}/${chunks.length}...`);

    // Step 1: TTS if not already done
    if (!chunk.audioPath || !fs.existsSync(path.join(ROOT, chunk.audioPath))) {
      const audioPath = path.join(chunkAudioDir, `chunk-${chunk.index}.mp3`);
      console.log(`  TTS chunk ${chunk.index} (${chunk.text.length} chars)...`);
      await textToSpeech({ text: chunk.text, voiceId, outputPath: audioPath });
      chunk.audioPath = `assets/audio/${episodeId}/chunks/chunk-${chunk.index}.mp3`;
    }

    // Step 2: Upload audio to HeyGen
    const absoluteAudioPath = path.join(ROOT, chunk.audioPath);
    console.log(`  Uploading audio to HeyGen...`);
    const audioUrl = await uploadAudio(absoluteAudioPath);

    // Step 3: Submit video generation
    console.log(`  Submitting to HeyGen API...`);
    const videoId = await createAvatarVideo({ avatarId, audioUrl });
    chunk.videoId = videoId;
    videoIds.push(videoId);
    console.log(`  ✓ Submitted: ${videoId}`);

    // Persist after each chunk to allow resume
    fs.writeFileSync(chunksPath, JSON.stringify(chunks, null, 2));

    if (chunk.index < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Update DB
  getDb().prepare("UPDATE episodes SET heygen_video_ids = ?, status = 'heygen_chunked' WHERE id = ?")
    .run(videoIds.join(","), episodeId);

  console.log(`\n✓ Submitted ${videoIds.length} chunks to HeyGen`);
  console.log(`  Video IDs: ${videoIds.join(", ")}`);
  console.log(`  Next: npx tsx pipeline/heygen-upgrade.ts --episode-id ${episodeId}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };

  const episodeId = getArg("--episode-id");
  const voiceId = getArg("--voice-id");

  if (!episodeId) {
    console.error("Usage: npx tsx pipeline/heygen.ts --episode-id <id> [--voice-id <id>]");
    process.exit(1);
  }

  submitHeygenChunks({ episodeId, voiceId })
    .catch(e => { console.error("✗", e.message); process.exit(1); });
}
