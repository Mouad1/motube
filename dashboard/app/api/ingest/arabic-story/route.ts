import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

const Schema = z.object({
  arabicText: z.string().min(50),
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  targetLanguages: z.array(z.string()).default(["en", "fr"]),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { arabicText, title, slug, targetLanguages } = parsed.data;

  const db = getDb();
  const existing = db.prepare("SELECT id FROM episodes WHERE slug = ?").get(slug);
  if (existing) return NextResponse.json({ error: "Slug already taken" }, { status: 409 });

  const id = randomUUID();
  db.prepare(`
    INSERT INTO episodes (id, slug, title, template, language, source_type, status)
    VALUES (?, ?, ?, 'arabic-story', 'ar', 'arabic-story', 'draft')
  `).run(id, slug, title);

  // Write the Arabic text to a temp file and spawn pipeline
  const { spawn } = await import("child_process");
  const { writeFileSync } = await import("fs");
  const { join } = await import("path");

  const rootDir = process.cwd().replace("/dashboard", "");
  const tempFile = join(rootDir, "data", `arabic-temp-${id}.txt`);
  writeFileSync(tempFile, arabicText);

  const args = [
    "tsx", "pipeline/translate.ts",
    "--episode-id", id,
    "--arabic-file", tempFile,
    ...targetLanguages.flatMap((l) => ["--target-lang", l]),
  ];

  const child = spawn("npx", args, {
    cwd: rootDir,
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();

  const episode = db.prepare("SELECT * FROM episodes WHERE id = ?").get(id);
  return NextResponse.json({ episodeId: id, episode, targetLanguages }, { status: 201 });
}
