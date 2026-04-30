import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";

const Schema = z.object({
  episodeId: z.string().uuid(),
  targetLanguages: z.array(z.string().min(2).max(5)).min(1),
  sourceLanguage: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { episodeId, targetLanguages, sourceLanguage } = parsed.data;

  const db = getDb();
  const episode = db.prepare("SELECT id, status, props_json FROM episodes WHERE id = ?").get(episodeId) as {
    id: string; status: string; props_json: string | null;
  } | null;

  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (!episode.props_json) return NextResponse.json({ error: "Generate script first" }, { status: 400 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });

  // Spawn translation pipeline async
  const { spawn } = await import("child_process");
  const args = [
    "tsx", "pipeline/translate.ts",
    "--episode-id", episodeId,
    ...targetLanguages.flatMap((l) => ["--target-lang", l]),
  ];
  if (sourceLanguage) args.push("--source-lang", sourceLanguage);

  const child = spawn("npx", args, {
    cwd: process.cwd().replace("/dashboard", ""),
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return NextResponse.json({
    started: true,
    episodeId,
    targetLanguages,
    message: `Translation to [${targetLanguages.join(", ")}] started`,
  });
}
