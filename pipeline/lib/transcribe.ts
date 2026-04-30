import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const execAsync = promisify(exec);
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? "base";

export interface WordTimestamp {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export async function transcribeAudio(audioPath: string): Promise<WordTimestamp[]> {
  const outputDir = path.dirname(audioPath);
  const baseName = path.basename(audioPath, path.extname(audioPath));
  const jsonOutput = path.join(outputDir, `${baseName}.json`);

  // Try nodejs-whisper binary first, fallback to whisper CLI
  const whisperBin = path.resolve("node_modules/.bin/nodejs-whisper");
  const whisperCmd = fs.existsSync(whisperBin)
    ? `"${whisperBin}"`
    : "whisper";

  try {
    await execAsync(
      `${whisperCmd} "${audioPath}" --model ${WHISPER_MODEL} --output_format json --word_timestamps true --output_dir "${outputDir}"`,
      { timeout: 5 * 60 * 1000 }
    );
  } catch (err) {
    throw new Error(
      `Whisper transcription failed: ${(err as Error).message}. ` +
      `Ensure whisper.cpp is installed (brew install whisper or pip install openai-whisper).`
    );
  }

  if (!fs.existsSync(jsonOutput)) {
    throw new Error(`Whisper output not found at ${jsonOutput}`);
  }

  const raw = JSON.parse(fs.readFileSync(jsonOutput, "utf-8")) as {
    segments: Array<{
      words?: Array<{ word: string; start: number; end: number }>;
    }>;
  };

  const words: WordTimestamp[] = [];
  for (const segment of raw.segments) {
    for (const w of segment.words ?? []) {
      words.push({ word: w.word.trim(), start: w.start, end: w.end });
    }
  }

  return words;
}

export async function transcribeEpisodeChunks(episodeId: string): Promise<WordTimestamp[]> {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const chunksPath = path.join(ROOT, "data", "chunks", `${episodeId}.json`);
  const transcriptPath = path.join(ROOT, "data", "transcripts", `${episodeId}.json`);

  if (!fs.existsSync(chunksPath)) throw new Error("Chunks file not found — run chunk-script first");

  const chunks = JSON.parse(fs.readFileSync(chunksPath, "utf-8")) as Array<{
    index: number; audioPath: string | null;
  }>;

  let allWords: WordTimestamp[] = [];
  let timeOffset = 0;

  for (const chunk of chunks) {
    if (!chunk.audioPath) {
      console.warn(`Chunk ${chunk.index} has no audioPath — skipping`);
      continue;
    }

    const absolutePath = path.join(ROOT, chunk.audioPath);
    if (!fs.existsSync(absolutePath)) {
      console.warn(`Audio not found: ${absolutePath} — skipping`);
      continue;
    }

    console.log(`[TRANSCRIBE] Chunk ${chunk.index}...`);
    const words = await transcribeAudio(absolutePath);

    const offsetWords = words.map(w => ({
      ...w,
      start: w.start + timeOffset,
      end: w.end + timeOffset,
    }));
    allWords = allWords.concat(offsetWords);

    if (words.length > 0) {
      timeOffset = offsetWords[offsetWords.length - 1].end;
    }
  }

  fs.mkdirSync(path.dirname(transcriptPath), { recursive: true });
  fs.writeFileSync(transcriptPath, JSON.stringify(allWords, null, 2));
  console.log(`✓ Transcript saved: ${allWords.length} words → ${transcriptPath}`);

  return allWords;
}
