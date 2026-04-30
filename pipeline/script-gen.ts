/**
 * script-gen.ts — Génère un script Remotion structuré depuis une URL d'article ou YouTube.
 * Usage: npx tsx pipeline/script-gen.ts --episode-id <id> [--url <url>] [--text <text>]
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { db } from "./lib/db.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

// ─── Types mirroring KarpathyEpisode.tsx ─────────────────────────────────────

type SceneType =
  | { type: "title"; data: { title: string; subtitle?: string } }
  | { type: "code"; data: { code: string; language: string; explanation: string } }
  | { type: "concept"; data: { heading: string; body: string; visual?: string } }
  | { type: "transition"; data: { text: string } };

interface EpisodeProps {
  title: string;
  scenes: Array<SceneType & { durationInFrames?: number }>;
}

// ─── Content fetching ─────────────────────────────────────────────────────────

/**
 * SSRF guard — reject URLs targeting localhost, RFC1918 private ranges,
 * link-local, cloud metadata endpoints, or non-http(s) schemes.
 * Run on the parsed hostname BEFORE any fetch.
 */
function assertSafeUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Disallowed URL scheme: ${parsed.protocol}`);
  }
  const host = parsed.hostname.toLowerCase();
  // Block exact localhost names and IPv6 loopback
  if (host === "localhost" || host === "::1" || host.endsWith(".localhost")) {
    throw new Error(`Disallowed host (loopback): ${host}`);
  }
  // Block private / link-local / metadata IPv4 ranges
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [parseInt(v4[1], 10), parseInt(v4[2], 10)];
    const isPrivate =
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) || // link-local + AWS metadata 169.254.169.254
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
    if (isPrivate) throw new Error(`Disallowed host (private/link-local): ${host}`);
  }
  // Catch-all for IPv6 private ranges
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    throw new Error(`Disallowed host (IPv6 private/link-local): ${host}`);
  }
  return parsed;
}

async function fetchArticleText(url: string): Promise<string> {
  assertSafeUrl(url);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; motube-bot/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();

  // Strip HTML tags, scripts, styles
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{3,}/g, "\n\n")
    .trim();

  // Limit to ~8000 chars to stay within context
  return text.slice(0, 8000);
}

async function fetchYouTubeTranscript(url: string): Promise<string> {
  // Extract video ID
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (!match) throw new Error(`Could not extract YouTube video ID from: ${url}`);
  const videoId = match[1];

  // Try to fetch transcript via YouTube's timedtext API
  const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3`;
  try {
    const res = await fetch(transcriptUrl);
    if (res.ok) {
      const data = await res.json() as { events?: Array<{ segs?: Array<{ utf8?: string }> }> };
      const text = data.events
        ?.flatMap((e) => e.segs?.map((s) => s.utf8 ?? "") ?? [])
        .join(" ")
        .replace(/\n/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (text && text.length > 100) return text.slice(0, 8000);
    }
  } catch {
    // fallback to description fetch
  }

  // Fallback: fetch video page description
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await pageRes.text();
  const descMatch = html.match(/"shortDescription":"(.*?)","[^"]+?":"[^"]+?"/);
  if (descMatch) {
    return descMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').slice(0, 8000);
  }

  throw new Error(`Could not extract content from YouTube URL: ${url}`);
}

// ─── Claude script generation ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert technical educator in the style of Andrej Karpathy.
You create dense, engaging educational video scripts structured as Remotion scenes.

You must return ONLY a valid JSON object — no markdown, no explanation, just JSON.

The JSON must have this exact structure:
{
  "title": "Episode Title",
  "scenes": [
    {
      "type": "title",
      "data": { "title": "Main Title", "subtitle": "Optional subtitle" },
      "durationInFrames": 150
    },
    {
      "type": "concept",
      "data": { "heading": "Core Idea", "body": "Clear explanation in 2-3 sentences" },
      "durationInFrames": 240
    },
    {
      "type": "code",
      "data": {
        "code": "actual code here",
        "language": "python",
        "explanation": "What this code does and why"
      },
      "durationInFrames": 300
    },
    {
      "type": "transition",
      "data": { "text": "Next Section Name" },
      "durationInFrames": 90
    }
  ]
}

