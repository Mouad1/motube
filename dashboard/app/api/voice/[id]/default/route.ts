import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { language } = await req.json() as { language: string };
  const db = getDb();

  db.prepare("UPDATE voice_profiles SET is_default = 0 WHERE language = ?").run(language);
  db.prepare("UPDATE voice_profiles SET is_default = 1 WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
