/**
 * Video provider registry.
 */

import { KlingProvider } from "./kling.js";
import type { VideoProvider } from "./types.js";

export type { VideoProvider, VideoGenSpec, VideoGenResult } from "./types.js";
export { ProviderConfigError, ProviderRequestError } from "./types.js";

const REGISTRY: Record<string, () => VideoProvider> = {
  kling: () => new KlingProvider(),
};

export function getVideoProvider(name: string): VideoProvider {
  const factory = REGISTRY[name];
  if (!factory) {
    throw new Error(`Unknown video provider "${name}". Registered: ${Object.keys(REGISTRY).join(", ")}`);
  }
  return factory();
}

export function listVideoProviders(): string[] {
  return Object.keys(REGISTRY);
}
