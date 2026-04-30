import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./lib/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const db = getDb();
const episodes = db.prepare(
  "SELECT id, props_json FROM episodes WHERE props_json IS NOT NULL AND status IN ('tts_done','rendered','published','failed')"
).all() as Array<{ id: string; props_json: string }>;

let totalInjected = 0;

for (const ep of episodes) {
  const props = JSON.parse(ep.props_json) as { scenes: Array<{ data: Record<string, string> }> };
  let changed = false;

  for (let i = 0; i < props.scenes.length; i++) {
    const relPath = `assets/audio/${ep.id}/scene-${i}.mp3`;
    const absPath = path.join(ROOT, relPath);
    if (fs.existsSync(absPath) && !props.scenes[i].data.audioPath) {
      props.scenes[i].data.audioPath = relPath;
      changed = true;
      totalInjected++;
    }
  }

  if (changed) {
    db.prepare("UPDATE episodes SET props_json = ? WHERE id = ?").run(JSON.stringify(props), ep.id);
    console.log(`✓ ${ep.id.slice(0, 8)}… — ${props.scenes.filter(s => s.data.audioPath).length} audio paths injected`);
  }
}

console.log(`\nDone — ${totalInjected} audio paths injected across ${episodes.length} episodes.`);
