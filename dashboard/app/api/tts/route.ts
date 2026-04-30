import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

function readQuotaFromDisk(): { used: number; month: string } {
  try {
    const file = path.join(getRootDir(), "data", "elevenlabs-quota.json");
    return JSON.parse(fs.readFileSync(file, "utf-8")) as { used: number; month: string };
  } catch {
    return { used: 0, month: new Date().toISOString().slice(0, 7) };
  }
}

const Schema = z.object({
  episodeId: z.string().uuid(),
  voiceId: z.string().optional(),
  translationId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { episodeId, voiceId, translationId } = parsed.data;

  const db = getDb();
  const episode = db.prepare("SELECT id, status, props_json FROM episodes WHERE id = ?").get(episodeId) as {
    id: string; status: string; props_json: string | null;
  } | null;

  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (!episode.props_json) return NextResponse.json({ error: "Generate script first — props_json manquant" }, { status: 400 });

  // Quota check — read directly from file, no cross-boundary import
  const FREE_TIER_LIMIT = Number(process.env.ELEVENLABS_QUOTA ?? 30_000);
  const quota = readQuotaFromDisk();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const usedThisMonth = quota.month === currentMonth ? quota.used : 0;
  const remaining = Math.max(0, FREE_TIER_LIMIT - usedThisMonth);

  // Estimate chars needed
  let estimatedChars = 0;
  try {
    const props = JSON.parse(episode.props_json) as { scenes: Array<{ data: Record<string, string> }> };
    estimatedChars = props.scenes.reduce(
      (sum, s) => sum + Object.values(s.data).join(" ").length, 0
    );
  } catch { /* estimation best-effort */ }

  if (remaining < 100) {
    return NextResponse.json({
      error: `Quota ElevenLabs insuffisant : ${remaining} chars restants ce mois-ci. Minimum 100 chars requis.`,
      remaining,
    }, { status: 429 });
  }

  if (estimatedChars > 0 && estimatedChars > remaining) {
    return NextResponse.json({
      error: `Quota ElevenLabs insuffisant : besoin de ~${estimatedChars} chars, seulement ${remaining} restants ce mois-ci.`,
      remaining,
      estimatedChars,
    }, { status: 429 });
  }

  // Spawn TTS pipeline async
  const rootDir = getRootDir();
  const args = ["tsx", "pipeline/tts.ts", "--episode-id", episodeId];
  if (voiceId) args.push("--voice-id", voiceId);
  if (translationId) args.push("--translation-id", translationId);

  const child = spawn("npx", args, {
    cwd: rootDir,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return NextResponse.json({ started: true, episodeId, remaining, estimatedChars });
}

// GET /api/tts?episodeId=... — quota info
export async function GET(req: NextRequest) {
  const episodeId = req.nextUrl.searchParams.get("episodeId");
  const rootDir = getRootDir();
  const FREE_TIER_LIMIT = Number(process.env.ELEVENLABS_QUOTA ?? 30_000);

  const quota = readQuotaFromDisk();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const usedThisMonth = quota.month === currentMonth ? quota.used : 0;
  const remaining = Math.max(0, FREE_TIER_LIMIT - usedThisMonth);

  if (episodeId) {
    const db = getDb();
    const ep = db.prepare("SELECT props_json FROM episodes WHERE id = ?").get(episodeId) as { props_json: string | null } | null;
    let estimatedChars = 0;
    try {
      if (ep?.props_json) {
        const props = JSON.parse(ep.props_json) as { scenes: Array<{ data: Record<string, string> }> };
        estimatedChars = props.scenes.reduce((sum, s) => sum + Object.values(s.data).join(" ").length, 0);
      }
    } catch { /* best-effort */ }
    return NextResponse.json({ remaining, estimatedChars, canGenerate: estimatedChars <= remaining, rootDir });
  }

  return NextResponse.json({ remaining, used: usedThisMonth });
}
