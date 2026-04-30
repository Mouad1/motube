import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const episode = db.prepare("SELECT video_path FROM episodes WHERE id = ?").get(id) as {
    video_path: string | null;
  } | null;

  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!episode.video_path) return NextResponse.json({ error: "No video rendered yet" }, { status: 404 });

  const absPath = path.isAbsolute(episode.video_path)
    ? episode.video_path
    : path.join(getRootDir(), episode.video_path);

  if (!fs.existsSync(absPath)) return NextResponse.json({ error: "Video file missing" }, { status: 404 });

  const stat = fs.statSync(absPath);
  const fileSize = stat.size;

  // Support Range requests for video seeking
  const rangeHeader = req.headers.get("range");
  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(absPath, { start, end });
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
      },
    });
  }

  const stream = fs.createReadStream(absPath);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
    },
  });
}
