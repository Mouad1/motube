import { NextResponse } from "next/server";
import { spawn } from "child_process";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

// GET /api/auth/youtube — redirige vers Google consent screen
export async function GET() {
  const rootDir = getRootDir();

  return new Promise<NextResponse>((resolve) => {
    const child = spawn(
      "npx",
      ["tsx", "pipeline/lib/youtube-exchange.ts", "--get-url"],
      { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"] }
    );

    let output = "";
    let errOutput = "";
    child.stdout.on("data", (d: Buffer) => { output += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { errOutput += d.toString(); });

    child.on("close", () => {
      const url = output.split("\n").map((l) => l.trim()).find((l) => l.startsWith("https://")) ?? "";
      if (url) {
        resolve(NextResponse.redirect(url));
      } else {
        resolve(NextResponse.json(
          { error: "Failed to generate auth URL", details: errOutput || output },
          { status: 500 }
        ));
      }
    });
  });
}
