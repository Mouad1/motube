/**
 * workers.ts — Entry point BullMQ workers.
 * Démarre les 3 workers (render, tts, publish) en parallèle.
 * Usage: npx tsx pipeline/workers.ts
 */

import { Worker } from "bullmq";
import dotenv from "dotenv";
import {
  createRedisConnection,
  QUEUE_NAMES,
  type RenderJobData,
  type TtsJobData,
  type PublishJobData,
} from "./lib/queue.js";
import { db } from "./lib/db.js";

dotenv.config({ path: ".env.local" });

console.log("🚀 Starting motube workers...");

// ─── Render worker ────────────────────────────────────────────────────────────

const renderWorker = new Worker<RenderJobData>(
  QUEUE_NAMES.RENDER,
  async (job) => {
    const { episodeId, quality, translationId } = job.data;
    console.log(`[render] Processing episode ${episodeId} (${quality})`);

    // Dynamic import to avoid loading Remotion at startup
    const { renderEpisode } = await import("./render.js");

    await renderEpisode({
      episodeId,
      quality,
      translationId,
      onProgress: (pct) => job.updateProgress(pct),
    });

    return { episodeId, quality };
  },
  {
    connection: createRedisConnection(),
    concurrency: 1, // Render is CPU-intensive — one at a time
  }
);

renderWorker.on("completed", (job) => {
  console.log(`[render] ✓ Job ${job.id} completed`);
});

renderWorker.on("failed", (job, err) => {
  console.error(`[render] ✗ Job ${job?.id} failed:`, err.message);
  if (job?.data?.episodeId) {
    db.episodes.update(job.data.episodeId, { status: "failed", error: err.message });
  }
});

// ─── TTS worker ──────────────────────────────────────────────────────────────

const ttsWorker = new Worker<TtsJobData>(
  QUEUE_NAMES.TTS,
  async (job) => {
    const { episodeId, voiceId, translationId } = job.data;
    console.log(`[tts] Processing episode ${episodeId}`);

    const { generateEpisodeTts } = await import("./tts.js");

    const result = await generateEpisodeTts({ episodeId, voiceId, translationId });
    await job.updateProgress(100);

    return result;
  },
  {
    connection: createRedisConnection(),
    concurrency: 2,
  }
);

ttsWorker.on("completed", (job) => {
  console.log(`[tts] ✓ Job ${job.id} completed`);
});

ttsWorker.on("failed", (job, err) => {
  console.error(`[tts] ✗ Job ${job?.id} failed:`, err.message);
  if (job?.data?.episodeId) {
    db.episodes.update(job.data.episodeId, { status: "failed", error: err.message });
  }
});

// ─── Publish worker ───────────────────────────────────────────────────────────

const publishWorker = new Worker<PublishJobData>(
  QUEUE_NAMES.PUBLISH,
  async (job) => {
    const { episodeId, platform, metadata } = job.data;
    console.log(`[publish] Publishing episode ${episodeId} to ${platform}`);

    // Find the publication record for this episode + platform
    const { db: dbHelpers } = await import("./lib/db.js");
    const publications = dbHelpers.publications.list(episodeId);
    const pub = publications.find((p) => p.platform === platform && p.status === "pending");

    if (!pub) {
      throw new Error(`No pending publication found for episode ${episodeId} on ${platform}`);
    }

    const { publishEpisode } = await import("./publish.js");

    const result = await publishEpisode({
      publicationId: pub.id,
      onProgress: (pct) => job.updateProgress(pct),
    });

    return result;
  },
  {
    connection: createRedisConnection(),
    concurrency: 3,
  }
);

publishWorker.on("completed", (job) => {
  console.log(`[publish] ✓ Job ${job.id} completed`);
});

publishWorker.on("failed", (job, err) => {
  console.error(`[publish] ✗ Job ${job?.id} failed:`, err.message);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received — shutting down workers...`);
  await Promise.all([
    renderWorker.close(),
    ttsWorker.close(),
    publishWorker.close(),
  ]);
  console.log("Workers stopped.");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log(`✓ Workers listening:
  - render-queue  (concurrency: 1)
  - tts-queue     (concurrency: 2)
  - publish-queue (concurrency: 3)

Press Ctrl+C to stop.`);
