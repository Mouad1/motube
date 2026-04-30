/**
 * Image provider interface.
 *
 * Concrete providers (fal-flux, replicate-flux, comfyui, ...) implement
 * `ImageProvider` so the rest of the pipeline only depends on this contract.
 *
 * Adding a new provider = create a new file in this folder + register it
 * in `index.ts`. No callers change.
 */

import type { ImageGenSpec, ImageGenResult } from "../../character-schema.js";

export interface ImageProvider {
  /** Stable identifier stored in DB rows (e.g. "fal-flux"). */
  readonly name: string;

  /** Generate one image. Implementations MUST honour `spec.seed` for determinism. */
  generate(spec: ImageGenSpec): Promise<ImageGenResult>;
}

export type { ImageGenSpec, ImageGenResult };

/** Marker thrown by providers when credentials are missing. Never swallow it. */
export class ProviderConfigError extends Error {
  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderConfigError";
  }
}

/** Marker thrown for provider runtime failures (HTTP errors, timeouts, ...). */
export class ProviderRequestError extends Error {
  constructor(provider: string, message: string, public readonly cause?: unknown) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderRequestError";
  }
}
