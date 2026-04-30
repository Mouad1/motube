import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

// GET /api/voice — list voice profiles
export async function GET() {
  const db = getDb();
  const voices = db.prepare(
    "SELECT * FROM voice_profiles ORDER BY is_default DESC, created_at DESC"
  ).all();

  // Optionally enrich with ElevenLabs quota info
  let quota = null;
  try {
    const { getRemainingQuota } = await import("../../../../pipeline/lib/elevenlabs");
    quota = getRemainingQuota();
  } catch {
    // ElevenLabs not configured
  }

  return NextResponse.json({ voices, quota });
}

const CreateVoiceSchema = z.object({
  name: z.string().min(1).max(100),
  language: z.string().default("en"),
  elevenLabsId: z.string().optional(), // if manually providing an existing ElevenLabs voice ID
  isDefault: z.boolean().default(false),
});

// POST /api/voice — create a voice profile (with optional ElevenLabs voice ID)
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CreateVoiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { name, language, elevenLabsId, isDefault } = parsed.data;
  const db = getDb();

  // If setting as default, unset previous defaults for this language
  if (isDefault) {
    db.prepare("UPDATE voice_profiles SET is_default = 0 WHERE language = ?").run(language);
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO voice_profiles (id, name, elevenlabs_id, language, is_default)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, elevenLabsId ?? null, language, isDefault ? 1 : 0);

  const voice = db.prepare("SELECT * FROM voice_profiles WHERE id = ?").get(id);
  return NextResponse.json(voice, { status: 201 });
}
