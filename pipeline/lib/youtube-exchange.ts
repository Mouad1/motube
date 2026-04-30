/**
 * youtube-exchange.ts — CLI script : échange le code OAuth pour des tokens.
 * Appelé par la route /api/auth/youtube/callback via spawn.
 * Usage: npx tsx pipeline/lib/youtube-exchange.ts --code <code>
 */

import { fileURLToPath } from "url";
import { exchangeCodeForTokens, getAuthUrl } from "./youtube.js";

const args = process.argv.slice(2);

// Mode: get-url
if (args.includes("--get-url")) {
  const url = getAuthUrl();
  process.stdout.write(url + "\n");
  process.exit(0);
}

// Mode: exchange code
const codeIdx = args.indexOf("--code");
if (codeIdx === -1) {
  process.stderr.write("Usage: npx tsx pipeline/lib/youtube-exchange.ts --code <code>\n");
  process.exit(1);
}

const code = args[codeIdx + 1];
if (!code) {
  process.stderr.write("Missing code value\n");
  process.exit(1);
}

try {
  const tokens = await exchangeCodeForTokens(code);
  process.stdout.write(JSON.stringify({ ok: true, scope: tokens.scope }) + "\n");
  process.exit(0);
} catch (err) {
  process.stderr.write(`Token exchange failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
