import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

interface CharacterRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  style_prompt: string;
  negative_prompt: string | null;
  base_seed: number;
  image_provider: string;
  video_provider: string;
  lora_ref: string | null;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// GET /api/characters/[id] — character + all sheets
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const character = db.prepare("SELECT * FROM characters WHERE id = ?").get(id) as CharacterRow | undefined;
  if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sheets = db
    .prepare("SELECT * FROM character_sheets WHERE character_id = ? ORDER BY created_at ASC")
    .all(id);

  return NextResponse.json({ character, sheets });
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  style_prompt: z.string().min(10).max(4000).optional(),
  negative_prompt: z.string().max(2000).optional().nullable(),
  base_seed: z.number().int().nonnegative().optional(),
});

// PUT /api/characters/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const db = getDb();
  const existing = db.prepare("SELECT id, version FROM characters WHERE id = ?").get(id) as { id: string; version: number } | undefined;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(parsed.data)) {
    sets.push(`${k} = ?`);
    vals.push(v ?? null);
  }
  // Bump version when style_prompt or base_seed changes (sheets become stale)
  const stylish = parsed.data.style_prompt !== undefined || parsed.data.base_seed !== undefined;
  if (stylish) {
    sets.push("version = version + 1");
  }
  sets.push("updated_at = datetime('now')");

  if (sets.length === 1) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  db.prepare(`UPDATE characters SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
  const character = db.prepare("SELECT * FROM characters WHERE id = ?").get(id);
  return NextResponse.json({ character });
}

// DELETE /api/characters/[id] — removes row + sheet image files
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const character = db.prepare("SELECT id FROM characters WHERE id = ?").get(id) as { id: string } | undefined;
  if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sheets = db
    .prepare("SELECT image_path FROM character_sheets WHERE character_id = ?")
    .all(id) as { image_path: string }[];

  const root = getRootDir();
  for (const s of sheets) {
    const abs = path.isAbsolute(s.image_path) ? s.image_path : path.join(root, s.image_path);
    try { fs.rmSync(abs, { force: true }); } catch { /* ignore */ }
  }

  db.prepare("DELETE FROM character_sheets WHERE character_id = ?").run(id);
  db.prepare("DELETE FROM characters WHERE id = ?").run(id);

  return NextResponse.json({ deleted: true });
}
