/**
 * Image provider registry.
 *
 * Pipeline code calls `getImageProvider(name)` — never instantiates concrete
 * providers directly. To add a new provider, import + register it here.
 */

import { FalFluxProvider } from "./fal-flux.js";
import type { ImageProvider } from "./types.js";

export type { ImageProvider, ImageGenSpec, ImageGenResult } from "./types.js";
export { ProviderConfigError, ProviderRequestError } from "./types.js";

const REGISTRY: Record<string, () => ImageProvider> = {
  "fal-flux": () => new FalFluxProvider(),
};

export function getImageProvider(name: string): ImageProvider {
  const factory = REGISTRY[name];
  if (!factory) {
    throw new Error(`Unknown image provider "${name}". Registered: ${Object.keys(REGISTRY).join(", ")}`);
  }
  return factory();
}

export function listImageProviders(): string[] {
  return Object.keys(REGISTRY);
}
