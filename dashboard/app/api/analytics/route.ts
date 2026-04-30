import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/analytics?days=30
export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30");
  const db = getDb();

  // Aggregate snapshots across all publications
  const snapshots = db.prepare(`
    SELECT
      a.snapshot_date AS date,
      SUM(a.views) AS views,
      SUM(a.watch_time) AS watchTimeMinutes,
      SUM(a.revenue_usd) AS estimatedRevenue,
      AVG(a.ctr) AS ctr,
      AVG(a.avg_duration) AS avgViewDuration
    FROM analytics_snapshots a
    WHERE a.snapshot_date >= date('now', ? || ' days')
    GROUP BY a.snapshot_date
    ORDER BY a.snapshot_date ASC
  `).all(`-${days}`) as Array<{
    date: string;
    views: number;
    watchTimeMinutes: number;
    estimatedRevenue: number;
    ctr: number;
    avgViewDuration: number;
  }>;

  // Per-platform publication counts
  const platformStats = db.prepare(`
    SELECT
      platform,
      COUNT(*) AS count,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published
    FROM publications
    GROUP BY platform
  `).all() as Array<{ platform: string; count: number; published: number }>;

  // Revenue totals
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(views), 0) AS totalViews,
      COALESCE(SUM(watch_time), 0) AS totalWatchTime,
      COALESCE(SUM(revenue_usd), 0) AS totalRevenue
    FROM analytics_snapshots
    WHERE snapshot_date >= date('now', ? || ' days')
  `).get(`-${days}`) as { totalViews: number; totalWatchTime: number; totalRevenue: number };

  // Top performing videos
  const topVideos = db.prepare(`
    SELECT
      e.id,
      e.title,
      e.template,
      p.platform,
      p.url,
      COALESCE(SUM(a.views), 0) AS views,
      COALESCE(SUM(a.revenue_usd), 0) AS revenue
    FROM episodes e
    JOIN publications p ON p.episode_id = e.id AND p.status = 'published'
    LEFT JOIN analytics_snapshots a ON a.publication_id = p.id
    WHERE a.snapshot_date >= date('now', ? || ' days') OR a.snapshot_date IS NULL
    GROUP BY e.id, p.id
    ORDER BY views DESC
    LIMIT 10
  `).all(`-${days}`) as Array<{
    id: string; title: string; template: string;
    platform: string; url: string | null;
    views: number; revenue: number;
  }>;

  return NextResponse.json({
    days,
    snapshots,
    platformStats,
    totals,
    topVideos,
  });
}
