import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

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

interface SheetRow {
  id: string;
  character_id: string;
  kind: string;
  image_path: string;
  prompt_used: string;
  seed_used: number;
  version: number;
  created_at: string;
}

// GET /api/characters — list
export async function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM characters ORDER BY created_at DESC")
    .all() as CharacterRow[];

  // Attach a thumbnail (first sheet image) per character
  const enriched = rows.map((c) => {
    const front = db
      .prepare("SELECT image_path FROM character_sheets WHERE character_id = ? ORDER BY created_at ASC LIMIT 1")
      .get(c.id) as { image_path: string } | undefined;
    return { ...c, thumbnail: front?.image_path ?? null };
  });
  return NextResponse.json({ characters: enriched });
}

const CreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be lowercase letters/digits/hyphens").min(2).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  style_prompt: z.string().min(10).max(4000),
  negative_prompt: z.string().max(2000).optional(),
  base_seed: z.number().int().nonnegative().optional(),
  image_provider: z.string().default("fal-flux"),
  video_provider: z.string().default("kling"),
  generate_sheet: z.boolean().default(false),
});

// POST /api/characters — create (optionally trigger sheet generation)
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;
  const db = getDb();

  const existing = db.prepare("SELECT id FROM characters WHERE slug = ?").get(data.slug);
  if (existing) return NextResponse.json({ error: "Slug already taken" }, { status: 409 });

  const id = randomUUID();
  const seed = data.base_seed ?? Math.floor(Math.random() * 2_000_000_000);

  db.prepare(`
    INSERT INTO characters (id, slug, name, description, style_prompt, negative_prompt, base_seed, image_provider, video_provider, version, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'draft')
  `).run(
    id,
    data.slug,
    data.name,
    data.description ?? null,
    data.style_prompt,
    data.negative_prompt ?? null,
    seed,
    data.image_provider,
    data.video_provider,
  );

  if (data.generate_sheet) {
    const args = ["tsx", "pipeline/character-service/generate-sheet.ts", "--character-id", id];
    const child = spawn("npx", args, {
      cwd: getRootDir(),
      detached: true,
      stdio: "ignore",
      env: { ...process.env },
    });
    child.unref();
  }

  const row = db.prepare("SELECT * FROM characters WHERE id = ?").get(id);
  return NextResponse.json({ character: row, sheetGenerationStarted: data.generate_sheet }, { status: 201 });
}
