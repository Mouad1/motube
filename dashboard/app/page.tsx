import { getDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Film, CheckCircle, Clock, TrendingUp, PlusCircle, Mic, Send } from "lucide-react";
import Link from "next/link";

function getStats() {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as n FROM episodes").get() as { n: number }).n;
  const published = (db.prepare("SELECT COUNT(*) as n FROM episodes WHERE status = 'published'").get() as { n: number }).n;
  const rendering = (db.prepare("SELECT COUNT(*) as n FROM episodes WHERE status IN ('tts_done', 'rendered')").get() as { n: number }).n;
  const draft = (db.prepare("SELECT COUNT(*) as n FROM episodes WHERE status = 'draft'").get() as { n: number }).n;
  const recent = db.prepare("SELECT * FROM episodes ORDER BY created_at DESC LIMIT 6").all() as Array<{
    id: string; title: string; status: string; template: string; created_at: string;
  }>;
  return { total, published, rendering, draft, recent };
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  scripted: "outline",
  translated: "outline",
  tts_done: "outline",
  rendered: "default",
  published: "default",
  failed: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", scripted: "Scripté", translated: "Traduit",
  tts_done: "Audio OK", rendered: "Rendu", published: "Publié", failed: "Erreur",
};

const TEMPLATE_LABELS: Record<string, string> = {
  karpathy: "Karpathy",
  "arabic-story": "Histoire arabe",
  "short-form": "Short (9:16)",
};

export default function DashboardPage() {
  const { total, published, rendering, draft, recent } = getStats();

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#211922]">Studio</h1>
          <p className="text-[#62625b] text-sm mt-1">Tableau de bord de production Instructify</p>
        </div>
        <Link
          href="/episodes/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#e60023] text-white text-sm font-medium hover:bg-[#c0001e] transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Nouvelle vidéo
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Film, label: "Total", value: total, accent: true },
          { icon: CheckCircle, label: "Publiés", value: published },
          { icon: Clock, label: "En cours", value: rendering },
          { icon: TrendingUp, label: "Brouillons", value: draft },
        ].map(({ icon: Icon, label, value, accent }) => (
          <div
            key={label}
            className={`rounded-2xl border p-5 space-y-3 ${
              accent ? "border-[#e60023]/20 bg-[#e60023]/5" : "border-[#e0e0d9] bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#91918c] uppercase tracking-wide">{label}</span>
              <Icon className={`h-4 w-4 ${accent ? "text-[#e60023]" : "text-[#91918c]"}`} />
            </div>
            <p className={`text-3xl font-bold ${accent ? "text-[#e60023]" : "text-[#211922]"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent episodes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#211922]">Épisodes récents</h2>
          <Link href="/episodes" className="text-sm text-[#e60023] hover:underline font-medium">
            Voir tout →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="border border-dashed border-[#e0e0d9] rounded-2xl p-12 text-center bg-[#f6f6f3]">
            <p className="text-[#62625b] text-sm">Aucun épisode pour l&apos;instant.</p>
            <Link href="/episodes/new" className="mt-3 inline-block text-sm text-[#e60023] hover:underline font-medium">
              Créer le premier épisode →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((ep) => (
              <Link
                key={ep.id}
                href={`/episodes/${ep.id}`}
                className="flex items-center justify-between p-4 rounded-2xl border border-[#e0e0d9] bg-white hover:border-[#e60023]/30 hover:bg-[#e60023]/5 transition-colors group"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm text-[#211922] group-hover:text-[#e60023] transition-colors">{ep.title}</p>
                  <p className="text-xs text-[#91918c]">
                    {TEMPLATE_LABELS[ep.template] ?? ep.template} ·{" "}
                    {new Date(ep.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Badge variant={STATUS_COLORS[ep.status] ?? "secondary"}>
                  {STATUS_LABELS[ep.status] ?? ep.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-semibold text-[#211922] mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { href: "/episodes/new", icon: PlusCircle, title: "Nouvelle vidéo", desc: "Article, YouTube ou histoire arabe → vidéo" },
            { href: "/voice", icon: Mic, title: "Configurer ma voix", desc: "Cloner ta voix via ElevenLabs" },
            { href: "/publishing", icon: Send, title: "Publier", desc: "Envoyer sur YouTube, TikTok & Reels" },
          ].map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="p-5 rounded-2xl border border-[#e0e0d9] bg-white hover:border-[#e60023]/30 hover:bg-[#e60023]/5 transition-colors group space-y-2"
            >
              <div className="w-9 h-9 rounded-xl bg-[#e5e5e0] flex items-center justify-center group-hover:bg-[#e60023]/10 transition-colors">
                <Icon className="h-4 w-4 text-[#62625b] group-hover:text-[#e60023] transition-colors" />
              </div>
              <p className="font-medium text-sm text-[#211922]">{title}</p>
              <p className="text-xs text-[#91918c]">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
