/**
 * create.ts — CLI to create a character row.
 *
 * Usage:
 *   npx tsx pipeline/character-service/create.ts \
 *     --slug "sara" \
 *     --name "Sara" \
 *     --style "young Moroccan teacher, illustrated 2D cartoon, warm tones, friendly face" \
 *     [--description "..."] \
 *     [--negative "realistic, photorealistic"] \
 *     [--seed 42] \
 *     [--image-provider fal-flux] \
 *     [--video-provider kling] \
 *     [--generate-sheet]               # immediately generate the default sheet
 */

import crypto from "crypto";
import { parseArgs } from "node:util";
import dotenv from "dotenv";

import { db } from "../lib/db.js";
import { CharacterCreateSchema } from "../lib/character-schema.js";
import { generateCharacterSheet } from "./generate-sheet.js";

dotenv.config({ path: ".env.local" });

interface CreateOptions {
  slug: string;
  name: string;
  style: string;
  description?: string;
  negative?: string;
  seed?: number;
  imageProvider?: string;
  videoProvider?: string;
  generateSheet?: boolean;
}

export async function createCharacter(opts: CreateOptions): Promise<string> {
  const existing = db.characters.getBySlug(opts.slug);
  if (existing) {
    throw new Error(`Character with slug "${opts.slug}" already exists (id=${existing.id})`);
  }

  const seed = opts.seed ?? Math.floor(Math.random() * 2_000_000_000);

  const validated = CharacterCreateSchema.parse({
    name: opts.name,
    slug: opts.slug,
    description: opts.description,
    style_prompt: opts.style,
    negative_prompt: opts.negative,
    base_seed: seed,
    image_provider: opts.imageProvider ?? "fal-flux",
    video_provider: opts.videoProvider ?? "kling",
  });

  const id = crypto.randomUUID();
  db.characters.create({
    id,
    slug: validated.slug,
    name: validated.name,
    description: validated.description ?? null,
    style_prompt: validated.style_prompt,
    negative_prompt: validated.negative_prompt ?? null,
    base_seed: validated.base_seed,
    image_provider: validated.image_provider,
    video_provider: validated.video_provider,
    lora_ref: validated.lora_ref ?? null,
    version: 1,
    status: "draft",
  });

  console.log(`[create] character ${validated.slug} (id=${id}) seed=${seed} provider=${validated.image_provider}`);

  if (opts.generateSheet) {
    await generateCharacterSheet({ characterId: id });
  }

  return id;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? "");

if (isDirectRun) {
  const { values } = parseArgs({
    options: {
      slug: { type: "string" },
      name: { type: "string" },
      style: { type: "string" },
      description: { type: "string" },
      negative: { type: "string" },
      seed: { type: "string" },
      "image-provider": { type: "string" },
      "video-provider": { type: "string" },
      "generate-sheet": { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values.slug || !values.name || !values.style) {
    console.error("Usage: --slug <slug> --name <name> --style <prompt> [--description] [--negative] [--seed] [--generate-sheet]");
    process.exit(1);
  }

  createCharacter({
    slug: values.slug as string,
    name: values.name as string,
    style: values.style as string,
    description: values.description as string | undefined,
    negative: values.negative as string | undefined,
    seed: values.seed ? parseInt(values.seed as string, 10) : undefined,
    imageProvider: values["image-provider"] as string | undefined,
    videoProvider: values["video-provider"] as string | undefined,
    generateSheet: values["generate-sheet"] as boolean,
  })
    .then((id) => {
      console.log(id);
    })
    .catch((err) => {
      console.error(err.message ?? err);
      process.exitCode = 1;
    });
}
