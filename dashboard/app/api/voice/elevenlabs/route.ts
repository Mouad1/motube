import { NextResponse } from "next/server";

// GET /api/voice/elevenlabs — liste les voix disponibles depuis l'API ElevenLabs
export async function GET() {
  try {
    const { listVoices, getRemainingQuota } = await import(
      "../../../../../pipeline/lib/elevenlabs"
    );
    const [voices, quota] = await Promise.all([listVoices(), getRemainingQuota()]);
    return NextResponse.json({ voices, quota });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ElevenLabs error" },
      { status: 500 }
    );
  }
}
