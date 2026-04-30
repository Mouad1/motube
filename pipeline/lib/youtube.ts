/**
 * youtube.ts — YouTube Data API v3 + Analytics client.
 * OAuth2 flow, video upload, analytics queries.
 */

import { google, youtube_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const TOKENS_PATH = path.join(ROOT, "data", "youtube-tokens.json");

// ─── OAuth2 client factory ────────────────────────────────────────────────────

export function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI ?? "http://localhost:3000/api/auth/youtube/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env.local");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ─── Token persistence ────────────────────────────────────────────────────────

export interface YouTubeTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
}

export function saveTokens(tokens: YouTubeTokens): void {
  fs.mkdirSync(path.dirname(TOKENS_PATH), { recursive: true });
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

export function loadTokens(): YouTubeTokens | null {
  if (!fs.existsSync(TOKENS_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(TOKENS_PATH, "utf-8")) as YouTubeTokens;
  } catch {
    return null;
  }
}

export function hasTokens(): boolean {
  return fs.existsSync(TOKENS_PATH);
}

// ─── Authenticated client ─────────────────────────────────────────────────────

export function getAuthenticatedClient(): OAuth2Client {
  const tokens = loadTokens();
  if (!tokens) {
    throw new Error("YouTube not authenticated. Visit /api/auth/youtube to connect.");
  }
  const client = createOAuth2Client();
  client.setCredentials(tokens);

  // Auto-refresh token when expired
  client.on("tokens", (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    saveTokens(merged as YouTubeTokens);
  });

  return client;
}

// ─── Auth URL ─────────────────────────────────────────────────────────────────

export function getAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
    prompt: "consent", // force refresh_token on every consent
  });
}

// ─── Exchange code for tokens ─────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string): Promise<YouTubeTokens> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("OAuth2 exchange did not return expected tokens");
  }

  const saved = tokens as YouTubeTokens;
  saveTokens(saved);
  return saved;
}

// ─── Video upload ─────────────────────────────────────────────────────────────

export interface UploadVideoOptions {
  videoPath: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: "public" | "private" | "unlisted";
  categoryId?: string; // 27 = Education, 22 = People & Blogs, 28 = Science & Technology
  onProgress?: (pct: number) => void;
}

export interface UploadResult {
  videoId: string;
  url: string;
  title: string;
}

export async function uploadVideo(opts: UploadVideoOptions): Promise<UploadResult> {
  const {
    videoPath,
    title,
    description,
    tags = [],
    privacyStatus = "private",
    categoryId = "27",
    onProgress,
  } = opts;

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const auth = getAuthenticatedClient();
  const yt = google.youtube({ version: "v3", auth });

  const fileSize = fs.statSync(videoPath).size;
  let uploaded = 0;

  const res = await yt.videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title,
          description,
          tags,
          categoryId,
          defaultLanguage: "fr",
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        mimeType: "video/mp4",
        body: fs.createReadStream(videoPath).on("data", (chunk: string | Buffer) => {
          uploaded += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
          onProgress?.(Math.round((uploaded / fileSize) * 100));
        }),
      },
    },
    {
      onUploadProgress: (evt) => {
        if (evt.bytesRead && fileSize) {
          onProgress?.(Math.round((evt.bytesRead / fileSize) * 100));
        }
      },
    }
  );

  const videoId = res.data.id!;
  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: res.data.snippet?.title ?? title,
  };
}

// ─── Get channel info ─────────────────────────────────────────────────────────

export interface ChannelInfo {
  id: string;
  title: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  thumbnailUrl: string;
}

export async function getChannelInfo(): Promise<ChannelInfo> {
  const auth = getAuthenticatedClient();
  const yt = google.youtube({ version: "v3", auth });

  const res = await yt.channels.list({
    part: ["snippet", "statistics"],
    mine: true,
  });

  const channel = res.data.items?.[0];
  if (!channel) throw new Error("No YouTube channel found for this account");

  return {
    id: channel.id ?? "",
    title: channel.snippet?.title ?? "",
    subscriberCount: parseInt(channel.statistics?.subscriberCount ?? "0"),
    videoCount: parseInt(channel.statistics?.videoCount ?? "0"),
    viewCount: parseInt(channel.statistics?.viewCount ?? "0"),
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? "",
  };
}

// ─── Video stats ──────────────────────────────────────────────────────────────

export interface VideoStats {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
}

export async function getVideoStats(videoId: string): Promise<VideoStats> {
  const auth = getAuthenticatedClient();
  const yt = google.youtube({ version: "v3", auth });

  const res = await yt.videos.list({
    part: ["statistics", "contentDetails"],
    id: [videoId],
  });

  const video = res.data.items?.[0];
  if (!video) throw new Error(`Video not found: ${videoId}`);

  return {
    videoId,
    views: parseInt(video.statistics?.viewCount ?? "0"),
    likes: parseInt(video.statistics?.likeCount ?? "0"),
    comments: parseInt(video.statistics?.commentCount ?? "0"),
    duration: video.contentDetails?.duration ?? "PT0S",
  };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsSnapshot {
  date: string;
  views: number;
  watchTimeMinutes: number;
  estimatedRevenue: number;
  ctr: number;
  avgViewDuration: number;
}

export async function getVideoAnalytics(
  videoId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<AnalyticsSnapshot[]> {
  const auth = getAuthenticatedClient();
  const ytAnalytics = google.youtubeAnalytics({ version: "v2", auth });

  const res = await ytAnalytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views,estimatedWatchTime,estimatedRevenue,cardClickRate,averageViewDuration",
    dimensions: "day",
    filters: `video==${videoId}`,
    sort: "day",
  });

  const rows = res.data.rows ?? [];
  return rows.map((row) => ({
    date: String(row[0]),
    views: Number(row[1]) || 0,
    watchTimeMinutes: Number(row[2]) || 0,
    estimatedRevenue: Number(row[3]) || 0,
    ctr: Number(row[4]) || 0,
    avgViewDuration: Number(row[5]) || 0,
  }));
}

export async function getChannelAnalytics(
  startDate: string,
  endDate: string
): Promise<AnalyticsSnapshot[]> {
  const auth = getAuthenticatedClient();
  const ytAnalytics = google.youtubeAnalytics({ version: "v2", auth });

  const res = await ytAnalytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views,estimatedWatchTime,estimatedRevenue,cardClickRate,averageViewDuration",
    dimensions: "day",
    sort: "day",
  });

  const rows = res.data.rows ?? [];
  return rows.map((row) => ({
    date: String(row[0]),
    views: Number(row[1]) || 0,
    watchTimeMinutes: Number(row[2]) || 0,
    estimatedRevenue: Number(row[3]) || 0,
    ctr: Number(row[4]) || 0,
    avgViewDuration: Number(row[5]) || 0,
  }));
}
