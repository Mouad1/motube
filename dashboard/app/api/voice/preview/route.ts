import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Schema = z.object({
  voiceId: z.string().min(1),
  text: z.string().min(1).max(200).default("Bonjour, ceci est un aperçu de la voix sélectionnée."),
  modelId: z.string().default("eleven_multilingual_v2"),
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.75),
});

// POST /api/voice/preview — génère un MP3 de prévisualisation et le retourne en streaming
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { voiceId, text, modelId, stability, similarityBoost } = parsed.data;

  try {
    const { getElevenLabsClient } = await import("../../../../../pipeline/lib/elevenlabs");
    const client = getElevenLabsClient();

    const audio = await client.textToSpeech.convert(voiceId, {
      text,
      model_id: modelId,
      voice_settings: { stability, similarity_boost: similarityBoost },
      output_format: "mp3_44100_128",
    });

    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Preview failed" },
      { status: 500 }
    );
  }
}
