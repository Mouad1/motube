import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

// GET /api/images/[...path] — serves files from assets/images/ (read-only, path-validated)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;
  if (!parts || parts.length === 0) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  // Reject any path component containing traversal or absolute markers
  for (const seg of parts) {
    if (!seg || seg.includes("..") || seg.includes("\0") || path.isAbsolute(seg)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
  }

  const root = getRootDir();
  const baseDir = path.resolve(root, "assets", "images");
  const filePath = path.resolve(baseDir, ...parts);

  // Defense in depth: ensure resolved path is still inside baseDir
  if (!filePath.startsWith(baseDir + path.sep)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp" ? "image/webp" :
    "application/octet-stream";

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=60",
    },
  });
}
