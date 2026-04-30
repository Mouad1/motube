/**
 * ci-sample-episode.ts — Creates a minimal episode row for the CI render-sample job.
 * Prints the new episode ID on the last stdout line.
 */
import { randomUUID } from "crypto";
import { db } from "../lib/db.js";

const id = randomUUID();
const slug = `ci-sample-${Date.now().toString(36)}`;

const props = {
  title: "CI Sample Episode",
  scenes: [
    { type: "title", data: { title: "CI Sample", subtitle: "Automated test render" }, durationInFrames: 60 },
    { type: "transition", data: { text: "Pipeline verified." }, durationInFrames: 45 },
  ],
};

db.episodes.create({
  id,
  slug,
  title: "CI Sample Episode",
  template: "karpathy",
  language: "en",
  source_type: null,
  source_url: null,
  status: "scripted",
  script_path: null,
  audio_path: null,
  video_path: null,
  props_json: JSON.stringify(props),
  seo_json: null,
  error: null,
  heygen_video_ids: null,
});

console.log(id);
