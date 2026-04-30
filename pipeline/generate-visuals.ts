/**
 * generate-visuals.ts — Generates one AI image per scene via Gemini.
 * Images are saved to assets/images/{episodeId}/scene-{i}.png
 * and stored as imagePath in each scene's data in props_json.
 *
 * Usage: npx tsx pipeline/generate-visuals.ts --episode-id <id>
 */

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, getDb } from "./lib/db.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "assets", "images");
const IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";

// ─── Gemini image generation client ──────────────────────────────────────────

function getGenAI(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!key) throw new Error("GEMINI_API_KEY not set in .env.local");
  return new GoogleGenerativeAI(key);
}

// ─── Build prompt per scene type ─────────────────────────────────────────────

interface SceneData {
  [key: string]: unknown;
}

function buildImagePrompt(type: string, data: SceneData, episodeTitle: string): string | null {
  const base = `Create a clean, modern, dark-themed educational illustration for a tech video. Dark background (#0d0d0d to #1a1a2e). Style: sleek, minimalist, glowing accents in teal (#6ee7b7) or purple. No text overlay. High quality, 16:9 aspect ratio.`;

  switch (type) {
    case "title":
      return `${base} Abstract concept art representing: "${data.title ?? episodeTitle}". Futuristic, inspiring, neural network or code visualization style.`;
    case "concept":
      return `${base} Visual metaphor for the concept: "${data.heading}". Abstract geometric shapes, flowing data streams.`;
    case "code":
      return `${base} Abstract representation of programming: "${data.explanation ?? data.heading ?? "code"}". Matrix-style particles, circuit board patterns.`;
    case "bullet_points":
      return `${base} Abstract background for a list about: "${data.heading}". Subtle grid pattern with glowing nodes.`;
    case "diagram":
      return `${base} Abstract network diagram background for: "${data.heading}". Interconnected nodes, data flow visualization.`;
    case "transition":
      return `${base} Smooth abstract transition art. Gradient flow, particle field, dark to dark with teal glow.`;
    case "hook":
      return `${base} Attention-grabbing abstract visual for: "${data.headline}". Bold, dynamic, energetic composition.`;
    case "point":
      return `${base} Minimal abstract background for a point about: "${data.text}". Clean geometric accent.`;
    default:
      return null;
  }
}

// ─── Generate a single image ──────────────────────────────────────────────────

async function generateSceneImage(prompt: string, outputPath: string): Promise<void> {
  const genai = getGenAI();
  const model = genai.getGenerativeModel({ model: IMAGE_MODEL });

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generationConfig: { responseModalities: ["IMAGE"] } as any,
      });

      const parts = response.response.candidates?.[0]?.content?.parts ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

      if (!imagePart?.inlineData?.data) {
        throw new Error("No image data in Gemini response");
      }

      const buffer = Buffer.from(imagePart.inlineData.data, "base64");
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, buffer);
      return;
    } catch (err: unknown) {
      attempts++;
      if (attempts >= 3) throw err;
      const delay = attempts * 2000;
      console.warn(`  Image attempt ${attempts} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ─── Main function ────────────────────────────────────────────────────────────

export interface GenerateVisualsOptions {
  episodeId: string;
  translationId?: string;
  overwrite?: boolean; // regenerate even if image already exists
}

export interface GenerateVisualsResult {
  generated: number;
  skipped: number;
  failed: number;
}

export async function generateEpisodeVisuals(opts: GenerateVisualsOptions): Promise<GenerateVisualsResult> {
  const { episodeId, translationId, overwrite = false } = opts;

  const episode = db.episodes.get(episodeId);
  if (!episode) throw new Error(`Episode ${episodeId} not found`);

  const propsJson = translationId
    ? (getDb().prepare("SELECT props_json FROM translations WHERE id = ?").get(translationId) as { props_json: string | null } | null)?.props_json
    : episode.props_json;

  if (!propsJson) throw new Error("No props_json — generate script first");

  const props = JSON.parse(propsJson) as { title: string; scenes: Array<{ type: string; data: SceneData; durationInFrames?: number }> };
  const outputDir = path.join(IMAGES_DIR, episodeId);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < props.scenes.length; i++) {
    const scene = props.scenes[i];
    const outputPath = path.join(outputDir, `scene-${i}.png`);

    // Skip if already exists and overwrite is false
    if (!overwrite && fs.existsSync(outputPath)) {
      scene.data.imagePath = `assets/images/${episodeId}/scene-${i}.png`;
      skipped++;
      continue;
    }

    const prompt = buildImagePrompt(scene.type, scene.data, props.title);
    if (!prompt) {
      skipped++;
      continue;
    }

    console.log(`Generating image for scene ${i + 1}/${props.scenes.length} (type: ${scene.type})...`);

    try {
      await generateSceneImage(prompt, outputPath);
      scene.data.imagePath = `assets/images/${episodeId}/scene-${i}.png`;
      generated++;
      console.log(`  ✓ scene-${i}.png`);
    } catch (err: unknown) {
      console.warn(`  ✗ scene ${i} failed: ${err instanceof Error ? err.message : err}`);
      failed++;
    }

    // Rate limit delay between scenes
    if (i < props.scenes.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Persist updated props_json
  const updatedPropsJson = JSON.stringify(props);
  if (!translationId) {
    getDb().prepare("UPDATE episodes SET props_json = ? WHERE id = ?").run(updatedPropsJson, episodeId);
  } else {
    getDb().prepare("UPDATE translations SET props_json = ? WHERE id = ?").run(updatedPropsJson, translationId);
  }

  return { generated, skipped, failed };
}

// ─── CLI entrypoint ──────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const episodeId = getArg("--episode-id");
  const overwrite = args.includes("--overwrite");

  if (!episodeId) {
    console.error("Usage: npx tsx pipeline/generate-visuals.ts --episode-id <id> [--overwrite]");
    process.exit(1);
  }

  generateEpisodeVisuals({ episodeId, overwrite })
    .then(({ generated, skipped, failed }) => {
      console.log(`✓ Done: ${generated} generated, ${skipped} skipped, ${failed} failed`);
    })
    .catch((e: unknown) => {
      console.error("✗", e instanceof Error ? e.message : e);
      try {
        db.episodes.update(episodeId, { status: "failed", error: (e as Error).message });
      } catch { /* ignore */ }
      process.exit(1);
    });
}
