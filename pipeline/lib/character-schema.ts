/**
 * character-schema.ts — Zod validation for the character-driven pipeline (Phase 0).
 *
 * Kept separate from schema.ts (which is Remotion-scene focused) so the two
 * domains can evolve independently.
 */

import { z } from "zod";

// ─── Characters ───────────────────────────────────────────────────────────────

export const CharacterStatusSchema = z.enum(["draft", "sheet_pending", "ready", "failed"]);

export const CharacterCreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(2000).optional(),
  style_prompt: z.string().min(10).max(2000),
  negative_prompt: z.string().max(1000).optional(),
  base_seed: z.number().int().nonnegative().max(2_147_483_647),
  image_provider: z.string().min(1).default("fal-flux"),
  video_provider: z.string().min(1).default("kling"),
  lora_ref: z.string().max(500).optional(),
});

export type CharacterCreate = z.infer<typeof CharacterCreateSchema>;

// ─── Character sheets ─────────────────────────────────────────────────────────

export const CharacterSheetKindSchema = z.enum([
  "front",
  "side",
  "three_quarter",
  "expression_neutral",
  "expression_happy",
  "expression_sad",
  "expression_angry",
  "expression_surprised",
  "pose_idle",
  "pose_walk",
  "pose_run",
]);

export type CharacterSheetKind = z.infer<typeof CharacterSheetKindSchema>;

/**
 * Default sheet generated for every character on creation.
 * Order matters — first three are reference images for clip generation.
 */
export const DEFAULT_SHEET_KINDS: readonly CharacterSheetKind[] = [
  "front",
  "three_quarter",
  "side",
  "expression_neutral",
  "expression_happy",
  "expression_sad",
  "expression_surprised",
] as const;

// ─── Story templates ──────────────────────────────────────────────────────────

const StoryBeatSchema = z.object({
  role: z.string().min(1),
  description: z.string().min(1).max(500),
  duration_seconds: z.number().int().positive().max(60),
});

export const StoryTemplateStructureSchema = z.object({
  beats: z.array(StoryBeatSchema).min(1).max(20),
  total_target_seconds: z.number().int().positive().max(600),
});

export type StoryTemplateStructure = z.infer<typeof StoryTemplateStructureSchema>;

export const StoryTemplateCreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  description: z.string().max(2000).optional(),
  structure: StoryTemplateStructureSchema,
  language: z.string().min(2).max(10).default("en"),
  format: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
});

export type StoryTemplateCreate = z.infer<typeof StoryTemplateCreateSchema>;

// ─── Clips ────────────────────────────────────────────────────────────────────

export const ClipStatusSchema = z.enum(["pending", "image_ready", "video_ready", "failed"]);

export const ClipSpecSchema = z.object({
  episode_id: z.string().min(1),
  scene_index: z.number().int().nonnegative(),
  character_ids: z.array(z.string()).default([]),
  image_prompt: z.string().min(5).max(4000),
  motion_prompt: z.string().max(2000).optional(),
  duration_ms: z.number().int().min(500).max(10_000),
  audio_segment_path: z.string().optional(),
  image_provider: z.string().optional(),
  video_provider: z.string().optional(),
});

export type ClipSpec = z.infer<typeof ClipSpecSchema>;

// ─── Provider job specs (used by image/video providers) ───────────────────────

export const ImageGenSpecSchema = z.object({
  prompt: z.string().min(1).max(4000),
  negativePrompt: z.string().max(2000).optional(),
  seed: z.number().int().nonnegative().optional(),
  width: z.number().int().min(64).max(4096).default(1024),
  height: z.number().int().min(64).max(4096).default(1024),
  /** URLs or local paths to reference images for character consistency. */
  references: z.array(z.string()).max(10).default([]),
  /** Provider-specific overrides forwarded as-is. */
  providerOptions: z.record(z.string(), z.unknown()).optional(),
});

export type ImageGenSpec = z.infer<typeof ImageGenSpecSchema>;

export const VideoGenSpecSchema = z.object({
  imagePath: z.string().min(1),
  motionPrompt: z.string().max(2000).optional(),
  durationMs: z.number().int().min(500).max(10_000),
  seed: z.number().int().nonnegative().optional(),
  /** Aspect ratio hint for providers that need it. */
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  providerOptions: z.record(z.string(), z.unknown()).optional(),
});

export type VideoGenSpec = z.infer<typeof VideoGenSpecSchema>;

// ─── Provider results ─────────────────────────────────────────────────────────

export interface ImageGenResult {
  imagePath: string;
  seedUsed: number;
  costUsd: number;
  providerMeta: Record<string, unknown>;
}

export interface VideoGenResult {
  videoPath: string;
  durationMs: number;
  costUsd: number;
  providerMeta: Record<string, unknown>;
}
