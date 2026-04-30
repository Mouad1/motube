import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

const Schema = z.object({
  platforms: z.array(z.enum(["youtube", "tiktok", "instagram", "twitter"])).min(1),
  metadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    privacyStatus: z.enum(["public", "private", "unlisted"]).default("private"),
  }).default({ tags: [], privacyStatus: "private" }),
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

  const { platforms, metadata } = parsed.data;

  const db = getDb();
  const episode = db.prepare("SELECT id, status, video_path, title FROM episodes WHERE id = ?").get(episodeId) as {
    id: string; status: string; video_path: string | null; title: string;
  } | null;

  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (!episode.video_path) {
    return NextResponse.json({ error: "Render the episode first before publishing" }, { status: 400 });
  }

  // Create publication records (Phase 4 will wire these to actual uploads)
  const publications: Array<{ id: string; platform: string }> = [];

  for (const platform of platforms) {
    const pubId = randomUUID();
    db.prepare(`
      INSERT INTO publications (id, episode_id, platform, status, metadata_json)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(
      pubId,
      episodeId,
      platform,
      JSON.stringify({
        title: metadata.title ?? episode.title,
        description: metadata.description ?? "",
        tags: metadata.tags,
        privacyStatus: metadata.privacyStatus,
      })
    );
    publications.push({ id: pubId, platform });
  }

  return NextResponse.json({
    episodeId,
    platforms,
    publications,
    message: "Publications créées (Phase 4 — connexion YouTube OAuth requise pour l'upload réel)",
  });
}
