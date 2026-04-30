import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { spawn } from "child_process";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: episodeId } = await params;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const overwrite = body.overwrite === true;

  const db = getDb();
  const episode = db.prepare("SELECT id, props_json FROM episodes WHERE id = ?").get(episodeId) as {
    id: string; props_json: string | null;
  } | null;

  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (!episode.props_json) return NextResponse.json({ error: "Generate script first" }, { status: 400 });

  const rootDir = getRootDir();
  const args = ["tsx", "pipeline/generate-visuals.ts", "--episode-id", episodeId];
  if (overwrite) args.push("--overwrite");

  const child = spawn("npx", args, {
    cwd: rootDir,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return NextResponse.json({ started: true, episodeId, pid: child.pid });
}
