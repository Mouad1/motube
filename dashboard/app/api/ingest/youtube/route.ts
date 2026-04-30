import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

const Schema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(200).optional(),
  language: z.string().default("fr"),
  voiceId: z.string().optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60)
    + "-" + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { url, language, voiceId } = parsed.data;

  // Validate YouTube URL
  const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
  if (!isYoutube) return NextResponse.json({ error: "Must be a YouTube URL" }, { status: 422 });

  const db = getDb();
  const id = randomUUID();
  const title = parsed.data.title ?? "YouTube video " + Date.now().toString(36);
  const slug = slugify(title);

  const existing = db.prepare("SELECT id FROM episodes WHERE slug = ?").get(slug);
  if (existing) return NextResponse.json({ error: "Slug collision — provide a custom title" }, { status: 409 });

  db.prepare(`
    INSERT INTO episodes (id, slug, title, template, language, source_type, source_url, status)
    VALUES (?, ?, ?, 'karpathy', ?, 'youtube', ?, 'draft')
  `).run(id, slug, title, language, url);

  // Spawn pipeline script async
  const { spawn } = await import("child_process");
  const args = ["tsx", "pipeline/script-gen.ts", "--episode-id", id, "--url", url];
  if (voiceId) args.push("--voice-id", voiceId);

  const child = spawn("npx", args, {
    cwd: process.cwd().replace("/dashboard", ""),
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  const episode = db.prepare("SELECT * FROM episodes WHERE id = ?").get(id);
  return NextResponse.json({ episodeId: id, episode }, { status: 201 });
}
