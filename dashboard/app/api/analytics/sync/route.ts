import { NextResponse } from "next/server";
import { spawn } from "child_process";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

// POST /api/analytics/sync — déclenche la sync YouTube Analytics → SQLite
export async function POST() {
  const rootDir = getRootDir();

  const child = spawn(
    "npx",
    ["tsx", "pipeline/lib/analytics-sync.ts"],
    { cwd: rootDir, detached: true, stdio: "ignore" }
  );
  child.unref();

  return NextResponse.json({
    started: true,
    pid: child.pid,
    message: "Analytics sync démarré en arrière-plan",
  });
}
