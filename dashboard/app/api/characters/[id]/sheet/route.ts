import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { spawn } from "child_process";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

const Schema = z.object({
  kinds: z.array(z.string()).optional(), // subset of DEFAULT_SHEET_KINDS; omit = all
  regenerate: z.boolean().default(false),
});

// POST /api/characters/[id]/sheet — (re)generate character sheets
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const db = getDb();
  const character = db.prepare("SELECT id, status FROM characters WHERE id = ?").get(id) as { id: string; status: string } | undefined;
  if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (character.status === "sheet_pending") {
    return NextResponse.json({ error: "Generation already in progress" }, { status: 409 });
  }

  const args = [
    "tsx",
    "pipeline/character-service/generate-sheet.ts",
    "--character-id",
    id,
  ];
  if (parsed.data.kinds && parsed.data.kinds.length > 0) {
    args.push("--kinds", parsed.data.kinds.join(","));
  }
  if (parsed.data.regenerate) args.push("--regenerate");

  // Mark as pending so the UI shows a spinner immediately
  db.prepare("UPDATE characters SET status = 'sheet_pending', updated_at = datetime('now') WHERE id = ?").run(id);

  const child = spawn("npx", args, {
    cwd: getRootDir(),
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();

  return NextResponse.json({ started: true, characterId: id, pid: child.pid });
}
