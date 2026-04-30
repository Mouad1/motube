/**
 * analytics-sync.ts — Synchronise YouTube Analytics → SQLite.
 * Appelé par la route POST /api/analytics/sync via spawn.
 * Usage: npx tsx pipeline/lib/analytics-sync.ts
 */

import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { db, getDb } from "./db.js";
import { getVideoAnalytics, hasTokens } from "./youtube.js";

dotenv.config({ path: ".env.local" });

if (!hasTokens()) {
  console.error("[analytics-sync] YouTube not authenticated. Visit /api/auth/youtube first.");
  process.exit(1);
}

// Find all published YouTube publications with a platform_id (videoId)
const publications = getDb().prepare(`
  SELECT id, platform_id
  FROM publications
  WHERE platform = 'youtube'
    AND status = 'published'
    AND platform_id IS NOT NULL
`).all() as Array<{ id: string; platform_id: string }>;

if (publications.length === 0) {
  console.log("[analytics-sync] No published YouTube videos to sync.");
  process.exit(0);
}

const today = new Date().toISOString().split("T")[0];
// Look back 30 days
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

let synced = 0;

for (const pub of publications) {
  try {
    console.log(`[analytics-sync] Syncing video ${pub.platform_id}...`);
    const snapshots = await getVideoAnalytics(pub.platform_id, startDate, today);

    for (const snap of snapshots) {
      // Upsert snapshot (delete + insert to handle re-runs)
      getDb().prepare(`
        DELETE FROM analytics_snapshots
        WHERE publication_id = ? AND snapshot_date = ?
      `).run(pub.id, snap.date);

      getDb().prepare(`
        INSERT INTO analytics_snapshots
          (id, publication_id, snapshot_date, views, watch_time, revenue_usd, ctr, avg_duration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        pub.id,
        snap.date,
        snap.views,
        snap.watchTimeMinutes,
        snap.estimatedRevenue,
        snap.ctr,
        snap.avgViewDuration
      );
    }

    console.log(`[analytics-sync] ✓ ${pub.platform_id} — ${snapshots.length} snapshots`);
    synced++;
  } catch (err) {
    console.error(`[analytics-sync] ✗ ${pub.platform_id}:`, err instanceof Error ? err.message : err);
  }
}

console.log(`[analytics-sync] Done — ${synced}/${publications.length} videos synced.`);
