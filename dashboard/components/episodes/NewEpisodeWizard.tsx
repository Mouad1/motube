"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type SourceType = "article" | "youtube" | "arabic-story" | "manual";

const STEPS = ["Source", "Contenu", "Options", "Lancer"];

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
];

const TARGET_LANGS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
];

const SOURCE_OPTIONS = [
  { type: "article" as SourceType, emoji: "📰", title: "Article / URL", desc: "Claude génère le script depuis n'importe quelle page web" },
  { type: "youtube" as SourceType, emoji: "▶️", title: "Vidéo YouTube", desc: "Transcription extraite automatiquement + restructuration" },
  { type: "arabic-story" as SourceType, emoji: "🕌", title: "Histoire arabe", desc: "Texte arabe → animation Lottie + traduction multilingue" },
  { type: "manual" as SourceType, emoji: "✏️", title: "Manuel", desc: "Créer l'épisode sans source — écrire le script directement" },
] as const;

export function NewEpisodeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [url, setUrl] = useState("");
  const [arabicText, setArabicText] = useState("");
  const [manualScript, setManualScript] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [language, setLanguage] = useState("fr");
  const [targetLangs, setTargetLangs] = useState<string[]>(["en"]);

  function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
  }

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slug || slug === slugify(title)) setSlug(slugify(val));
  }

  function toggleTargetLang(code: string) {
    setTargetLangs((prev) => prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]);
  }

  async function handleSubmit() {
    if (!sourceType) return;
    setLoading(true);
    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};

      if (sourceType === "article") {
        endpoint = "/api/ingest/article";
        body = { url, title: title || undefined, language };
      } else if (sourceType === "youtube") {
        endpoint = "/api/ingest/youtube";
        body = { url, title: title || undefined, language };
      } else if (sourceType === "arabic-story") {
        endpoint = "/api/ingest/arabic-story";
        body = { arabicText, title, slug: slug || slugify(title), targetLanguages: targetLangs };
      } else if (sourceType === "manual") {
        endpoint = "/api/episodes";
        body = { title, slug: slug || slugify(title), template: "karpathy", language };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json() as { episodeId?: string; id?: string; error?: string };
      if (!res.ok) { toast.error(`Erreur : ${data.error ?? res.statusText}`); return; }

      const id = data.episodeId ?? data.id;

      if (sourceType === "manual" && manualScript.trim() && id) {
        const saveRes = await fetch(`/api/episodes/${id}/script`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: manualScript }),
        });
        if (!saveRes.ok) toast.error("Épisode créé mais erreur lors de la sauvegarde du script");
      }

      toast.success(sourceType === "manual" ? "Épisode créé !" : "Génération lancée ! Le script sera prêt dans quelques instants.");
      router.push(`/episodes/${id}`);
    } catch (e) {
      toast.error(`Erreur réseau : ${e instanceof Error ? e.message : "inconnue"}`);
    } finally {
      setLoading(false);
    }
  }

  const canNext =
    (sourceType === "article" && url.startsWith("http")) ||
    (sourceType === "youtube" && (url.includes("youtube.com") || url.includes("youtu.be"))) ||
    (sourceType === "arabic-story" && arabicText.length >= 50) ||
    sourceType === "manual";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i === step ? "bg-[#e60023] text-white" : i < step ? "bg-[#e60023]/15 text-[#e60023]" : "bg-[#e5e5e0] text-[#91918c]"
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm transition-colors ${i === step ? "text-[#211922] font-medium" : "text-[#91918c]"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-[#e0e0d9] mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Source */}
      {step === 0 && (
        <div className="grid grid-cols-2 gap-3">
          {SOURCE_OPTIONS.map(({ type, emoji, title: t, desc }) => (
            <button key={type} onClick={() => { setSourceType(type); setStep(1); }}
              className={`text-left p-5 rounded-2xl border transition-colors space-y-2.5 ${
                sourceType === type
                  ? "border-[#e60023] bg-[#e60023]/5"
                  : "border-[#e0e0d9] bg-white hover:border-[#e60023]/40 hover:bg-[#e60023]/5"
              }`}
            >
              <div className="text-2xl">{emoji}</div>
              <p className="font-semibold text-sm text-[#211922]">{t}</p>
              <p className="text-xs text-[#62625b]">{desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Contenu */}
      {step === 1 && (
        <div className="rounded-2xl border border-[#e0e0d9] bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#211922]">
            {sourceType === "article" && "URL de l'article"}
            {sourceType === "youtube" && "URL YouTube"}
            {sourceType === "arabic-story" && "Texte arabe"}
            {sourceType === "manual" && "Contenu de l'épisode"}
          </h2>

          {(sourceType === "article" || sourceType === "youtube") && (
            <div className="space-y-2">
              <Label className="text-xs text-[#62625b]">URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder={sourceType === "youtube" ? "https://youtube.com/watch?v=..." : "https://example.com/article"}
                type="url" className="rounded-2xl border-[#e0e0d9] focus:ring-[#e60023]" />
            </div>
          )}

          {sourceType === "arabic-story" && (
            <div className="space-y-2">
              <Label className="text-xs text-[#62625b]">Texte arabe</Label>
              <textarea value={arabicText} onChange={(e) => setArabicText(e.target.value)}
                placeholder="الصق النص العربي هنا..." dir="rtl" rows={8}
                className="w-full p-3 rounded-2xl border border-[#e0e0d9] bg-transparent text-sm resize-y outline-none focus:ring-1 focus:ring-[#e60023]" />
            </div>
          )}

          {sourceType === "manual" && (
            <div className="space-y-2">
              <Label className="text-xs text-[#62625b]">Script <span className="text-[#91918c]">(optionnel — éditable après création)</span></Label>
              <textarea value={manualScript} onChange={(e) => setManualScript(e.target.value)}
                placeholder={"Écris ton script ici. Tu peux utiliser le Markdown.\n\n## Scène 1\nIntro...\n\n## Scène 2\n..."}
                rows={10} className="w-full p-3 rounded-2xl border border-[#e0e0d9] bg-transparent text-sm resize-y font-mono leading-relaxed outline-none focus:ring-1 focus:ring-[#e60023]" />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-[#62625b]">Titre <span className="text-[#91918c]">(optionnel)</span></Label>
            <Input value={title} onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Mon épisode" className="rounded-2xl border-[#e0e0d9]" />
          </div>

          <NavButtons step={step} setStep={setStep} canNext={!!canNext} />
        </div>
      )}

      {/* Step 3 — Options */}
      {step === 2 && (
        <div className="rounded-2xl border border-[#e0e0d9] bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#211922]">Langue et traductions</h2>

          <div className="space-y-2">
            <Label className="text-xs text-[#62625b]">Langue source</Label>
            <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
              <SelectTrigger className="rounded-2xl border-[#e0e0d9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceType === "arabic-story" && (
            <div className="space-y-2">
              <Label className="text-xs text-[#62625b]">Traduire vers</Label>
              <div className="flex flex-wrap gap-2">
                {TARGET_LANGS.map((l) => (
                  <button key={l.code} onClick={() => toggleTargetLang(l.code)}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-medium border transition-colors ${
                      targetLangs.includes(l.code)
                        ? "border-[#e60023] bg-[#e60023]/10 text-[#e60023]"
                        : "border-[#e0e0d9] text-[#62625b] hover:border-[#e60023]/30"
                    }`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-[#62625b]">Slug URL <span className="text-[#91918c]">(optionnel)</span></Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="mon-episode" className="font-mono rounded-2xl border-[#e0e0d9]" />
          </div>

          <NavButtons step={step} setStep={setStep} canNext />
        </div>
      )}

      {/* Step 4 — Lancer */}
      {step === 3 && (
        <div className="rounded-2xl border border-[#e0e0d9] bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#211922]">Récapitulatif</h2>

          <div className="space-y-0 divide-y divide-[#e0e0d9] text-sm">
            {[
              { label: "Source", value: sourceType },
              url || arabicText ? { label: "Contenu", value: url || `${arabicText.slice(0, 40)}…`, mono: true } : null,
              { label: "Titre", value: title || "(auto-généré)" },
              { label: "Langue", value: language.toUpperCase(), mono: true },
            ].filter(Boolean).map((row) => row && (
              <div key={row.label} className="flex justify-between py-2.5">
                <span className="text-[#91918c]">{row.label}</span>
                <span className={`font-medium text-[#211922] truncate max-w-xs ${row.mono ? "font-mono text-xs" : ""}`}>{row.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#f6f6f3] rounded-2xl p-4 text-xs text-[#62625b] space-y-1.5">
            <p>🤖 Claude {sourceType !== "manual" && "va analyser le contenu et "}va structurer le script</p>
            {sourceType === "arabic-story" && <p>🌍 Gemini va traduire vers {targetLangs.join(", ")}</p>}
            <p>📁 L&apos;épisode sera créé et visible dans le dashboard</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setStep(2)}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-[#e0e0d9] text-sm text-[#62625b] hover:bg-[#f6f6f3] transition-colors">
              ← Retour
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-[#e60023] text-white font-semibold text-sm hover:bg-[#c0001e] disabled:opacity-50 transition-colors">
              {loading ? "Lancement…" : "🚀 Lancer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButtons({ step, setStep, canNext }: { step: number; setStep: (s: number) => void; canNext: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={() => setStep(step - 1)}
        className="flex-1 px-4 py-2.5 rounded-2xl border border-[#e0e0d9] text-sm text-[#62625b] hover:bg-[#f6f6f3] transition-colors">
        ← Retour
      </button>
      <button onClick={() => setStep(step + 1)} disabled={!canNext}
        className="flex-1 px-4 py-2.5 rounded-2xl bg-[#e60023] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#c0001e] transition-colors">
        Suivant →
      </button>
    </div>
  );
}
