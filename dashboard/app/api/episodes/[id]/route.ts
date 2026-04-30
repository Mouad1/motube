import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const episode = db.prepare("SELECT * FROM episodes WHERE id = ?").get(id);
  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(episode);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const episode = db.prepare("SELECT id, script_path, audio_path, video_path FROM episodes WHERE id = ?").get(id) as {
    id: string; script_path: string | null; audio_path: string | null; video_path: string | null;
  } | null;

  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rootDir = getRootDir();

  // Delete script file
  if (episode.script_path) {
    const abs = path.isAbsolute(episode.script_path)
      ? episode.script_path
      : path.join(rootDir, episode.script_path);
    try { fs.rmSync(abs, { force: true }); } catch { /* ignore */ }
  }

  // Delete audio directory
  const audioDir = path.join(rootDir, "assets", "audio", id);
  try { fs.rmSync(audioDir, { recursive: true, force: true }); } catch { /* ignore */ }

  // Delete video file
  const videoPath = path.join(rootDir, "output", `${id}.mp4`);
  try { fs.rmSync(videoPath, { force: true }); } catch { /* ignore */ }

  // Delete from DB
  db.prepare("DELETE FROM episodes WHERE id = ?").run(id);

  return NextResponse.json({ deleted: true });
}
