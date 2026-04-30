import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

function getRootDir() {
  return process.cwd().endsWith("/dashboard")
    ? process.cwd().slice(0, -"/dashboard".length)
    : process.cwd();
}

// GET /api/auth/youtube/callback?code=...
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    const redirectUrl = new URL("/publishing", req.url);
    redirectUrl.searchParams.set("auth_error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
  }

  const rootDir = getRootDir();

  return new Promise<NextResponse>((resolve) => {
    const child = spawn(
      "npx",
      ["tsx", "pipeline/lib/youtube-exchange.ts", "--code", code],
      { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"] }
    );

    let stderr = "";
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        const successUrl = new URL("/publishing", req.url);
        successUrl.searchParams.set("auth_success", "1");
        resolve(NextResponse.redirect(successUrl));
      } else {
        resolve(NextResponse.json(
          { error: "Token exchange failed", details: stderr },
          { status: 500 }
        ));
      }
    });
  });
}
