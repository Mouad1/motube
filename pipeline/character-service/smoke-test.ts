/**
 * smoke-test.ts — Phase 0 verification script.
 *
 * Runs OFFLINE (FAL_DRY_RUN=1, KLING_DRY_RUN=1). Proves the new tables,
 * Zod schemas, provider registry, and cost tracker all wire together.
 *
 * Usage:
 *   FAL_DRY_RUN=1 KLING_DRY_RUN=1 npx tsx pipeline/character-service/smoke-test.ts
 *
 * Idempotent: drops & recreates the test character + episode + clip on each run.
 */

import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { db, getDb } from "../lib/db.js";
import { CharacterCreateSchema, ClipSpecSchema } from "../lib/character-schema.js";
import { getImageProvider } from "../lib/providers/image/index.js";
import { getVideoProvider } from "../lib/providers/video/index.js";
import { trackClipCost } from "../lib/cost-tracker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const TEST_CHARACTER_SLUG = "smoke-test-character";
const TEST_EPISODE_ID = "smoke-test-episode";

function step(label: string, ok: boolean, detail = "") {
  const mark = ok ? "✅" : "❌";
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  console.log("\n── Phase 0 smoke test ─────────────────────────────────────────\n");

  // 1. DB migration runs
  getDb();
  step("DB initialised + new tables migrated", true);

  // 2. Cleanup previous run
  const existing = db.characters.getBySlug(TEST_CHARACTER_SLUG);
  if (existing) db.characters.delete(existing.id);
  getDb().prepare("DELETE FROM episodes WHERE id = ?").run(TEST_EPISODE_ID);
  step("Cleanup previous smoke-test rows", true);

  // 3. Zod validates a CharacterCreate payload
  const created = CharacterCreateSchema.parse({
    name: "Smoke Test Character",
    slug: TEST_CHARACTER_SLUG,
    description: "Throwaway character for Phase 0 smoke test.",
    style_prompt: "2D illustrated cartoon, clean line art, friendly face",
    base_seed: 42,
  });
  step("CharacterCreateSchema parses payload", true);

  // 4. Insert character
  const characterId = crypto.randomUUID();
  db.characters.create({
    id: characterId,
    slug: created.slug,
    name: created.name,
    description: created.description ?? null,
    style_prompt: created.style_prompt,
    negative_prompt: created.negative_prompt ?? null,
    base_seed: created.base_seed,
    image_provider: created.image_provider,
    video_provider: created.video_provider,
    lora_ref: created.lora_ref ?? null,
    version: 1,
    status: "draft",
  });
  const fetched = db.characters.get(characterId);
  step("Insert + fetch character round-trip", fetched !== null && fetched.slug === TEST_CHARACTER_SLUG);

  // 5. Image provider produces a file (dry-run)
  const imageProvider = getImageProvider("fal-flux");
  const imgResult = await imageProvider.generate({
    prompt: "smoke test portrait",
    width: 1024,
    height: 1024,
    references: [],
    seed: 42,
    providerOptions: { scope: "characters", basename: `${TEST_CHARACTER_SLUG}-front` },
  });
  step(
    "ImageProvider (fal-flux) dry-run wrote PNG",
    fs.existsSync(imgResult.imagePath),
    path.relative(ROOT, imgResult.imagePath),
  );

  // 6. Persist as character_sheet
  const sheetId = crypto.randomUUID();
  db.characterSheets.create({
    id: sheetId,
    character_id: characterId,
    kind: "front",
    image_path: imgResult.imagePath,
    prompt_used: "smoke test portrait",
    seed_used: imgResult.seedUsed,
    version: 1,
  });
  const sheets = db.characterSheets.listByCharacter(characterId);
  step("Insert character_sheet + list by character", sheets.length === 1);

  // 7. Insert a fake episode + clip
  db.episodes.create({
    id: TEST_EPISODE_ID,
    slug: "smoke-test-episode",
    title: "Smoke Test Episode",
    template: "concept",
    language: "en",
    source_type: null,
    source_url: null,
    status: "draft",
    script_path: null,
    audio_path: null,
    video_path: null,
    props_json: null,
    seo_json: null,
    error: null,
    heygen_video_ids: null,
  });
  const clipSpec = ClipSpecSchema.parse({
    episode_id: TEST_EPISODE_ID,
    scene_index: 0,
    character_ids: [characterId],
    image_prompt: "smoke test scene",
    motion_prompt: "subtle camera push-in",
    duration_ms: 3000,
  });
  const clipId = crypto.randomUUID();
  db.clips.create({
    id: clipId,
    episode_id: clipSpec.episode_id,
    scene_index: clipSpec.scene_index,
    character_ids_json: JSON.stringify(clipSpec.character_ids),
    image_prompt: clipSpec.image_prompt,
    motion_prompt: clipSpec.motion_prompt ?? null,
    duration_ms: clipSpec.duration_ms,
    audio_segment_path: null,
    image_path: null,
    video_path: null,
    image_provider: "fal-flux",
    video_provider: "kling",
    status: "pending",
    error: null,
    cost_usd: 0,
  });
  step("Insert clip", db.clips.get(clipId) !== null);

  // 8. Image provider for clip + cost tracking
  const clipImg = await imageProvider.generate({
    prompt: "smoke test scene",
    width: 1024,
    height: 1024,
    references: [imgResult.imagePath],
    seed: 100,
    providerOptions: { scope: "clips", basename: clipId },
  });
  db.clips.update(clipId, { image_path: clipImg.imagePath, status: "image_ready" });
  trackClipCost({ clipId, provider: "fal-flux", stage: "image", amountUsd: 0.025 });
  step("Clip image generated + cost tracked", db.clips.get(clipId)?.cost_usd === 0.025);

  // 9. Video provider dry-run
  const videoProvider = getVideoProvider("kling");
  const vid = await videoProvider.animate({
    imagePath: clipImg.imagePath,
    motionPrompt: clipSpec.motion_prompt,
    durationMs: clipSpec.duration_ms,
    aspectRatio: "16:9",
    providerOptions: { scope: "clips", basename: clipId },
  });
  db.clips.update(clipId, { video_path: vid.videoPath, status: "video_ready" });
  trackClipCost({ clipId, provider: "kling", stage: "video", amountUsd: 0.21 });
  step(
    "VideoProvider (kling) dry-run produced placeholder",
    fs.existsSync(vid.videoPath),
    path.relative(ROOT, vid.videoPath),
  );

  const finalClip = db.clips.get(clipId);
  step(
    "Final clip status + cost",
    finalClip?.status === "video_ready" && Math.abs((finalClip?.cost_usd ?? 0) - 0.235) < 1e-6,
    `status=${finalClip?.status} cost=$${finalClip?.cost_usd.toFixed(3)}`,
  );

  console.log("\n── done ───────────────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n❌ smoke test threw:", err);
  process.exitCode = 1;
});
