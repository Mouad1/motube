import { getDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  scripted: "outline",
  translated: "outline",
  tts_done: "outline",
  rendered: "default",
  published: "default",
  failed: "destructive",
};

const TEMPLATE_LABELS: Record<string, string> = {
  karpathy: "Karpathy",
  "arabic-story": "Histoire arabe",
  "short-form": "Short",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  scripted: "Scripté",
  translated: "Traduit",
  tts_done: "Audio OK",
  rendered: "Rendu",
  published: "Publié",
  failed: "Erreur",
};

function getEpisodes(status?: string) {
  const db = getDb();
  if (status) {
    return db.prepare("SELECT * FROM episodes WHERE status = ? ORDER BY created_at DESC").all(status) as Array<{
      id: string; title: string; slug: string; status: string; template: string;
      language: string; source_type: string | null; created_at: string;
    }>;
  }
  return db.prepare("SELECT * FROM episodes ORDER BY created_at DESC").all() as Array<{
    id: string; title: string; slug: string; status: string; template: string;
    language: string; source_type: string | null; created_at: string;
  }>;
}

export default function EpisodesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // In Next.js 16+, searchParams is a Promise
  // For server components we use the synchronous form via awaited in the page body
  // Since we can't use async in RSC without making the whole component async, let's make it async
  return <EpisodesContent searchParams={searchParams} />;
}

async function EpisodesContent({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const episodes = getEpisodes(status);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Épisodes</h1>
          <p className="text-muted-foreground text-sm mt-1">{episodes.length} épisode{episodes.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/episodes/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Nouvelle vidéo
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {[undefined, "draft", "rendered", "published", "failed"].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/episodes?status=${s}` : "/episodes"}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              status === s
                ? "bg-[#6ee7b7]/10 border-[#6ee7b7]/50 text-[#6ee7b7]"
                : "border-border text-muted-foreground hover:border-[#6ee7b7]/30"
            }`}
          >
            {s ? STATUS_LABELS[s] : "Tous"}
          </Link>
        ))}
      </div>

      {/* Table */}
      {episodes.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">Aucun épisode trouvé.</p>
          <Link href="/episodes/new" className="mt-3 inline-block text-sm text-[#6ee7b7] hover:underline">
            Créer le premier →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Titre</th>
                <th className="text-left px-4 py-3 font-medium">Template</th>
                <th className="text-left px-4 py-3 font-medium">Langue</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-left px-4 py-3 font-medium">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {episodes.map((ep) => (
                <tr key={ep.id} className="hover:bg-[#6ee7b7]/5 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/episodes/${ep.id}`} className="font-medium hover:text-[#6ee7b7] transition-colors">
                      {ep.title}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{ep.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {TEMPLATE_LABELS[ep.template] ?? ep.template}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono uppercase text-xs">
                    {ep.language}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[ep.status] ?? "secondary"}>
                      {STATUS_LABELS[ep.status] ?? ep.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(ep.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
