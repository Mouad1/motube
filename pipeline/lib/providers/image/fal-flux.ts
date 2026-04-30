/**
 * fal-flux.ts — fal.ai Flux image provider (default for Phase 0).
 *
 * REST: POST https://fal.run/{model_id}  with header `Authorization: Key <FAL_KEY>`.
 * Synchronous-ish: returns an `images[].url` once the queue resolves.
 *
 * Env:
 *   FAL_KEY                 (required)
 *   FAL_FLUX_MODEL          default "fal-ai/flux/dev"
 *   FAL_DRY_RUN=1           skip HTTP; emit a 1×1 PNG. Used by smoke tests.
 *
 * Storage: writes to `assets/images/<scope>/<sha>.png` (scope = "characters" or
 * "clips"). Caller passes `providerOptions.scope` + `providerOptions.basename`.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import type { ImageProvider } from "./types.js";
import { ProviderConfigError, ProviderRequestError } from "./types.js";
import type { ImageGenSpec, ImageGenResult } from "../../character-schema.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

const DEFAULT_MODEL = process.env.FAL_FLUX_MODEL ?? "fal-ai/flux/dev";

/** Static price table — update when fal pricing changes. */
const PRICE_USD_PER_IMAGE: Record<string, number> = {
  "fal-ai/flux/dev": 0.025,
  "fal-ai/flux/schnell": 0.003,
  "fal-ai/flux-pro/v1.1": 0.05,
};

interface FalImageResponse {
  images?: Array<{ url: string; width: number; height: number; content_type?: string }>;
  seed?: number;
  timings?: Record<string, number>;
}

export class FalFluxProvider implements ImageProvider {
  readonly name = "fal-flux";

  async generate(spec: ImageGenSpec): Promise<ImageGenResult> {
    const apiKey = process.env.FAL_KEY ?? "";
    const dryRun = process.env.FAL_DRY_RUN === "1";

    if (!apiKey && !dryRun) {
      throw new ProviderConfigError(this.name, "FAL_KEY missing in .env.local");
    }

    const seed = spec.seed ?? Math.floor(Math.random() * 2_147_483_647);
    const scope = (spec.providerOptions?.scope as string) ?? "misc";
    const basename =
      (spec.providerOptions?.basename as string) ??
      crypto.createHash("sha1").update(`${spec.prompt}-${seed}`).digest("hex").slice(0, 16);

    const outDir = path.join(ROOT, "assets", "images", scope);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${basename}.png`);

    if (dryRun) {
      // 1×1 transparent PNG — enough for smoke tests, no network needed.
      const transparentPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
        "base64",
      );
      fs.writeFileSync(outPath, transparentPng);
      return {
        imagePath: outPath,
        seedUsed: seed,
        costUsd: 0,
        providerMeta: { model: DEFAULT_MODEL, dryRun: true },
      };
    }

    const body = {
      prompt: spec.prompt,
      negative_prompt: spec.negativePrompt,
      image_size: { width: spec.width, height: spec.height },
      num_inference_steps: 28,
      seed,
      ...(spec.references.length > 0 ? { image_url: spec.references[0] } : {}),
      ...(spec.providerOptions ?? {}),
    };

    const url = `https://fal.run/${DEFAULT_MODEL}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ProviderRequestError(this.name, `network error calling ${url}`, err);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ProviderRequestError(this.name, `HTTP ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = (await res.json()) as FalImageResponse;
    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) {
      throw new ProviderRequestError(this.name, "response missing images[0].url");
    }

    // Download
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new ProviderRequestError(this.name, `failed to download image: HTTP ${imgRes.status}`);
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(outPath, buf);

    return {
      imagePath: outPath,
      seedUsed: data.seed ?? seed,
      costUsd: PRICE_USD_PER_IMAGE[DEFAULT_MODEL] ?? 0.025,
      providerMeta: { model: DEFAULT_MODEL, timings: data.timings ?? {} },
    };
  }
}
