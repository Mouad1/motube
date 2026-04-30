import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const API_KEY = process.env.HEYGEN_API_KEY ?? "";
const BASE_URL = "https://api.heygen.com";
const UPLOAD_URL = "https://upload.heygen.com";

function headers() {
  if (!API_KEY) throw new Error("HEYGEN_API_KEY not set in .env.local");
  return { "X-Api-Key": API_KEY, "Content-Type": "application/json" };
}

// ─── Upload audio file to HeyGen asset store ──────────────────────────────────

export async function uploadAudio(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const res = await fetch(`${UPLOAD_URL}/v1/asset`, {
    method: "POST",
    headers: {
      "X-Api-Key": API_KEY,
      "Content-Type": "audio/mpeg",
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`HeyGen upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json() as { data: { id: string; url: string } };
  return json.data.url;
}

// ─── Submit avatar video generation (Avatar 4) ───────────────────────────────

export interface CreateVideoOptions {
  avatarId: string;
  audioUrl: string;
  width?: number;
  height?: number;
}

export async function createAvatarVideo(opts: CreateVideoOptions): Promise<string> {
  const { avatarId, audioUrl, width = 1920, height = 1080 } = opts;
  const res = await fetch(`${BASE_URL}/v2/video/generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      video_inputs: [{
        character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
        voice: { type: "audio", audio_url: audioUrl },
        background: { type: "color", value: "#1a1a2e" },
      }],
      dimension: { width, height },
      test: false,
    }),
  });
  if (!res.ok) throw new Error(`HeyGen create failed: ${res.status} ${await res.text()}`);
  const json = await res.json() as { data: { video_id: string } };
  return json.data.video_id;
}

// ─── Poll video status ────────────────────────────────────────────────────────

export interface VideoStatus {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

export async function getVideoStatus(videoId: string): Promise<VideoStatus> {
  const res = await fetch(`${BASE_URL}/v2/video_status.get?video_id=${videoId}`, {
    headers: { "X-Api-Key": API_KEY },
  });
  if (!res.ok) throw new Error(`HeyGen status failed: ${res.status} ${await res.text()}`);
  const json = await res.json() as { data: { status: string; video_url?: string; error?: string } };
  return {
    status: json.data.status as VideoStatus["status"],
    videoUrl: json.data.video_url,
    error: json.data.error,
  };
}

// ─── Poll until completed (timeout 10 min) ───────────────────────────────────

export async function waitForVideo(videoId: string, intervalMs = 10_000): Promise<string> {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const status = await getVideoStatus(videoId);
    console.log(`  [HeyGen] ${videoId} → ${status.status}`);
    if (status.status === "completed" && status.videoUrl) return status.videoUrl;
    if (status.status === "failed") throw new Error(`HeyGen video failed: ${status.error}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`HeyGen video ${videoId} timed out after 10 minutes`);
}

// ─── Download MP4 to disk ─────────────────────────────────────────────────────

export async function downloadVideo(videoUrl: string, outputPath: string): Promise<void> {
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
}
