"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, Play, Loader2, Check, Star, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string> | null;
}

interface VoiceProfile {
  id: string;
  name: string;
  elevenlabs_id: string | null;
  language: string;
  is_default: number;
}

const MODELS = [
  { id: "eleven_multilingual_v2", label: "Multilingual v2 (recommandé)" },
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5 (rapide)" },
  { id: "eleven_monolingual_v1", label: "Monolingual v1 (EN)" },
];

function QuotaBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const color = pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-teal-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/50">
        <span>Quota ElevenLabs ce mois</span>
        <span>{total - used} / {total} chars restants</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/50">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input type="range" min={0} max={1} step={0.05} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-teal-500 cursor-pointer" />
    </div>
  );
}

export default function VoicePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<ElevenLabsVoice | null>(null);
  const [model, setModel] = useState("eleven_multilingual_v2");
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [previewText, setPreviewText] = useState("Bonjour, ceci est un aperçu de la voix sélectionnée.");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data, isLoading, error } = useQuery<{ voices: ElevenLabsVoice[]; quota: number }>({
    queryKey: ["elevenlabs-voices"],
    queryFn: () => fetch("/api/voice/elevenlabs").then((r) => r.json()),
  });

  const { data: profilesData } = useQuery<{ voices: VoiceProfile[] }>({
    queryKey: ["voice-profiles"],
    queryFn: () => fetch("/api/voice").then((r) => r.json()),
  });

  const addProfile = useMutation({
    mutationFn: (voice: ElevenLabsVoice) =>
      fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: voice.name,
          elevenLabsId: voice.voice_id,
          language: voice.labels?.language ?? "en",
          isDefault: false,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Profil vocal ajouté");
      qc.invalidateQueries({ queryKey: ["voice-profiles"] });
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const setDefault = useMutation({
    mutationFn: ({ id, language }: { id: string; language: string }) =>
      fetch(`/api/voice/${id}/default`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Voix par défaut mise à jour");
      qc.invalidateQueries({ queryKey: ["voice-profiles"] });
    },
  });

  const playPreview = async (voice: ElevenLabsVoice) => {
    if (playingId === voice.voice_id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    setPlayingId(voice.voice_id);
    try {
      const res = await fetch("/api/voice/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: voice.voice_id, text: previewText, modelId: model, stability, similarityBoost: similarity }),
      });
      if (!res.ok) { toast.error("Preview échoué"); setPlayingId(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.play();
    } catch {
      toast.error("Erreur de preview");
      setPlayingId(null);
    }
  };

  const profileIds = new Set((profilesData?.voices ?? []).map((v) => v.elevenlabs_id));
  const filtered = (data?.voices ?? []).filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.labels && Object.values(v.labels).some((l) => l.toLowerCase().includes(search.toLowerCase())))
  );
  const QUOTA_TOTAL = 10_000;
  const quotaUsed = data ? QUOTA_TOTAL - data.quota : 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Voix</h1>
          <p className="text-white/50 text-sm mt-1">Configuration ElevenLabs — voix et paramètres TTS</p>
        </div>
        {data && <div className="w-72"><QuotaBar used={quotaUsed} total={QUOTA_TOTAL} /></div>}
      </div>

      {/* Settings panel */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <button onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-white/80 hover:text-white transition-colors">
          <span className="flex items-center gap-2"><Mic size={14} /> Paramètres TTS</span>
          {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showSettings && (
          <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Modèle</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                {MODELS.map((m) => <option key={m.id} value={m.id} className="bg-neutral-900">{m.label}</option>)}
              </select>
            </div>
            <Slider label="Stability" value={stability} onChange={setStability} />
            <Slider label="Similarity Boost" value={similarity} onChange={setSimilarity} />
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Texte de prévisualisation</label>
              <textarea value={previewText} onChange={(e) => setPreviewText(e.target.value)}
                rows={2} maxLength={200}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none" />
            </div>
          </div>
        )}
      </div>

      {/* Favoris */}
      {(profilesData?.voices?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
            <Star size={13} className="text-amber-400 fill-amber-400" /> Favoris
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {profilesData!.voices.map((p) => {
              const voice = data?.voices.find((v) => v.voice_id === p.elevenlabs_id);
              const isPlaying = playingId === p.elevenlabs_id;
              return (
                <div key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{p.name}</span>
                      {p.is_default === 1 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 shrink-0">défaut</span>
                      )}
                    </div>
                    <p className="text-xs text-white/30 font-mono mt-0.5">{p.language} · {p.elevenlabs_id?.slice(0, 8)}…</p>
                    {voice?.labels && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {Object.entries(voice.labels).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {p.elevenlabs_id && (
                      <button
                        onClick={() => voice && playPreview(voice)}
                        disabled={!voice}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isPlaying
                            ? "border-teal-500/40 bg-teal-500/10 text-teal-400"
                            : "border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                        }`}>
                        {isPlaying ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      </button>
                    )}
                    <button
                      onClick={() => setDefault.mutate({ id: p.id, language: p.language })}
                      disabled={p.is_default === 1}
                      title="Définir par défaut"
                      className={`p-1.5 rounded-lg border transition-colors ${
                        p.is_default === 1
                          ? "border-teal-500/40 bg-teal-500/10 text-teal-400"
                          : "border-white/10 text-white/30 hover:text-amber-400 hover:border-amber-400/30"
                      }`}>
                      <Star size={12} className={p.is_default === 1 ? "fill-teal-400" : ""} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voix ElevenLabs */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-medium text-white/70">Voix disponibles ElevenLabs</h2>
          <div className="relative flex-1 max-w-xs">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30" />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-white/40 text-sm py-8 justify-center">
            <Loader2 size={14} className="animate-spin" /> Chargement des voix...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 py-4">
            Erreur : vérifie ta clé ELEVENLABS_API_KEY dans .env.local
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-1.5">
            {filtered.map((voice) => {
              const isSelected = selectedVoice?.voice_id === voice.voice_id;
              const isAdded = profileIds.has(voice.voice_id);
              const isPlaying = playingId === voice.voice_id;

              return (
                <div key={voice.voice_id}
                  onClick={() => setSelectedVoice(isSelected ? null : voice)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-teal-500/40 bg-teal-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/8"
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{voice.name}</span>
                      <span className="text-xs text-white/30 capitalize">{voice.category}</span>
                    </div>
                    {voice.labels && (
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {Object.entries(voice.labels).map(([k, v]) => (
                          <span key={k} className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isAdded && <Check size={13} className="text-teal-400" />}
                    <button
                      onClick={() => playPreview(voice)}
                      disabled={isPlaying && playingId !== voice.voice_id}
                      className={`p-2 rounded-lg border transition-colors ${
                        isPlaying
                          ? "border-teal-500/40 bg-teal-500/10 text-teal-400"
                          : "border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                      }`}>
                      {isPlaying ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                    </button>
                    {!isAdded && (
                      <button
                        onClick={() => addProfile.mutate(voice)}
                        disabled={addProfile.isPending}
                        className="px-3 py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs hover:bg-teal-500/20 transition-colors disabled:opacity-50">
                        Ajouter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && !isLoading && (
              <p className="text-sm text-white/30 text-center py-8">Aucune voix trouvée pour "{search}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