Rules:
- First scene MUST be type "title"
- Last scene MUST be type "transition" with text like "Key Takeaways"
- 6-12 scenes total
- durationInFrames: title=150, concept=240, code=300, transition=90
- For code scenes: write actual, runnable code (not pseudocode)
- For concept scenes: body should be 1-3 dense, informative sentences
- Language is French unless the source content is in another language`;

async function generateScript(sourceText: string, hint?: string): Promise<EpisodeProps> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set in .env.local");

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const userContent = hint
    ? `Source content (${hint}):\n\n${sourceText}`
    : `Source content:\n\n${sourceText}`;

  let attempts = 0;
  while (attempts < 3) {
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      });

      const raw = message.content[0].type === "text" ? message.content[0].text : "";
      const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      return JSON.parse(clean) as EpisodeProps;
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, attempts * 2000));
    }
  }
  throw new Error("Script generation failed after 3 attempts");
}

// ─── Write script to .md ──────────────────────────────────────────────────────

function writeScriptMarkdown(slug: string, props: EpisodeProps): string {
  const lines: string[] = [
    `---`,
    `title: "${props.title}"`,
    `slug: "${slug}"`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
    `status: scripted`,
    `---`,
    ``,
    `# ${props.title}`,
    ``,
  ];

  props.scenes.forEach((scene, i) => {
    lines.push(`## Scène ${i + 1} — ${scene.type.toUpperCase()}`);
    lines.push(`> Duration: ${scene.durationInFrames ?? "default"} frames`);
    lines.push("");
    Object.entries(scene.data).forEach(([k, v]) => {
      if (k === "code") {
        lines.push(`\`\`\`\n${v}\n\`\`\``);
      } else {
        lines.push(`**${k}**: ${v}`);
      }
    });
    lines.push("");
  });

  const scriptDir = path.join(ROOT, "scripts", "episodes");
  fs.mkdirSync(scriptDir, { recursive: true });
  const scriptPath = path.join(scriptDir, `${slug}.md`);
  fs.writeFileSync(scriptPath, lines.join("\n"));
  return scriptPath;
}

// ─── Main export (called by API routes) ──────────────────────────────────────

export interface GenerateScriptOptions {
  episodeId: string;
  sourceType: "article" | "youtube" | "text";
  sourceUrl?: string;
  sourceText?: string;
}

export async function generateEpisodeScript(opts: GenerateScriptOptions): Promise<{ scriptPath: string; props: EpisodeProps }> {
  const { episodeId, sourceType, sourceUrl, sourceText } = opts;

  const episode = db.episodes.get(episodeId);
  if (!episode) throw new Error(`Episode ${episodeId} not found`);

  // 1. Fetch source content
  let content: string;
  let hint: string;

  if (sourceType === "article" && sourceUrl) {
    content = await fetchArticleText(sourceUrl);
    hint = "article";
  } else if (sourceType === "youtube" && sourceUrl) {
    content = await fetchYouTubeTranscript(sourceUrl);
    hint = "YouTube video";
  } else if (sourceText) {
    content = sourceText;
    hint = "provided text";
  } else {
    throw new Error("Must provide sourceUrl or sourceText");
  }

  // 2. Generate script via Claude
  const props = await generateScript(content, hint);

  // 3. Write .md file
  const scriptPath = writeScriptMarkdown(episode.slug, props);

  // 4. Update DB
  db.episodes.update(episodeId, {
    status: "scripted",
    source_url: sourceUrl ?? null,
    script_path: scriptPath,
    props_json: JSON.stringify(props),
    error: null,
  });

  return { scriptPath, props };
}

// ─── CLI entrypoint ──────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const episodeId = getArg("--episode-id");
  const url = getArg("--url");
  const text = getArg("--text");

  if (!episodeId) {
    console.error("Usage: npx tsx pipeline/script-gen.ts --episode-id <id> [--url <url>] [--text <text>]");
    process.exit(1);
  }

  const sourceType = url?.includes("youtube.com") || url?.includes("youtu.be")
    ? "youtube"
    : url ? "article" : "text";

  generateEpisodeScript({ episodeId, sourceType, sourceUrl: url, sourceText: text })
    .then(({ scriptPath }) => console.log(`✓ Script written to ${scriptPath}`))
    .catch((e) => {
      console.error("✗", e.message);
      // Write error to DB so the dashboard can show it
      try {
        db.episodes.update(episodeId, { status: "failed", error: e.message });
      } catch { /* DB might not be accessible */ }
      process.exit(1);
    });
}
