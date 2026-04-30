/**
 * schema.ts — Zod validation schemas for episode script JSON.
 * Used by render.ts, tts.ts, and script-gen.ts to validate input props.
 */

import { z } from "zod";

// ─── Per-scene schemas ────────────────────────────────────────────────────────

const TitleSceneSchema = z.object({
  type: z.literal("title"),
  data: z.object({
    title: z.string().min(1, "title is required"),
    subtitle: z.string().optional(),
    audioPath: z.string().optional(),
  }),
  durationInFrames: z.number().int().positive().optional(),
});

const CodeSceneSchema = z.object({
  type: z.literal("code"),
  data: z.object({
    code: z.string().min(1, "code is required"),
    language: z.string().min(1, "language is required"),
    explanation: z.string().min(1, "explanation is required"),
    audioPath: z.string().optional(),
  }),
  durationInFrames: z.number().int().positive().optional(),
});

const ConceptSceneSchema = z.object({
  type: z.literal("concept"),
  data: z.object({
    heading: z.string().min(1, "heading is required"),
    body: z.string().min(1, "body is required"),
    visual: z.string().optional(),
    audioPath: z.string().optional(),
  }),
  durationInFrames: z.number().int().positive().optional(),
});

const TransitionSceneSchema = z.object({
  type: z.literal("transition"),
  data: z.object({
    text: z.string().min(1, "text is required"),
    audioPath: z.string().optional(),
  }),
  durationInFrames: z.number().int().positive().optional(),
});

const BulletPointSceneSchema = z.object({
  type: z.literal("bullet_points"),
  data: z.object({
    heading: z.string().min(1, "heading is required"),
    bullets: z
      .array(
        z.object({
          text: z.string().min(1, "bullet text is required"),
          icon: z.string().optional(),
        })
      )
      .min(1, "at least one bullet is required")
      .max(8, "max 8 bullets per scene for readability"),
    audioPath: z.string().optional(),
  }),
  durationInFrames: z.number().int().positive().optional(),
});

const DiagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  color: z.string().optional(),
});

const DiagramEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

const DiagramSceneSchema = z.object({
  type: z.literal("diagram"),
  data: z.object({
    heading: z.string().min(1, "heading is required"),
    nodes: z.array(DiagramNodeSchema).min(1, "at least one node required"),
    edges: z.array(DiagramEdgeSchema),
    caption: z.string().optional(),
    audioPath: z.string().optional(),
  }),
  durationInFrames: z.number().int().positive().optional(),
});

const WalkthroughStepSchema = z.object({
  highlightLines: z
    .array(z.number().int().positive())
    .min(1, "at least one line must be highlighted"),
  explanation: z.string().min(1, "explanation is required"),
});

const CodeWalkthroughSchema = z.object({
  type: z.literal("code_walkthrough"),
  data: z.object({
    code: z.string().min(1, "code is required"),
    language: z.string().min(1, "language is required"),
    steps: z.array(WalkthroughStepSchema).min(1, "at least one step required"),
    audioPath: z.string().optional(),
  }),
  durationInFrames: z.number().int().positive().optional(),
});

// ─── Union of all scene types ─────────────────────────────────────────────────

export const SceneSchema = z.discriminatedUnion("type", [
  TitleSceneSchema,
  CodeSceneSchema,
  ConceptSceneSchema,
  TransitionSceneSchema,
  BulletPointSceneSchema,
  DiagramSceneSchema,
  CodeWalkthroughSchema,
]);

export type ValidatedScene = z.infer<typeof SceneSchema>;

// ─── Full episode props schema ────────────────────────────────────────────────

export const EpisodePropsSchema = z.object({
  title: z.string().min(1, "episode title is required"),
  scenes: z
    .array(SceneSchema)
    .min(1, "at least one scene required")
    .max(30, "max 30 scenes per episode"),
});

export type ValidatedEpisodeProps = z.infer<typeof EpisodePropsSchema>;

// ─── Validation helper ────────────────────────────────────────────────────────

export type ValidationResult =
  | { success: true; data: ValidatedEpisodeProps }
  | { success: false; errors: Array<{ path: string; message: string }> };

export function validateEpisodeProps(raw: unknown): ValidationResult {
  const result = EpisodePropsSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return { success: false, errors };
}

export function assertValidEpisodeProps(raw: unknown, context = "script"): ValidatedEpisodeProps {
  const result = validateEpisodeProps(raw);
  if (!result.success) {
    const formatted = result.errors
      .map((e) => `  • ${e.path || "root"}: ${e.message}`)
      .join("\n");
    throw new Error(
      `[Schema] Invalid ${context} props:\n${formatted}`
    );
  }
  return result.data;
}
