import { getDb } from "@/lib/db";
import { existsSync } from "fs";
import { join } from "path";
import PublishingClient from "./publishing-client";

const TOKENS_PATH = join(process.cwd(), "..", "data", "youtube-tokens.json");

function getPageData() {
  const db = getDb();
  const isYouTubeConnected = existsSync(TOKENS_PATH);

  const publications = db.prepare(`
    SELECT p.*, e.title as episode_title, e.video_path
    FROM publications p
    JOIN episodes e ON e.id = p.episode_id
    ORDER BY p.created_at DESC
    LIMIT 50
  `).all() as Array<{
    id: string; episode_title: string; platform: string; status: string;
    url: string | null; published_at: string | null; created_at: string;
    video_path: string | null;
  }>;

  const pendingCount = publications.filter((p) => p.status === "pending").length;
  const publishedCount = publications.filter((p) => p.status === "published").length;
  const failedCount = publications.filter((p) => p.status === "failed").length;

  return { isYouTubeConnected, publications, pendingCount, publishedCount, failedCount };
}

export default function PublishingPage() {
  const data = getPageData();
  return <PublishingClient {...data} />;
}
