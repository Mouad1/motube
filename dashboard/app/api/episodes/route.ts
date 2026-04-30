import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "crypto";

// GET /api/episodes?status=&template=&limit=
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const template = searchParams.get("template") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const db = getDb();
  let sql = "SELECT * FROM episodes WHERE 1=1";
  const params: string[] = [];
  if (status) { sql += " AND status = ?"; params.push(status); }
  if (template) { sql += " AND template = ?"; params.push(template); }
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;

  const episodes = db.prepare(sql).all(...params);
  return NextResponse.json(episodes);
}

const CreateEpisodeSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  template: z.enum(["karpathy", "arabic-story", "short-form"]).default("karpathy"),
  language: z.string().default("en"),
  source_type: z.enum(["article", "youtube", "arabic-story", "manual"]).optional(),
  source_url: z.string().url().optional(),
});

// POST /api/episodes
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateEpisodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { title, slug, template, language, source_type, source_url } = parsed.data;
  const db = getDb();

  // Check slug uniqueness
  const existing = db.prepare("SELECT id FROM episodes WHERE slug = ?").get(slug);
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO episodes (id, slug, title, template, language, source_type, source_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
  `).run(id, slug, title, template, language, source_type ?? null, source_url ?? null);

  const episode = db.prepare("SELECT * FROM episodes WHERE id = ?").get(id);
  return NextResponse.json(episode, { status: 201 });
}
