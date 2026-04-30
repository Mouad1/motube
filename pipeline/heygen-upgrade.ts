/**
 * heygen-upgrade.ts — Workaround Avatar 5 (non disponible via API officielle).
 * Stratégie : poll Avatar 4 jusqu'à completed → download → best-effort Playwright upgrade.
 * Supprimer dès qu'Avatar 5 est disponible via API.
 */
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { chromium } from "playwright";
import { db, getDb } from "./lib/db.js";
import { waitForVideo, downloadVideo } from "./lib/heygen.js";
import type { Chunk } from "./chunk-script.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHUNKS_DIR = path.join(ROOT, "data", "chunks");
const HEYGEN_DIR = path.join(ROOT, "assets", "heygen");
const SESSION_FILE = path.join(ROOT, "data", ".heygen-session.json");

export async function upgradeAndDownload(episodeId: string): Promise<void> {
  const chunksPath = path.join(CHUNKS_DIR, `${episodeId}.json`);
  if (!fs.existsSync(chunksPath)) throw new Error("No chunks file found — run chunk-script first");

  const chunks = JSON.parse(fs.readFileSync(chunksPath, "utf-8")) as Chunk[];

  const outputDir = path.join(HEYGEN_DIR, episodeId);
  fs.mkdirSync(outputDir, { recursive: true });

  // ── Phase 1: Poll Avatar 4 status, download MP4s ─────────────────────────
  for (const chunk of chunks) {
    if (!chunk.videoId) {
      console.warn(`[UPGRADE] Chunk ${chunk.index} has no videoId — skipping`);
      continue;
    }
    if (chunk.videoPath && fs.existsSync(path.join(ROOT, chunk.videoPath))) {
      console.log(`[UPGRADE] Chunk ${chunk.index} already downloaded — skipping`);
      continue;
    }

    console.log(`\n[UPGRADE] Waiting for chunk ${chunk.index} (${chunk.videoId})...`);

    let videoUrl: string;
    try {
      videoUrl = await waitForVideo(chunk.videoId);
    } catch (err) {
      console.error(`[UPGRADE] Chunk ${chunk.index} failed: ${(err as Error).message}`);
      continue;
    }

    const outputPath = path.join(outputDir, `chunk-${chunk.index}.mp4`);
    console.log(`[UPGRADE] Downloading chunk ${chunk.index}...`);
    await downloadVideo(videoUrl, outputPath);

    chunk.videoPath = `assets/heygen/${episodeId}/chunk-${chunk.index}.mp4`;
    fs.writeFileSync(chunksPath, JSON.stringify(chunks, null, 2));
    console.log(`  ✓ chunk-${chunk.index}.mp4 saved`);
  }

  // ── Phase 2: Avatar 5 Playwright upgrade (best-effort) ───────────────────
  const needsUpgrade = chunks.filter(c => c.videoId && c.videoPath);
  if (needsUpgrade.length > 0) {
    console.log(`\n[UPGRADE] Attempting Avatar 5 upgrade for ${needsUpgrade.length} chunks via Playwright...`);
    await runPlaywrightUpgrade(episodeId, chunks);
  }

  // ── Mark done ────────────────────────────────────────────────────────────
  const allDownloaded = chunks.every(c => !c.videoId || c.videoPath);
  if (allDownloaded) {
    getDb().prepare("UPDATE episodes SET status = 'heygen_done' WHERE id = ?").run(episodeId);
    console.log(`\n✓ All chunks downloaded → status: heygen_done`);
  } else {
    const missing = chunks.filter(c => c.videoId && !c.videoPath).length;
    console.warn(`\n⚠ ${missing} chunks still missing — check HeyGen dashboard`);
  }
}

async function runPlaywrightUpgrade(
  episodeId: string,
  chunks: Chunk[]
): Promise<void> {
  const storageState = fs.existsSync(SESSION_FILE) ? SESSION_FILE : undefined;

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  try {
    await page.goto("https://app.heygen.com/videos");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // If login needed, wait for user to complete it
    if (page.url().includes("/login") || page.url().includes("/signin")) {
      console.log("[PLAYWRIGHT] Login required — complete login in the browser window...");
      await page.waitForURL("**/videos", { timeout: 120_000 });
    }

    // Persist session for next run
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    await context.storageState({ path: SESSION_FILE });

    for (const chunk of chunks) {
      if (!chunk.videoId) continue;

      console.log(`  [PLAYWRIGHT] Attempting Avatar 5 upgrade for chunk ${chunk.index}...`);
      try {
        await page.goto(`https://app.heygen.com/videos/${chunk.videoId}`);
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

        const upgradeBtn = page.locator("button:has-text('Avatar 5'), button:has-text('Upgrade')").first();
        if (await upgradeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await upgradeBtn.click();
          const confirmBtn = page.locator("button:has-text('Confirm'), button:has-text('Upgrade now')").first();
          if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await confirmBtn.click();
          }
          console.log(`    ✓ Upgrade triggered for chunk ${chunk.index}`);
        } else {
          console.log(`    No upgrade button found for chunk ${chunk.index} — already Avatar 5 or not available`);
        }
      } catch (e) {
        console.warn(`    ✗ Playwright upgrade failed for chunk ${chunk.index}: ${(e as Error).message}`);
      }
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const episodeId = args[args.indexOf("--episode-id") + 1];

  if (!episodeId) {
    console.error("Usage: npx tsx pipeline/heygen-upgrade.ts --episode-id <id>");
    process.exit(1);
  }

  upgradeAndDownload(episodeId)
    .catch(e => { console.error("✗", e.message); process.exit(1); });
}
