/**
 * cost-tracker.ts — Per-clip cost accumulator.
 *
 * Phase 0: minimal facade over `db.clips.addCost`. Provides one chokepoint so
 * future phases can add daily aggregates / budget alerts without touching
 * provider code.
 */

import { db } from "./db.js";

export interface CostEvent {
  clipId: string;
  provider: string;
  stage: "image" | "video" | "audio" | "other";
  amountUsd: number;
}

export function trackClipCost(event: CostEvent): void {
  if (event.amountUsd <= 0) return;
  db.clips.addCost(event.clipId, event.amountUsd);
  if (process.env.MOTUBE_COST_LOG === "1") {
    // Stable, machine-parseable log line for daily aggregation later.
    console.log(
      `[cost] clip=${event.clipId} stage=${event.stage} provider=${event.provider} usd=${event.amountUsd.toFixed(4)}`,
    );
  }
}
