"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText, Volume2, Video, Send, Play, RefreshCw,
  AlertCircle, CheckCircle2, Clock, Loader2, Trash2, Image,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EpisodeData {
  id: string; title: string; slug: string; template: string; language: string;
  status: string; source_type: string | null; source_url: string | null;
  script_path: string | null; audio_path: string | null; video_path: string | null;
  props_json: string | null; error: string | null;
  render_progress: number | null;
  created_at: string; updated_at: string;
}

interface Props {
  episode: EpisodeData;
  scriptContent: string | null;
  scenes: Array<{ type: string; data?: Record<string, string> }>;
  audioFiles: string[];
}

// ─── Status logic ────────────────────────────────────────────────────────────

type StepStatus = "done" | "running" | "failed" | "waiting" | "blocked";

interface StepState {
  label: string;
  status: StepStatus;
  progress?: number; // 0-100 for render
  detail?: string;
}

function deriveSteps(ep: EpisodeData, activeOp: string | null): StepState[] {
  const isFailed = ep.status === "failed";

  const scriptDone = !!ep.script_path;
  const audioDone = !!ep.audio_path;
  const videoDone = !!ep.video_path;
  const published = ep.status === "published";

  return [
    {
      label: "Script",
      status: scriptDone
        ? "done"
        : activeOp === "script"
        ? "running"
        : isFailed && !scriptDone
        ? "failed"
        : "waiting",
      detail: scriptDone ? "Généré" : activeOp === "script" ? "Claude analyse…" : undefined,
    },
    {
      label: "Audio",
      status: audioDone
        ? "done"
        : activeOp === "tts"
        ? "running"
        : isFailed && scriptDone && !audioDone
        ? "failed"
        : scriptDone
        ? "waiting"
        : "blocked",
      detail: audioDone
        ? "Généré"
        : activeOp === "tts"
        ? "ElevenLabs…"
        : !scriptDone
        ? "Nécessite le script"
        : undefined,
    },
    {
      label: "Vidéo",
      status: videoDone
        ? "done"
        : activeOp === "render" || ep.render_progress != null
        ? "running"
        : isFailed && audioDone && !videoDone
        ? "failed"
        : scriptDone
        ? "waiting"
        : "blocked",
      progress:
        activeOp === "render" || ep.render_progress != null
          ? (ep.render_progress ?? 0)
          : undefined,
      detail: videoDone
        ? "Rendu"
        : activeOp === "render"
        ? `Remotion…`
        : !scriptDone
        ? "Nécessite le script"
        : undefined,
    },
    {
      label: "Publication",
      status: published
        ? "done"
        : activeOp === "publish"
        ? "running"
        : videoDone
        ? "waiting"
        : "blocked",
      detail: published ? "Publié" : activeOp === "publish" ? "Upload YouTube…" : undefined,
    },
  ];
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ step }: { step: StepState }) {
  const cfg: Record<StepStatus, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
    done: {
      bg: "bg-green-50", border: "border-green-200", text: "text-green-700",
      icon: <CheckCircle2 size={14} className="text-green-600" />,
    },
    running: {
      bg: "bg-[#e60023]/5", border: "border-[#e60023]/20", text: "text-[#e60023]",
      icon: <Loader2 size={14} className="text-[#e60023] animate-spin" />,
    },
    failed: {
      bg: "bg-red-50", border: "border-red-200", text: "text-red-600",
      icon: <AlertCircle size={14} className="text-red-500" />,
    },
    waiting: {
      bg: "bg-white", border: "border-[#e0e0d9]", text: "text-[#62625b]",
      icon: <Clock size={14} className="text-[#91918c]" />,
    },
    blocked: {
      bg: "bg-[#f6f6f3]", border: "border-[#e0e0d9]", text: "text-[#91918c]",
      icon: <Clock size={14} className="text-[#c8c8c1]" />,
    },
  };
  const c = cfg[step.status];

  return (
    <div className={`rounded-2xl border p-3 space-y-1.5 transition-colors ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {c.icon}
          <span className={`text-xs font-semibold ${c.text}`}>{step.label}</span>
        </div>
        {step.status === "done" && <span className="text-xs text-green-600 font-medium">✓</span>}
        {step.status === "running" && step.progress != null && (
          <span className="text-xs text-[#e60023] font-mono">{step.progress}%</span>
        )}
      </div>
      {step.detail && (
        <p className={`text-xs ${c.text} opacity-80`}>{step.detail}</p>
      )}
      {step.status === "running" && step.progress != null && (
        <div className="h-1 rounded-full bg-[#e0e0d9] overflow-hidden">
          <div className="h-full rounded-full bg-[#e60023] transition-all duration-500"
            style={{ width: `${step.progress}%` }} />
        </div>
      )}
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary", scripted: "outline", translated: "outline",
  tts_done: "outline", rendered: "default", published: "default", failed: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", scripted: "Scripté", translated: "Traduit",
  tts_done: "Audio OK", rendered: "Rendu", published: "Publié", failed: "Erreur",
};

const TEMPLATE_LABELS: Record<string, string> = {
  karpathy: "Karpathy", "arabic-story": "Histoire arabe", "short-form": "Short (9:16)",
};

// ─── Action button ────────────────────────────────────────────────────────────

function ActionButton({ label, icon: Icon, onClick, disabled, variant = "default" }: {
  label: string; icon: React.ElementType; onClick: () => void;
  disabled?: boolean; variant?: "default" | "success" | "danger";
}) {
  const colors = {
    default: "bg-white border-[#e0e0d9] text-[#62625b] hover:border-[#e60023]/30 hover:bg-[#e60023]/5 hover:text-[#e60023]",
    success: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
    danger: "bg-red-50 border-red-200 text-red-600 hover:bg-red-100",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${colors[variant]}`}>
      {disabled ? <RefreshCw size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EpisodeClient({ episode: initialEpisode, scriptContent, scenes, audioFiles }: Props) {
  const router = useRouter();
  const [episode, setEpisode] = useState<EpisodeData>(initialEpisode);
  const [loading, setLoading] = useState<string | null>(null);
  const [activeOp, setActiveOp] = useState<string | null>(null); // persists across API call
  const [scriptText, setScriptText] = useState(scriptContent ?? "");
  const [editing, setEditing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishMeta, setPublishMeta] = useState({
    title: "", description: "", tags: "",
    privacyStatus: "private" as "public" | "private" | "unlisted",
  });

  // ── Universal polling: every 3s while an op is active ──────────────────────
  const activeOpRef = useRef(activeOp);
  activeOpRef.current = activeOp;

  useEffect(() => {
    // Also poll if episode is in a non-terminal transitional state
    const nonTerminal = !["draft", "published", "failed"].includes(episode.status) || activeOp !== null;
    if (!nonTerminal) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/episodes/${episode.id}`);
        if (!res.ok) return;
        const fresh = await res.json() as EpisodeData;
        setEpisode(fresh);

        // Detect step completion and clear activeOp
        const op = activeOpRef.current;
        if (op === "script" && fresh.script_path) setActiveOp(null);
        if (op === "tts" && fresh.audio_path) setActiveOp(null);
        if (op === "render" && fresh.video_path) { setActiveOp(null); toast.success("Render terminé !"); }
        if (op === "publish" && fresh.status === "published") setActiveOp(null);
        if (fresh.status === "failed") {
          setActiveOp(null);
          toast.error(`Étape échouée : ${fresh.error ?? "erreur inconnue"}`);
        }
      } catch { /* ignore network errors */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [episode.id, episode.status, activeOp]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const run = useCallback(async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    setActiveOp(key);
    try {
      await fn();
    } catch (e) {
      setActiveOp(null);
      throw e;
    } finally {
      setLoading(null);
    }
  }, []);

  const generateScript = () => run("script", async () => {
    const res = await fetch(`/api/episodes/${episode.id}/script`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast.success("Script en cours de génération…");
  });

  const generateTts = () => run("tts", async () => {
    const res = await fetch("/api/tts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeId: episode.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast.success("Audio en cours de génération…");
  });

  const renderVideo = () => run("render", async () => {
    const res = await fetch(`/api/episodes/${episode.id}/render`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quality: "preview" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast.success("Render démarré…");
  });

  const generateVisuals = () => run("visuals", async () => {
    const res = await fetch(`/api/episodes/${episode.id}/visuals`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast.success("Génération des visuels démarrée (Gemini)…");
  });

  const openPublishDialog = () => {
    setPublishMeta({ title: episode.title, description: "", tags: "", privacyStatus: "private" });
    setShowPublishDialog(true);
  };

  const confirmPublish = () => {
    setShowPublishDialog(false);
    run("publish", async () => {
      const res = await fetch(`/api/episodes/${episode.id}/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: ["youtube"],
          metadata: {
            title: publishMeta.title || episode.title,
            description: publishMeta.description,
            tags: publishMeta.tags.split(",").map((t) => t.trim()).filter(Boolean),
            privacyStatus: publishMeta.privacyStatus,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));

      const pubId = data.publications?.[0]?.id;
      if (!pubId) { toast.success("Publication créée — va sur la page Publication"); return; }

      const res2 = await fetch(`/api/publications/${pubId}/upload`, { method: "POST" });
      if (!res2.ok) { const d = await res2.json(); throw new Error(d.error); }
      toast.success("Upload YouTube démarré…");
      router.push("/publishing");
    });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/episodes/${episode.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Épisode supprimé");
      router.push("/");
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const hasScript = !!episode.script_path;
  const hasAudio = !!episode.audio_path;
  const hasVideo = !!episode.video_path;
  const isPublished = episode.status === "published";
  const steps = deriveSteps(episode, activeOp);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#211922]">{episode.title}</h1>
          <p className="text-[#91918c] text-sm mt-1 font-mono">{episode.slug}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge variant="outline" className="font-mono text-xs uppercase">{episode.language}</Badge>
          <Badge variant="outline">{TEMPLATE_LABELS[episode.template] ?? episode.template}</Badge>
          <Badge variant={STATUS_COLORS[episode.status] ?? "secondary"}>
            {STATUS_LABELS[episode.status] ?? episode.status}
          </Badge>
          <button onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-medium transition-colors">
            <Trash2 size={12} />
            Supprimer
          </button>
        </div>
      </div>

      {/* Error banner */}
      {episode.error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{episode.error}</span>
        </div>
      )}

      {/* Live pipeline status — always visible */}
      <div className="grid grid-cols-4 gap-3">
        {steps.map((step) => <StepCard key={step.label} step={step} />)}
      </div>

      {/* Source */}
      {episode.source_url && (
        <p className="text-sm text-[#62625b]">
          Source :{" "}
          <a href={episode.source_url} target="_blank" rel="noopener noreferrer"
            className="text-[#e60023] hover:underline">{episode.source_url}</a>
        </p>
      )}

      {/* Tabs */}
      <Tabs defaultValue="actions">
        <TabsList className="bg-[#f6f6f3] border border-[#e0e0d9]">
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="scenes">Scènes ({scenes.length})</TabsTrigger>
          <TabsTrigger value="audio">Audio ({audioFiles.length})</TabsTrigger>
          {hasVideo && <TabsTrigger value="video">Vidéo</TabsTrigger>}
        </TabsList>

        {/* Actions tab — now first */}
        <TabsContent value="actions" className="mt-4">
          <Card className="border-[#e0e0d9] rounded-2xl shadow-none">
            <CardHeader>
              <CardTitle className="text-sm text-[#211922]">Lancer une étape</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ActionButton label="Générer script (Claude)" icon={FileText}
                  onClick={generateScript}
                  disabled={loading === "script" || activeOp === "script" || !episode.source_url}
                  variant={hasScript ? "success" : "default"} />
                <ActionButton label="Générer audio (ElevenLabs)" icon={Volume2}
                  onClick={generateTts}
                  disabled={loading === "tts" || activeOp === "tts" || !hasScript}
                  variant={hasAudio ? "success" : "default"} />
                <ActionButton label="Générer visuels (Gemini)" icon={Image}
                  onClick={generateVisuals}
                  disabled={loading === "visuals" || activeOp === "visuals" || !hasScript}
                  variant="default" />
                <ActionButton label="Render vidéo (Remotion)" icon={Play}
                  onClick={renderVideo}
                  disabled={loading === "render" || activeOp === "render" || !hasScript}
                  variant={hasVideo ? "success" : "default"} />
                <ActionButton label="Publier sur YouTube" icon={Send}
                  onClick={openPublishDialog}
                  disabled={loading === "publish" || activeOp === "publish" || !hasVideo || isPublished}
                  variant={isPublished ? "success" : "default"} />
              </div>

              {!episode.source_url && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Pas d&apos;URL source — impossible de générer le script automatiquement.
                </p>
              )}

              <div className="pt-2 border-t border-[#e0e0d9]">
                <button onClick={() => router.refresh()}
                  className="flex items-center gap-2 text-xs text-[#91918c] hover:text-[#211922] transition-colors">
                  <RefreshCw size={12} />
                  Forcer le rechargement
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Script tab */}
        <TabsContent value="script" className="mt-4">
          <Card className="border-[#e0e0d9] rounded-2xl shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm text-[#211922]">Script Markdown</CardTitle>
              <div className="flex gap-2">
                {hasScript && !editing && (
                  <button onClick={() => setEditing(true)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-[#e0e0d9] text-[#62625b] hover:text-[#211922] hover:border-[#91918c] transition-colors">
                    Éditer
                  </button>
                )}
                {editing && (
                  <button onClick={() => setEditing(false)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-[#e0e0d9] text-[#62625b] hover:text-[#211922] transition-colors">
                    Fermer
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!hasScript ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <FileText size={28} className="text-[#e0e0d9]" />
                  <p className="text-sm text-[#91918c]">Script non encore généré.</p>
                  {episode.source_url && (
                    <button onClick={generateScript} disabled={activeOp === "script"}
                      className="text-xs px-4 py-2 rounded-2xl bg-[#e60023]/10 border border-[#e60023]/20 text-[#e60023] hover:bg-[#e60023]/20 transition-colors disabled:opacity-40">
                      {activeOp === "script" ? "Génération en cours…" : "Générer le script maintenant"}
                    </button>
                  )}
                </div>
              ) : editing ? (
                <textarea value={scriptText} onChange={(e) => setScriptText(e.target.value)}
                  className="w-full h-[500px] bg-transparent text-sm font-mono text-[#211922] resize-none outline-none leading-relaxed"
                  spellCheck={false} />
              ) : (
                <pre className="text-sm font-mono text-[#62625b] whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                  {scriptText || "(fichier vide)"}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenes tab */}
        <TabsContent value="scenes" className="mt-4">
          <Card className="border-[#e0e0d9] rounded-2xl shadow-none">
            <CardHeader><CardTitle className="text-sm text-[#211922]">Scènes Remotion</CardTitle></CardHeader>
            <CardContent>
              {scenes.length === 0 ? (
                <p className="text-sm text-[#91918c]">Aucune scène — génère le script d&apos;abord.</p>
              ) : (
                <div className="space-y-1.5">
                  {scenes.map((scene, i) => {
                    const text = scene.data ? Object.values(scene.data).filter(Boolean).join(" ").slice(0, 80) : "";
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-[#e0e0d9] bg-[#f6f6f3] text-sm">
                        <span className="text-xs font-mono text-[#91918c] w-5 shrink-0 pt-0.5">{i + 1}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{scene.type}</Badge>
                        {text && <span className="text-xs text-[#62625b] truncate">{text}…</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audio tab */}
        <TabsContent value="audio" className="mt-4">
          <Card className="border-[#e0e0d9] rounded-2xl shadow-none">
            <CardHeader><CardTitle className="text-sm text-[#211922]">Fichiers audio générés</CardTitle></CardHeader>
            <CardContent>
              {audioFiles.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Volume2 size={28} className="text-[#e0e0d9]" />
                  <p className="text-sm text-[#91918c]">Aucun audio — génère d&apos;abord le script puis lance le TTS.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {audioFiles.map((filename, i) => (
                    <div key={filename} className="flex items-center gap-3 p-3 rounded-xl border border-[#e0e0d9] bg-[#f6f6f3]">
                      <span className="text-xs font-mono text-[#91918c] w-16 shrink-0">Scène {i}</span>
                      <audio controls src={`/api/audio/${episode.id}/${filename}`} className="flex-1 h-8" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video tab */}
        {hasVideo && (
          <TabsContent value="video" className="mt-4">
            <Card className="border-[#e0e0d9] rounded-2xl shadow-none">
              <CardHeader><CardTitle className="text-sm text-[#211922]">Aperçu vidéo</CardTitle></CardHeader>
              <CardContent>
                <video controls className="w-full rounded-2xl" style={{ maxHeight: 480 }}
                  src={`/api/episodes/${episode.id}/video`}>
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <p className="text-xs text-[#91918c] font-mono">
        Créé : {new Date(episode.created_at).toLocaleString("fr-FR")} ·
        Mis à jour : {new Date(episode.updated_at).toLocaleString("fr-FR")}
      </p>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl border-[#e0e0d9]">
          <DialogHeader>
            <DialogTitle className="text-[#211922]">Publier sur YouTube</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pub-title" className="text-xs text-[#62625b]">Titre</Label>
              <Input id="pub-title" value={publishMeta.title}
                onChange={(e) => setPublishMeta((m) => ({ ...m, title: e.target.value }))}
                placeholder="Titre de la vidéo" className="rounded-2xl border-[#e0e0d9]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pub-desc" className="text-xs text-[#62625b]">Description</Label>
              <textarea id="pub-desc" value={publishMeta.description}
                onChange={(e) => setPublishMeta((m) => ({ ...m, description: e.target.value }))}
                placeholder="Description YouTube…" rows={4}
                className="w-full rounded-2xl border border-[#e0e0d9] bg-transparent px-3 py-2 text-sm text-[#211922] placeholder:text-[#91918c] outline-none focus:ring-1 focus:ring-[#e60023] resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pub-tags" className="text-xs text-[#62625b]">Tags <span className="text-[#91918c]">(séparés par des virgules)</span></Label>
              <Input id="pub-tags" value={publishMeta.tags}
                onChange={(e) => setPublishMeta((m) => ({ ...m, tags: e.target.value }))}
                placeholder="ia, tech, tutoriel" className="rounded-2xl border-[#e0e0d9]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pub-privacy" className="text-xs text-[#62625b]">Visibilité</Label>
              <select id="pub-privacy" value={publishMeta.privacyStatus}
                onChange={(e) => setPublishMeta((m) => ({ ...m, privacyStatus: e.target.value as "public" | "private" | "unlisted" }))}
                className="w-full rounded-2xl border border-[#e0e0d9] bg-transparent px-3 py-2 text-sm text-[#211922] outline-none focus:ring-1 focus:ring-[#e60023]">
                <option value="private">Privé</option>
                <option value="unlisted">Non répertorié</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowPublishDialog(false)}
              className="px-4 py-2 text-sm rounded-2xl border border-[#e0e0d9] text-[#62625b] hover:text-[#211922] transition-colors">
              Annuler
            </button>
            <button onClick={confirmPublish}
              className="px-4 py-2 text-sm rounded-2xl bg-[#e60023] text-white hover:bg-[#c0001e] transition-colors font-medium">
              Publier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-[#e0e0d9]">
          <DialogHeader>
            <DialogTitle className="text-[#211922]">Supprimer l&apos;épisode ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#62625b]">
            Cette action supprimera définitivement l&apos;épisode <strong className="text-[#211922]">{episode.title}</strong>, ainsi que son script, ses fichiers audio et sa vidéo. Impossible d&apos;annuler.
          </p>
          <DialogFooter>
            <button onClick={() => setShowDeleteDialog(false)} disabled={deleting}
              className="px-4 py-2 text-sm rounded-2xl border border-[#e0e0d9] text-[#62625b] hover:text-[#211922] transition-colors disabled:opacity-40">
              Annuler
            </button>
            <button onClick={confirmDelete} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-60">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

