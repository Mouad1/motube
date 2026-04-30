/**
 * publish.ts — Upload vidéo vers YouTube + re-encode pour autres plateformes.
 * Usage: npx tsx pipeline/publish.ts --publication-id <id>
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { db, getDb } from "./lib/db.js";
import { uploadVideo } from "./lib/youtube.js";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

dotenv.config({ path: ".env.local" });

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublishOptions {
  publicationId: string;
  onProgress?: (pct: number) => void;
}

export interface PublishResult {
  publicationId: string;
  platform: string;
  platformId: string;
  url: string;
}

// ─── Re-encode for platform ───────────────────────────────────────────────────

async function reencodeForPlatform(
  inputPath: string,
  platform: "tiktok" | "instagram" | "twitter"
): Promise<string> {
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const outputDir = path.join(ROOT, "output", "platform");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${base}-${platform}.mp4`);

  // Platform-specific encoding settings
  const settings: Record<string, { maxDuration: number; maxSize: string; crf: number }> = {
    tiktok:    { maxDuration: 180, maxSize: "287m", crf: 23 },
    instagram: { maxDuration: 60,  maxSize: "100m", crf: 23 },
    twitter:   { maxDuration: 140, maxSize: "512m", crf: 26 },
  };

  const s = settings[platform];

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264",
        `-crf ${s.crf}`,
        "-preset fast",
        "-c:a aac",
        "-b:a 128k",
        "-movflags +faststart",
        `-t ${s.maxDuration}`,
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

// ─── YouTube publish ──────────────────────────────────────────────────────────

async function publishToYouTube(
  publication: { id: string; episode_id: string; metadata_json: string | null },
  videoPath: string,
  onProgress?: (pct: number) => void
): Promise<PublishResult> {
  const meta = publication.metadata_json
    ? JSON.parse(publication.metadata_json)
    : {};

  const episode = db.episodes.get(publication.episode_id);
  const title = meta.title ?? episode?.title ?? "Untitled";
  const description = meta.description ?? "";
  const tags = meta.tags ?? [];
  const privacyStatus = meta.privacyStatus ?? "private";

  const result = await uploadVideo({
    videoPath,
    title,
    description,
    tags,
    privacyStatus,
    categoryId: "27", // Education
    onProgress,
  });

  return {
    publicationId: publication.id,
    platform: "youtube",
    platformId: result.videoId,
    url: result.url,
  };
}

// ─── Main publish function ────────────────────────────────────────────────────

export async function publishEpisode(opts: PublishOptions): Promise<PublishResult> {
  const { publicationId, onProgress } = opts;

  const rawDb = getDb();
  const publication = rawDb.prepare(`
    SELECT p.*, e.video_path, e.title
    FROM publications p
    JOIN episodes e ON e.id = p.episode_id
    WHERE p.id = ?
  `).get(publicationId) as {
    id: string;
    episode_id: string;
    platform: string;
    metadata_json: string | null;
    video_path: string | null;
    title: string;
  } | null;

  if (!publication) throw new Error(`Publication not found: ${publicationId}`);
  if (!publication.video_path) throw new Error("No rendered video found. Render the episode first.");

  const videoPath = path.isAbsolute(publication.video_path)
    ? publication.video_path
    : path.join(ROOT, publication.video_path);

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file missing: ${videoPath}`);
  }

  // Mark as uploading
  db.publications.update(publicationId, { status: "uploading" });

  let result: PublishResult;

  try {
    if (publication.platform === "youtube") {
      result = await publishToYouTube(publication, videoPath, onProgress);
    } else {
      // Re-encode for other platforms
      const platform = publication.platform as "tiktok" | "instagram" | "twitter";
      const reencoded = await reencodeForPlatform(videoPath, platform);

      // Placeholder for TikTok/Instagram/Twitter APIs
      // These require platform-specific OAuth and upload flows
      console.log(`[publish] Re-encoded for ${platform}: ${reencoded}`);
      console.log(`[publish] ${platform} upload API not yet implemented — file ready at ${reencoded}`);

      result = {
        publicationId,
        platform,
        platformId: `pending-${Date.now()}`,
        url: reencoded, // Local path until real API is wired
      };
    }

    // Update publication record
    db.publications.update(publicationId, {
      status: "published",
      platform_id: result.platformId,
      url: result.url,
      published_at: new Date().toISOString(),
    });

    // Update episode status if YouTube
    if (publication.platform === "youtube") {
      db.episodes.update(publication.episode_id, { status: "published" });
    }

    console.log(`[publish] ✓ Published to ${publication.platform}: ${result.url}`);
    return result;

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.publications.update(publicationId, { status: "failed" });
    db.episodes.update(publication.episode_id, { status: "failed", error: message });
    throw err;
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const publicationId = args[args.indexOf("--publication-id") + 1];

  if (!publicationId) {
    console.error("Usage: npx tsx pipeline/publish.ts --publication-id <id>");
    process.exit(1);
  }

  publishEpisode({ publicationId, onProgress: (p) => process.stdout.write(`\r[publish] ${p}%`) })
    .then((r) => {
      console.log(`\n✓ Published: ${r.url}`);
    })
    .catch((err) => {
      console.error("✗ Publish failed:", err.message);
      process.exit(1);
    });
}
