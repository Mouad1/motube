import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import EpisodeClient from "./episode-client";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

function getEpisode(id: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM episodes WHERE id = ?").get(id) as {
    id: string; title: string; slug: string; template: string; language: string;
    status: string; source_type: string | null; source_url: string | null;
    script_path: string | null; audio_path: string | null; video_path: string | null;
    props_json: string | null; error: string | null; render_progress: number | null;
    created_at: string; updated_at: string;
  } | null;
}

export default async function EpisodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = getEpisode(id);
  if (!episode) notFound();

  // Read script file content server-side
  let scriptContent: string | null = null;
  if (episode.script_path) {
    const absPath = path.isAbsolute(episode.script_path)
      ? episode.script_path
      : path.join(getRootDir(), episode.script_path);
    if (fs.existsSync(absPath)) {
      scriptContent = fs.readFileSync(absPath, "utf-8");
    }
  }

  // Read audio files for this episode
  const audioDir = path.join(getRootDir(), "assets", "audio", id);
  let audioFiles: string[] = [];
  if (fs.existsSync(audioDir)) {
    audioFiles = fs.readdirSync(audioDir)
      .filter((f) => /^scene-\d+\.mp3$/.test(f))
      .sort((a, b) => {
        const n = (s: string) => parseInt(s.replace("scene-", "").replace(".mp3", ""));
        return n(a) - n(b);
      });
  }

  const props = episode.props_json ? JSON.parse(episode.props_json) : null;
  const scenes: Array<{ type: string; data?: Record<string, string> }> = props?.scenes ?? [];

  return <EpisodeClient episode={episode} scriptContent={scriptContent} scenes={scenes} audioFiles={audioFiles} />;
}
