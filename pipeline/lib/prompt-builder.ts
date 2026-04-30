/**
 * prompt-builder.ts — Pure functions that turn structured inputs into
 * provider-ready prompts. NO side effects, NO IO. Easy to unit test, easy to
 * A/B test prompt quality.
 *
 * Phase 1 covers character-sheet prompts. Phase 2 will add clip prompts.
 */

import type { Character } from "./db.js";
import type { CharacterSheetKind } from "./character-schema.js";

/** Per-kind framing instructions appended to the character's `style_prompt`. */
const KIND_INSTRUCTIONS: Record<CharacterSheetKind, string> = {
  front:
    "front-facing full-body portrait, character centered, neutral pose, arms relaxed, plain off-white background, even soft studio lighting",
  three_quarter:
    "three-quarter view full-body portrait, character turned 45 degrees, neutral pose, plain off-white background, even soft studio lighting",
  side:
    "side profile full-body portrait, character facing left, neutral pose, plain off-white background, even soft studio lighting",
  expression_neutral:
    "head-and-shoulders close-up, neutral calm expression, eyes forward, plain off-white background, even soft studio lighting",
  expression_happy:
    "head-and-shoulders close-up, warm genuine smile, eyes slightly squinted with joy, plain off-white background, even soft studio lighting",
  expression_sad:
    "head-and-shoulders close-up, soft sad expression, downturned mouth, eyes lowered, plain off-white background, even soft studio lighting",
  expression_angry:
    "head-and-shoulders close-up, frustrated expression, furrowed brow, mouth set, plain off-white background, even soft studio lighting",
  expression_surprised:
    "head-and-shoulders close-up, surprised expression, raised eyebrows, mouth slightly open, plain off-white background, even soft studio lighting",
  pose_idle:
    "full-body shot, idle standing pose, weight on one leg, hands relaxed at sides, plain off-white background, even soft studio lighting",
  pose_walk:
    "full-body shot, mid-stride walking pose, one foot forward, natural arm swing, plain off-white background, even soft studio lighting",
  pose_run:
    "full-body shot, dynamic running pose, both feet off the ground, arms pumping, plain off-white background, even soft studio lighting",
};

/**
 * Style anchor appended to every sheet prompt to keep visual consistency.
 * The character.style_prompt carries the unique DNA; this string standardises
 * the framing language across kinds so consistency depends on style_prompt
 * + seed alone.
 */
const COMMON_STYLE_ANCHOR =
  "consistent character design, clean line art, flat shading, full character visible, no text, no watermark, no border, no extra characters";

/** Build the image prompt for a single sheet kind. Pure. */
export function buildCharacterSheetPrompt(
  character: Pick<Character, "name" | "style_prompt">,
  kind: CharacterSheetKind,
): string {
  const framing = KIND_INSTRUCTIONS[kind];
  return [
    character.style_prompt.trim(),
    framing,
    COMMON_STYLE_ANCHOR,
  ].join(", ");
}

/** Negative prompt augmenter — combines character's negative_prompt with universal anti-patterns. */
export function buildNegativePrompt(characterNegative: string | null | undefined): string {
  const universal = [
    "blurry",
    "low quality",
    "distorted face",
    "extra limbs",
    "extra fingers",
    "deformed hands",
    "text",
    "watermark",
    "signature",
    "multiple characters",
    "duplicate",
  ].join(", ");
  if (!characterNegative) return universal;
  return `${characterNegative.trim()}, ${universal}`;
}

/**
 * Deterministic per-sheet seed derivation: same character + same kind →
 * same seed. Lets us re-run a single sheet without affecting the others.
 */
export function deriveSheetSeed(baseSeed: number, kind: CharacterSheetKind): number {
  // Tiny hash of kind name — stable, no crypto needed.
  let h = 0;
  for (let i = 0; i < kind.length; i++) {
    h = (h * 31 + kind.charCodeAt(i)) >>> 0;
  }
  return (baseSeed + h) >>> 0; // keep 32-bit unsigned
}
