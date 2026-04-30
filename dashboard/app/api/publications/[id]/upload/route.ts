import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

// POST /api/publications/[id]/upload — déclenche l'upload YouTube pour une publication
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: publicationId } = await params;

  const rootDir = getRootDir();

  const child = spawn(
    "npx",
    ["tsx", "pipeline/publish.ts", "--publication-id", publicationId],
    { cwd: rootDir, detached: true, stdio: "ignore" }
  );
  child.unref();

  return NextResponse.json({
    started: true,
    pid: child.pid,
    publicationId,
    message: "Upload démarré en arrière-plan",
  });
}
