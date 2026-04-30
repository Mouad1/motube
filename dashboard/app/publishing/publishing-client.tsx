"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, Upload, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "🎬",
  tiktok: "🎵",
  instagram: "📸",
  twitter: "🐦",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: "En attente", color: "text-yellow-400 bg-yellow-400/10", icon: Clock },
  uploading: { label: "Upload...",   color: "text-blue-400 bg-blue-400/10",   icon: RefreshCw },
  published: { label: "Publié",      color: "text-green-400 bg-green-400/10", icon: CheckCircle },
  failed:    { label: "Échec",       color: "text-red-400 bg-red-400/10",     icon: XCircle },
};

interface Publication {
  id: string;
  episode_title: string;
  platform: string;
  status: string;
  url: string | null;
  published_at: string | null;
  created_at: string;
  video_path: string | null;
}

interface Props {
  isYouTubeConnected: boolean;
  publications: Publication[];
  pendingCount: number;
  publishedCount: number;
  failedCount: number;
}

export default function PublishingClient({
  isYouTubeConnected,
  publications,
  pendingCount,
  publishedCount,
  failedCount,
}: Props) {
  const [publishing, setPublishing] = useState<string | null>(null);

  const handlePublish = async (pubId: string) => {
    setPublishing(pubId);
    try {
      const res = await fetch(`/api/publications/${pubId}/upload`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      toast.success("Upload démarré en arrière-plan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Publication</h1>
          <p className="text-white/50 text-sm mt-1">Gérer la publication sur YouTube et les réseaux sociaux</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-white/50">{pendingCount} en attente</span>
          <span className="text-green-400">{publishedCount} publiées</span>
          {failedCount > 0 && <span className="text-red-400">{failedCount} échouées</span>}
        </div>
      </div>

      {/* Platform status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["youtube", "tiktok", "instagram", "twitter"] as const).map((platform) => {
          const connected = platform === "youtube" ? isYouTubeConnected : false;
          return (
            <div key={platform} className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
              <span className="text-2xl">{PLATFORM_ICONS[platform]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-white capitalize">{platform}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${
                  connected ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"
                }`}>
                  {connected ? "Connecté" : "Non connecté"}
                </span>
              </div>
              {platform === "youtube" && !connected && (
                <a href="/api/auth/youtube"
                  className="text-xs text-teal-400 hover:text-teal-300 shrink-0">
                  Connecter →
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* YouTube setup guide (if not connected) */}
      {!isYouTubeConnected && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-6">
          <h2 className="text-sm font-semibold text-teal-400 mb-3">Setup YouTube OAuth</h2>
          <ol className="space-y-2 text-sm text-white/60 list-decimal list-inside">
            <li>Ajoute <code className="text-white/80 bg-white/10 px-1 rounded">YOUTUBE_CLIENT_ID</code> et{" "}
              <code className="text-white/80 bg-white/10 px-1 rounded">YOUTUBE_CLIENT_SECRET</code> dans <code className="text-white/80 bg-white/10 px-1 rounded">.env.local</code></li>
            <li>URI de redirection dans Google Cloud Console :{" "}
              <code className="text-white/80 bg-white/10 px-1 rounded">http://localhost:3000/api/auth/youtube/callback</code></li>
            <li>Clique sur <strong className="text-white">"Connecter"</strong> à côté de YouTube ci-dessus</li>
          </ol>
        </div>
      )}

      {/* Publications list */}
      <div>
        <h2 className="text-sm font-medium text-white/70 mb-4">File de publication</h2>
        {publications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
            <Upload size={28} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/30 text-sm">Aucune publication — rends et publie un épisode d&apos;abord</p>
          </div>
        ) : (
          <div className="space-y-2">
            {publications.map((pub) => {
              const status = STATUS_CONFIG[pub.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              const canUpload = pub.status === "pending" && pub.platform === "youtube" && isYouTubeConnected;

              return (
                <div key={pub.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors">
                  <span className="text-xl shrink-0">{PLATFORM_ICONS[pub.platform] ?? "📤"}</span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pub.episode_title}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {pub.platform} · {new Date(pub.created_at).toLocaleDateString("fr-FR")}
                      {pub.published_at && ` · publié le ${new Date(pub.published_at).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {pub.url && (
                      <a href={pub.url} target="_blank" rel="noopener noreferrer"
                        className="text-teal-400 hover:text-teal-300 transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    )}

                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${status.color}`}>
                      <StatusIcon size={11} className={pub.status === "uploading" ? "animate-spin" : ""} />
                      {status.label}
                    </span>

                    {canUpload && (
                      <button
                        onClick={() => handlePublish(pub.id)}
                        disabled={publishing === pub.id}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-500 text-black font-medium hover:bg-teal-400 transition-colors disabled:opacity-50">
                        {publishing === pub.id ? (
                          <RefreshCw size={11} className="animate-spin" />
                        ) : (
                          <Upload size={11} />
                        )}
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
