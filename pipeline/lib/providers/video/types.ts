/**
 * Video provider interface (image-to-video).
 *
 * Concrete providers (kling, runway, luma, animatediff-comfy) implement
 * `VideoProvider`. Pipeline code depends only on this interface.
 */

import type { VideoGenSpec, VideoGenResult } from "../../character-schema.js";

export interface VideoProvider {
  readonly name: string;
  /** Animate a still image into a short clip. */
  animate(spec: VideoGenSpec): Promise<VideoGenResult>;
}

export type { VideoGenSpec, VideoGenResult };

export { ProviderConfigError, ProviderRequestError } from "../image/types.js";
