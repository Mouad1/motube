import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

// GET /api/episodes/[id]/script — retourne le contenu du script markdown
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const episode = db.prepare("SELECT script_path FROM episodes WHERE id = ?").get(id) as {
    script_path: string | null;
  } | null;

  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!episode.script_path) return NextResponse.json({ content: null });

  const absPath = path.isAbsolute(episode.script_path)
    ? episode.script_path
    : path.join(getRootDir(), episode.script_path);

  if (!fs.existsSync(absPath)) return NextResponse.json({ content: null, missing: true });

  const content = fs.readFileSync(absPath, "utf-8");
  return NextResponse.json({ content, path: episode.script_path });
}

// PUT /api/episodes/[id]/script — sauvegarde un script manuel
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: episodeId } = await params;
  const { content } = await req.json() as { content: string };
  if (!content?.trim()) return NextResponse.json({ error: "Content is empty" }, { status: 400 });

  const db = getDb();
  const episode = db.prepare("SELECT id, slug FROM episodes WHERE id = ?").get(episodeId) as {
    id: string; slug: string;
  } | null;
  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });

  const rootDir = getRootDir();
  const scriptDir = path.join(rootDir, "scripts", "episodes");
  fs.mkdirSync(scriptDir, { recursive: true });
  const scriptPath = path.join(scriptDir, `${episode.slug}.md`);
  fs.writeFileSync(scriptPath, content, "utf-8");

  db.prepare("UPDATE episodes SET script_path = ?, status = 'scripted', updated_at = datetime('now') WHERE id = ?")
    .run(scriptPath, episodeId);

  return NextResponse.json({ saved: true, scriptPath });
}

// POST /api/episodes/[id]/script — déclenche la génération de script
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: episodeId } = await params;

  const db = getDb();
  const episode = db.prepare("SELECT id, source_url, source_type FROM episodes WHERE id = ?").get(episodeId) as {
    id: string; source_url: string | null; source_type: string | null;
  } | null;

  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (!episode.source_url) return NextResponse.json({ error: "No source URL on this episode" }, { status: 400 });

  const rootDir = getRootDir();
  const child = spawn(
    "npx",
    ["tsx", "pipeline/script-gen.ts", "--episode-id", episodeId, "--url", episode.source_url],
    { cwd: rootDir, detached: true, stdio: "ignore" }
  );
  child.unref();

  return NextResponse.json({ started: true, episodeId, pid: child.pid });
}
