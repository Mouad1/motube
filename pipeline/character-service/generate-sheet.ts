/**
 * generate-sheet.ts — Worker that generates character sheet images for a
 * single character. Iterates over the requested sheet kinds, calls the
 * configured ImageProvider, persists results into `character_sheets`, and
 * flips character status `sheet_pending` → `ready` (or `failed`).
 *
 * Usage (CLI):
 *   npx tsx pipeline/character-service/generate-sheet.ts --character-id <id>
 *
 *   Optional:
 *     --kinds front,three_quarter,expression_happy   (default: DEFAULT_SHEET_KINDS)
 *     --regenerate                                   (delete existing sheets first)
 *
 * Smoke / offline: FAL_DRY_RUN=1 produces a 1×1 PNG per kind.
 */

import crypto from "crypto";
import { parseArgs } from "node:util";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { db } from "../lib/db.js";
import {
  DEFAULT_SHEET_KINDS,
  CharacterSheetKindSchema,
  type CharacterSheetKind,
} from "../lib/character-schema.js";
import { getImageProvider } from "../lib/providers/image/index.js";
import {
  buildCharacterSheetPrompt,
  buildNegativePrompt,
  deriveSheetSeed,
} from "../lib/prompt-builder.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

interface GenerateOptions {
  characterId: string;
  kinds?: CharacterSheetKind[];
  regenerate?: boolean;
}

export interface GenerateSheetResult {
  characterId: string;
  generated: number;
  failed: number;
  totalCostUsd: number;
  sheetIds: string[];
}

export async function generateCharacterSheet(opts: GenerateOptions): Promise<GenerateSheetResult> {
  const character = db.characters.get(opts.characterId);
  if (!character) throw new Error(`Character ${opts.characterId} not found`);

  const kinds = (opts.kinds && opts.kinds.length > 0 ? opts.kinds : DEFAULT_SHEET_KINDS) as readonly CharacterSheetKind[];

  if (opts.regenerate) {
    db.characterSheets.deleteByCharacter(character.id);
  }

  db.characters.update(character.id, { status: "sheet_pending" });

  const provider = getImageProvider(character.image_provider);
  const sheetIds: string[] = [];
  let totalCost = 0;
  let failed = 0;

  for (const kind of kinds) {
    const prompt = buildCharacterSheetPrompt(character, kind);
    const negativePrompt = buildNegativePrompt(character.negative_prompt);
    const seed = deriveSheetSeed(character.base_seed, kind);
    const basename = `${character.slug}-${kind}-v${character.version}`;

    try {
      const result = await provider.generate({
        prompt,
        negativePrompt,
        seed,
        width: 1024,
        height: 1024,
        references: [],
        providerOptions: { scope: "characters", basename },
      });

      const sheetId = crypto.randomUUID();
      db.characterSheets.create({
        id: sheetId,
        character_id: character.id,
        kind,
        image_path: path.relative(ROOT, result.imagePath),
        prompt_used: prompt,
        seed_used: result.seedUsed,
        version: character.version,
      });
      sheetIds.push(sheetId);
      totalCost += result.costUsd;
      console.log(`[sheet] ${character.slug} ${kind} → ${path.relative(ROOT, result.imagePath)} ($${result.costUsd.toFixed(3)})`);
    } catch (err) {
      failed += 1;
      console.error(`[sheet] FAILED ${character.slug} ${kind}:`, err instanceof Error ? err.message : err);
    }
  }

  const finalStatus = failed === 0 ? "ready" : failed === kinds.length ? "failed" : "ready";
  db.characters.update(character.id, { status: finalStatus });

  console.log(
    `[sheet] done character=${character.slug} generated=${sheetIds.length} failed=${failed} cost=$${totalCost.toFixed(3)}`,
  );

  return {
    characterId: character.id,
    generated: sheetIds.length,
    failed,
    totalCostUsd: totalCost,
    sheetIds,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? "");

if (isDirectRun) {
  const { values } = parseArgs({
    options: {
      "character-id": { type: "string" },
      kinds: { type: "string" },
      regenerate: { type: "boolean", default: false },
    },
    strict: true,
  });

  const characterId = values["character-id"];
  if (!characterId) {
    console.error("Usage: --character-id <id> [--kinds front,side,...] [--regenerate]");
    process.exit(1);
  }

  let kinds: CharacterSheetKind[] | undefined;
  if (values.kinds) {
    kinds = (values.kinds as string)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .map((k) => CharacterSheetKindSchema.parse(k));
  }

  generateCharacterSheet({
    characterId,
    kinds,
    regenerate: values.regenerate as boolean,
  })
    .then((r) => {
      if (r.failed > 0) process.exitCode = 1;
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}
