import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ episodeId: string; filename: string }> }
) {
  const { episodeId, filename } = await params;

  // Safety: only allow scene-N.mp3 filenames
  if (!/^scene-\d+\.mp3$/.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(getRootDir(), "assets", "audio", episodeId, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
