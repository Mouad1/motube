import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { db } from "./lib/db.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHUNKS_DIR = path.join(ROOT, "data", "chunks");

const WORDS_PER_MINUTE = 150;
const TARGET_MIN_WORDS = 112; // 45s
const TARGET_MAX_WORDS = 150; // 60s

export interface Chunk {
  index: number;
  text: string;
  estimatedDuration: number; // seconds
  audioPath: string | null;
  videoId: string | null;
  videoPath: string | null;
}

function estimateDuration(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.round((wordCount / WORDS_PER_MINUTE) * 60);
}

function splitIntoSentences(text: string): string[] {
  return text.match(/[^.!?…]+[.!?…]+/g)?.map(s => s.trim()).filter(Boolean) ?? [text];
}

export function chunkScript(fullText: string): Chunk[] {
  const sentences = splitIntoSentences(fullText);
  const chunks: Chunk[] = [];
  let current = "";

  for (const sentence of sentences) {
    const wordCount = (current + " " + sentence).trim().split(/\s+/).length;

    if (current && wordCount > TARGET_MAX_WORDS) {
      chunks.push({
        index: chunks.length,
        text: current.trim(),
        estimatedDuration: estimateDuration(current),
        audioPath: null,
        videoId: null,
        videoPath: null,
      });
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }

    if (current.trim().split(/\s+/).length >= TARGET_MIN_WORDS) {
      const dur = estimateDuration(current);
      if (dur > 60) {
        console.warn(`[CHUNK] Chunk ${chunks.length} exceeds 60s (${dur}s) — single long sentence`);
      }
      chunks.push({
        index: chunks.length,
        text: current.trim(),
        estimatedDuration: dur,
        audioPath: null,
        videoId: null,
        videoPath: null,
      });
      current = "";
    }
  }

  if (current.trim()) {
    chunks.push({
      index: chunks.length,
      text: current.trim(),
      estimatedDuration: estimateDuration(current),
      audioPath: null,
      videoId: null,
      videoPath: null,
    });
  }

  return chunks;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const episodeId = args[args.indexOf("--episode-id") + 1];

  if (!episodeId) {
    console.error("Usage: npx tsx pipeline/chunk-script.ts --episode-id <id>");
    process.exit(1);
  }

  const episode = db.episodes.get(episodeId);
  if (!episode) { console.error(`Episode ${episodeId} not found`); process.exit(1); }
  if (!episode.props_json) { console.error("No props_json — generate script first"); process.exit(1); }

  const props = JSON.parse(episode.props_json) as {
    title: string;
    scenes: Array<{ data: Record<string, string> }>;
  };

  const fullText = props.scenes
    .map(s => s.data.narration ?? s.data.body ?? s.data.text ?? "")
    .filter(Boolean)
    .join(" ");

  if (!fullText.trim()) {
    console.error("No narration text found in scenes");
    process.exit(1);
  }

  const chunks = chunkScript(fullText);

  const totalDuration = chunks.reduce((s, c) => s + c.estimatedDuration, 0);
  console.log(`[CHUNK] ${chunks.length} chunks, ~${Math.round(totalDuration / 60)}min total`);
  for (const c of chunks) {
    console.log(`  Chunk ${c.index}: ${c.estimatedDuration}s (~${c.text.split(/\s+/).length} words)`);
  }

  const estimatedCost = (totalDuration / 60) * 4;
  console.log(`\n[COST] Estimated HeyGen cost: ~$${estimatedCost.toFixed(2)}`);
  console.log("Saving chunks... (add --confirm to skip this message in future)");

  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
  const chunksPath = path.join(CHUNKS_DIR, `${episodeId}.json`);
  fs.writeFileSync(chunksPath, JSON.stringify(chunks, null, 2));
  console.log(`\n✓ Saved ${chunks.length} chunks → ${chunksPath}`);

  db.episodes.update(episodeId, { status: "heygen_chunked" });
  console.log(`✓ Episode status → heygen_chunked`);
}
