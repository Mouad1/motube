import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

const Schema = z.object({
  quality: z.enum(["preview", "full"]).default("preview"),
  translationId: z.string().uuid().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: episodeId } = await params;

  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { quality, translationId } = parsed.data;

  const db = getDb();
  const episode = db.prepare("SELECT id, status, props_json FROM episodes WHERE id = ?").get(episodeId) as {
    id: string; status: string; props_json: string | null;
  } | null;

  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (!episode.props_json) return NextResponse.json({ error: "Generate script first" }, { status: 400 });

  // Spawn render pipeline process
  const args = ["tsx", "pipeline/render.ts", "--episode-id", episodeId, "--quality", quality];
  if (translationId) args.push("--translation-id", translationId);

  const jobId = randomUUID();
  const rootDir = process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();

  const child = spawn("npx", args, {
    cwd: rootDir,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return NextResponse.json({ jobId, episodeId, quality, pid: child.pid, started: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: episodeId } = await params;
  const db = getDb();

  const episode = db.prepare("SELECT id, status, video_path, error, render_progress FROM episodes WHERE id = ?").get(episodeId) as {
    id: string; status: string; video_path: string | null; error: string | null; render_progress: number | null;
  } | null;

  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isRendering = episode.status === "tts_done" && episode.render_progress !== null && episode.render_progress < 100;

  return NextResponse.json({
    episodeId,
    status: episode.status,
    videoPath: episode.video_path,
    error: episode.error,
    progress: episode.render_progress,
    isRendering,
    isRendered: episode.status === "rendered" || episode.status === "published",
  });
}
