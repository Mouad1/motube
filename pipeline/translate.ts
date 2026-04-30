/**
 * translate.ts — Traduit un épisode vers une ou plusieurs langues via Gemini.
 * Usage: npx tsx pipeline/translate.ts --episode-id <id> --target-lang fr [--target-lang es ...]
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { db, getDb } from "./lib/db.js";
import { translateEpisodeProps, extractArabicStoryScenes, LANGUAGE_NAMES } from "./lib/gemini.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── Write translated script .md ─────────────────────────────────────────────

function writeTranslatedScript(
  slug: string,
  lang: string,
  props: { title: string; scenes: Array<{ type: string; data: Record<string, string | undefined>; durationInFrames?: number }> }
): string {
  const lines = [
    `---`,
    `title: "${props.title}"`,
    `slug: "${slug}-${lang}"`,
    `language: "${lang}"`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
    `status: translated`,
    `---`,
    ``,
    `# ${props.title}`,
    ``,
  ];

  props.scenes.forEach((scene, i) => {
    lines.push(`## Scène ${i + 1} — ${scene.type.toUpperCase()}`);
    Object.entries(scene.data).forEach(([k, v]) => {
      if (k === "code") {
        lines.push(`\`\`\`\n${v}\n\`\`\``);
      } else {
        lines.push(`**${k}**: ${v}`);
      }
    });
    lines.push("");
  });

  const dir = path.join(ROOT, "scripts", "episodes", "translations");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${slug}-${lang}.md`);
  fs.writeFileSync(filePath, lines.join("\n"));
  return filePath;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export interface TranslateOptions {
  episodeId: string;
  targetLanguages: string[]; // e.g. ["fr", "es", "en"]
  sourceLanguage?: string;
}

export interface TranslationResult {
  translationId: string;
  language: string;
  scriptPath: string;
}

export async function translateEpisode(opts: TranslateOptions): Promise<TranslationResult[]> {
  const { episodeId, targetLanguages, sourceLanguage } = opts;

  const episode = db.episodes.get(episodeId);
  if (!episode) throw new Error(`Episode ${episodeId} not found`);
  if (!episode.props_json) throw new Error("No props_json — generate script first");

  const props = JSON.parse(episode.props_json) as {
    title: string;
    scenes: Array<{ type: string; data: Record<string, string | undefined>; durationInFrames?: number }>;
  };

  const results: TranslationResult[] = [];

  for (const lang of targetLanguages) {
    // Skip if same as source
    if (lang === (sourceLanguage ?? episode.language)) {
      console.log(`Skipping ${lang} (same as source)`);
      continue;
    }

    // Skip if translation already exists
    const existing = getDb().prepare(
      "SELECT id FROM translations WHERE episode_id = ? AND language = ?"
    ).get(episodeId, lang) as { id: string } | null;

    if (existing) {
      console.log(`Translation to ${lang} already exists (${existing.id})`);
      continue;
    }

    console.log(`Translating to ${LANGUAGE_NAMES[lang] ?? lang}...`);

    const translatedProps = await translateEpisodeProps(props, lang, sourceLanguage ?? episode.language);
    const scriptPath = writeTranslatedScript(episode.slug, lang, translatedProps);

    const translationId = randomUUID();
    getDb().prepare(`
      INSERT INTO translations (id, episode_id, language, script_path, props_json, status)
      VALUES (?, ?, ?, ?, ?, 'translated')
    `).run(translationId, episodeId, lang, scriptPath, JSON.stringify(translatedProps));

    results.push({ translationId, language: lang, scriptPath });
    console.log(`✓ ${lang} → ${scriptPath}`);

    // Small delay between languages
    await new Promise((r) => setTimeout(r, 500));
  }

  // Update episode status
  if (results.length > 0) {
    db.episodes.update(episodeId, { status: "translated", error: null });
  }

  return results;
}

// ─── Arabic story ingestion ───────────────────────────────────────────────────

export async function ingestArabicStory(opts: {
  episodeId: string;
  arabicText: string;
  targetLanguages: string[];
}): Promise<{ scriptPath: string; translations: TranslationResult[] }> {
  const { episodeId, arabicText, targetLanguages } = opts;

  const episode = db.episodes.get(episodeId);
  if (!episode) throw new Error(`Episode ${episodeId} not found`);

  // 1. Extract structured scenes from Arabic text via Gemini
  console.log("Extracting Arabic story structure...");
  const props = await extractArabicStoryScenes(arabicText);

  // 2. Write script
  const scriptDir = path.join(ROOT, "scripts", "episodes");
  fs.mkdirSync(scriptDir, { recursive: true });
  const scriptPath = path.join(scriptDir, `${episode.slug}.md`);

  const lines = [
    `---`,
    `title: "${props.title}"`,
    `slug: "${episode.slug}"`,
    `language: "ar"`,
    `template: "arabic-story"`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
    `---`,
    ``,
    `# ${props.title}`,
    ``,
    ...props.scenes.map((s, i) => [
      `## Scène ${i + 1}`,
      JSON.stringify(s.data, null, 2),
      "",
    ].join("\n")),
  ];
  fs.writeFileSync(scriptPath, lines.join("\n"));

  // 3. Update DB
  db.episodes.update(episodeId, {
    status: "scripted",
    script_path: scriptPath,
    props_json: JSON.stringify(props),
    error: null,
  });

  // 4. Translate to target languages
  const translations = await translateEpisode({
    episodeId,
    targetLanguages,
    sourceLanguage: "ar",
  });

  return { scriptPath, translations };
}

// ─── CLI entrypoint ──────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const episodeId = args[args.indexOf("--episode-id") + 1];
  const targetLangs = args
    .map((a, i) => (a === "--target-lang" ? args[i + 1] : null))
    .filter(Boolean) as string[];
  const sourceLang = args.indexOf("--source-lang") !== -1
    ? args[args.indexOf("--source-lang") + 1]
    : undefined;

  if (!episodeId || targetLangs.length === 0) {
    console.error("Usage: npx tsx pipeline/translate.ts --episode-id <id> --target-lang fr [--target-lang es] [--source-lang en]");
    process.exit(1);
  }

  translateEpisode({ episodeId, targetLanguages: targetLangs, sourceLanguage: sourceLang })
    .then((results) => {
      results.forEach((r) => console.log(`✓ ${r.language}: ${r.scriptPath}`));
    })
    .catch((e) => { console.error("✗", e.message); process.exit(1); });
}
