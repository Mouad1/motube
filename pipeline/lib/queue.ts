import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Shared Redis connection (reused across queues)
export function createRedisConnection() {
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
  });
}

// ─── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  RENDER: "render-queue",
  TTS: "tts-queue",
  PUBLISH: "publish-queue",
} as const;

// ─── Job data types ───────────────────────────────────────────────────────────

export interface RenderJobData {
  episodeId: string;
  quality: "preview" | "full";
  translationId?: string; // if rendering a translated version
}

export interface TtsJobData {
  episodeId: string;
  voiceId?: string;
  language?: string;
  translationId?: string;
  segments?: Array<{ text: string; sceneIndex: number }>;
}

export interface PublishJobData {
  episodeId: string;
  platform: "youtube" | "tiktok" | "instagram" | "twitter";
  metadata: {
    title: string;
    description: string;
    tags: string[];
    privacyStatus?: "public" | "private" | "unlisted";
  };
}

// ─── Queue factories ──────────────────────────────────────────────────────────

export function createRenderQueue() {
  return new Queue<RenderJobData>(QUEUE_NAMES.RENDER, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    },
  });
}

export function createTtsQueue() {
  return new Queue<TtsJobData>(QUEUE_NAMES.TTS, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    },
  });
}

export function createPublishQueue() {
  return new Queue<PublishJobData>(QUEUE_NAMES.PUBLISH, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "fixed", delay: 10000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
}

// ─── Queue status helper ──────────────────────────────────────────────────────

export interface JobStatus {
  id: string;
  queue: string;
  name: string;
  state: string;
  data: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  progress: any;
  failedReason?: string;
  timestamp: number;
}

export async function getAllJobStatuses(): Promise<JobStatus[]> {
  const queues = [createRenderQueue(), createTtsQueue(), createPublishQueue()];
  const results: JobStatus[] = [];

  for (const queue of queues) {
    const jobs = await queue.getJobs(["active", "waiting", "delayed", "failed"], 0, 20);
    for (const job of jobs) {
      const state = await job.getState();
      results.push({
        id: job.id ?? "",
        queue: queue.name,
        name: job.name,
        state,
        data: job.data,
        progress: job.progress,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
      });
    }
    await queue.close();
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}
