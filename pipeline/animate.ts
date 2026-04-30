/**
 * animate.ts — Manipulation de fichiers Lottie JSON pour les scènes arabes.
 * Copie une animation de base et injecte les métadonnées spécifiques à la scène.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const LOTTIE_BASE_DIR = path.join(ROOT, "assets", "lottie", "base");
const LOTTIE_EPISODE_DIR = (episodeId: string) =>
  path.join(ROOT, "assets", "lottie", episodeId);

// Available base animations
export const BASE_ANIMATIONS = [
  "geometric-pattern",
] as const;

export type BaseAnimation = typeof BASE_ANIMATIONS[number];

// ─── Types ────────────────────────────────────────────────────────────────────

interface LottieLayer {
  nm?: string;
  ty?: number;
  shapes?: Array<{
    ty?: string;
    c?: { k: number[] };
  }>;
  t?: {
    d?: {
      k?: Array<{ s?: { t?: string } }>;
    };
  };
}

interface LottieData {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm: string;
  layers: LottieLayer[];
}

// ─── Main function ────────────────────────────────────────────────────────────

export interface AnimateSceneOptions {
  episodeId: string;
  sceneIndex: number;
  baseAnimation?: BaseAnimation;
  accentColor?: string; // hex color e.g. "#6ee7b7"
}

export function createSceneLottie(opts: AnimateSceneOptions): string {
  const {
    episodeId,
    sceneIndex,
    baseAnimation = "geometric-pattern",
    accentColor = "#6ee7b7",
  } = opts;

  const basePath = path.join(LOTTIE_BASE_DIR, `${baseAnimation}.json`);
  if (!fs.existsSync(basePath)) {
    throw new Error(`Base animation not found: ${basePath}`);
  }

  const lottieData = JSON.parse(fs.readFileSync(basePath, "utf-8")) as LottieData;

  // Inject accent color into all stroke/fill layers
  const r = parseInt(accentColor.slice(1, 3), 16) / 255;
  const g = parseInt(accentColor.slice(3, 5), 16) / 255;
  const b = parseInt(accentColor.slice(5, 7), 16) / 255;

  lottieData.layers = lottieData.layers.map((layer) => {
    if (layer.shapes) {
      layer.shapes = layer.shapes.map((shape) => {
        if ((shape.ty === "fl" || shape.ty === "st") && shape.c) {
          // Keep original alpha, update RGB
          const alpha = shape.c.k[3] ?? 1;
          shape.c.k = [r, g, b, alpha];
        }
        return shape;
      });
    }
    return layer;
  });

  // Add scene metadata to name
  lottieData.nm = `${baseAnimation}-scene-${sceneIndex}`;

  // Write output
  const outputDir = LOTTIE_EPISODE_DIR(episodeId);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `scene-${sceneIndex}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(lottieData));

  return outputPath;
}

/**
 * Generate Lottie animations for all scenes of an episode.
 * Returns map of scene index → lottie file path.
 */
export function generateEpisodeLotties(
  episodeId: string,
  sceneCount: number,
  accentColor = "#6ee7b7"
): Record<number, string> {
  const paths: Record<number, string> = {};

  for (let i = 0; i < sceneCount; i++) {
    // Cycle through available animations
    const baseAnimation = BASE_ANIMATIONS[i % BASE_ANIMATIONS.length];

    try {
      const lottiePath = createSceneLottie({
        episodeId,
        sceneIndex: i,
        baseAnimation,
        accentColor,
      });
      paths[i] = lottiePath;
    } catch (err) {
      console.warn(`Could not generate Lottie for scene ${i}:`, err);
    }
  }

  return paths;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const episodeId = args[args.indexOf("--episode-id") + 1];
  const sceneCount = parseInt(args[args.indexOf("--scenes") + 1] ?? "5", 10);

  if (!episodeId) {
    console.error("Usage: npx tsx pipeline/animate.ts --episode-id <id> [--scenes N]");
    process.exit(1);
  }

  const paths = generateEpisodeLotties(episodeId, sceneCount);
  Object.entries(paths).forEach(([i, p]) => console.log(`Scene ${i}: ${p}`));
}
