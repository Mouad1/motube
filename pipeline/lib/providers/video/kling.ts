/**
 * kling.ts — Kling AI image-to-video provider (default for Phase 0).
 *
 * Kling uses an async task pattern:
 *   1. POST /v1/videos/image2video        → { task_id }
 *   2. GET  /v1/videos/image2video/{id}   → { status, video_url? }
 *   3. Download video_url
 *
 * Auth: JWT signed with access_key + secret. Documented at klingai.com/docs.
 *
 * Env:
 *   KLING_ACCESS_KEY        (required)
 *   KLING_SECRET_KEY        (required)
 *   KLING_API_BASE          default "https://api.klingai.com"
 *   KLING_DRY_RUN=1         skip HTTP; emit a 1KB MP4 placeholder.
 *
 * NOTE: Phase 0 ships the dry-run path + structural HTTP skeleton.
 * The JWT signing is intentionally minimal — Phase 3 will replace this
 * with the real Kling SDK or a proper jose-based JWT once we have a
 * sandbox key to test against. For now this guards the interface and
 * proves the orchestration plumbing works.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import type { VideoProvider } from "./types.js";
import { ProviderConfigError, ProviderRequestError } from "./types.js";
import type { VideoGenSpec, VideoGenResult } from "../../character-schema.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

const API_BASE = process.env.KLING_API_BASE ?? "https://api.klingai.com";

/** Static price table (USD per generated second) — update when Kling pricing changes. */
const PRICE_USD_PER_SECOND = 0.07; // Kling Standard ~$0.07/s as of writing

export class KlingProvider implements VideoProvider {
  readonly name = "kling";

  async animate(spec: VideoGenSpec): Promise<VideoGenResult> {
    const accessKey = process.env.KLING_ACCESS_KEY ?? "";
    const secretKey = process.env.KLING_SECRET_KEY ?? "";
    const dryRun = process.env.KLING_DRY_RUN === "1";

    if ((!accessKey || !secretKey) && !dryRun) {
      throw new ProviderConfigError(
        this.name,
        "KLING_ACCESS_KEY and KLING_SECRET_KEY required in .env.local",
      );
    }

    const scope = (spec.providerOptions?.scope as string) ?? "misc";
    const basename =
      (spec.providerOptions?.basename as string) ??
      crypto.createHash("sha1").update(spec.imagePath).digest("hex").slice(0, 16);

    const outDir = path.join(ROOT, "assets", "videos", scope);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${basename}.mp4`);

    if (dryRun) {
      // Minimal valid MP4 placeholder — just bytes; Phase 0 doesn't render it.
      fs.writeFileSync(outPath, Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70])); // "ftyp"
      return {
        videoPath: outPath,
        durationMs: spec.durationMs,
        costUsd: 0,
        providerMeta: { dryRun: true },
      };
    }

    // Phase 3 implementation marker — see TODO at top of file.
    throw new ProviderConfigError(
      this.name,
      "Live Kling integration not implemented yet (Phase 3). Set KLING_DRY_RUN=1 for smoke tests.",
    );
  }
}
