import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

let _genai: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set in .env.local");
  if (!_genai) _genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  return _genai;
}

// Language code map for display names
export const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  tr: "Turkish",
  ru: "Russian",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
};

// ─── Generic translation ──────────────────────────────────────────────────────

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });

  const targetName = LANGUAGE_NAMES[targetLang] ?? targetLang;
  const sourceHint = sourceLang ? ` from ${LANGUAGE_NAMES[sourceLang] ?? sourceLang}` : "";

  const prompt = `Translate the following text${sourceHint} to ${targetName}.
Return ONLY the translated text, no explanations, no quotes, no extra formatting.

Text to translate:
${text}`;

  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, attempts * 1500));
    }
  }
  throw new Error("Translation failed after 3 attempts");
}

// ─── Translate Remotion scene props ──────────────────────────────────────────

interface SceneData {
  [key: string]: string | undefined;
}

interface Scene {
  type: string;
  data: SceneData;
  durationInFrames?: number;
}

interface EpisodeProps {
  title: string;
  scenes: Scene[];
}

/** Fields to translate per scene type */
const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  title: ["title", "subtitle"],
  code: ["explanation"],
  concept: ["heading", "body"],
  transition: ["text"],
  "arabic-title": ["arabicTitle", "translatedTitle"],
  "arabic-narrator": ["arabicText", "translatedText"],
  "arabic-dialogue": ["arabicLine", "translatedLine", "speaker"],
  hook: ["headline", "subtext"],
  point: ["text"],
  cta: ["text"],
};

export async function translateEpisodeProps(
  props: EpisodeProps,
  targetLang: string,
  sourceLang?: string
): Promise<EpisodeProps> {
  const translatedTitle = await translateText(props.title, targetLang, sourceLang);

  const translatedScenes = await Promise.all(
    props.scenes.map(async (scene) => {
      const fields = TRANSLATABLE_FIELDS[scene.type] ?? [];
      const translatedData = { ...scene.data };

      for (const field of fields) {
        const value = scene.data[field];
        if (value && typeof value === "string" && value.trim()) {
          translatedData[field] = await translateText(value, targetLang, sourceLang);
        }
      }

      return { ...scene, data: translatedData };
    })
  );

  return { title: translatedTitle, scenes: translatedScenes };
}

// ─── Arabic transcription extraction ─────────────────────────────────────────

/** Given Arabic text, extract structured story scenes */
export async function extractArabicStoryScenes(arabicText: string): Promise<EpisodeProps> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are given an Arabic story or narrative text.
Analyze it and structure it into a series of scenes for an animated video.

Return ONLY a valid JSON object with this exact structure:
{
  "title": "story title in Arabic",
  "scenes": [
    {
      "type": "arabic-title",
      "data": {
        "arabicTitle": "title in Arabic",
        "translatedTitle": "title in English"
      },
      "durationInFrames": 150
    },
    {
      "type": "arabic-narrator",
      "data": {
        "arabicText": "narrative text in Arabic (max 2-3 sentences)",
        "translatedText": "English translation"
      },
      "durationInFrames": 240
    }
  ]
}

Rules:
- Split the story into 4-8 scenes
- First scene must be type "arabic-title"
- Remaining scenes should be "arabic-narrator" or "arabic-dialogue"
- Keep each arabicText to 2-3 sentences maximum
- durationInFrames should be 150 for title, 240-360 for narrator based on text length

Arabic story:
${arabicText}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  // Strip markdown code blocks if present
  const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  return JSON.parse(clean) as EpisodeProps;
}
