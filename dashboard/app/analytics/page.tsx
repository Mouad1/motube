"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Eye, Clock, DollarSign, RefreshCw, PlayCircle } from "lucide-react";

interface AnalyticsData {
  days: number;
  snapshots: Array<{
    date: string;
    views: number;
    watchTimeMinutes: number;
    estimatedRevenue: number;
    ctr: number;
  }>;
  platformStats: Array<{ platform: string; count: number; published: number }>;
  totals: { totalViews: number; totalWatchTime: number; totalRevenue: number };
  topVideos: Array<{
    id: string; title: string; template: string;
    platform: string; url: string | null;
    views: number; revenue: number;
  }>;
}

const PERIODS = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
  { label: "90 jours", value: 90 },
];

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-white/50">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ["analytics", days],
    queryFn: () => fetch(`/api/analytics?days=${days}`).then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/analytics/sync", { method: "POST" });
    setTimeout(() => { setSyncing(false); refetch(); }, 5000);
  };

  const totals = data?.totals ?? { totalViews: 0, totalWatchTime: 0, totalRevenue: 0 };
  const snapshots = (data?.snapshots ?? []).map((s) => ({
    ...s,
    date: s.date.slice(5),
    estimatedRevenue: parseFloat((s.estimatedRevenue ?? 0).toFixed(2)),
  }));

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-white/50 text-sm mt-1">Performance de la chaîne Instructify</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {PERIODS.map((opt) => (
              <button key={opt.value} onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  days === opt.value ? "bg-teal-500 text-black font-medium" : "text-white/50 hover:text-white"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            Sync YouTube
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Vues totales" value={fmtNum(totals.totalViews)}
          sub={`${days} derniers jours`} color="bg-teal-600" />
        <StatCard icon={Clock} label="Watch time" value={`${Math.floor(totals.totalWatchTime / 60)}h`}
          sub="heures" color="bg-blue-600" />
        <StatCard icon={DollarSign} label="Revenue estimé" value={`$${totals.totalRevenue.toFixed(2)}`}
          sub="USD AdSense" color="bg-green-600" />
        <StatCard icon={TrendingUp} label="RPM moyen"
          value={totals.totalViews > 0 ? `$${((totals.totalRevenue / totals.totalViews) * 1000).toFixed(2)}` : "$0.00"}
          sub="par 1000 vues" color="bg-purple-600" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-white/30">Chargement...</div>
      ) : (
        <>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-medium text-white/70 mb-4">Vues par jour</h2>
            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-white/30 text-sm gap-2">
                <PlayCircle size={32} className="opacity-30" />
                <p>Aucune donnée — connecte YouTube et lance une sync</p>
                <a href="/api/auth/youtube" className="text-teal-400 hover:underline text-xs">
                  Connecter YouTube →
                </a>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={snapshots}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    labelStyle={{ color: "rgba(255,255,255,0.7)" }} itemStyle={{ color: "#14b8a6" }} />
                  <Area type="monotone" dataKey="views" stroke="#14b8a6" fill="url(#viewsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-medium text-white/70 mb-4">Revenue estimé (USD/jour)</h2>
            {snapshots.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-white/30 text-sm">
                Aucune donnée de revenu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Revenue"]} />
                  <Bar dataKey="estimatedRevenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {(data?.platformStats?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-sm font-medium text-white/70 mb-4">Publications par plateforme</h2>
              <div className="flex flex-wrap gap-4">
                {data!.platformStats.map((p) => (
                  <div key={p.platform} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-white font-medium capitalize">{p.platform}</span>
                    <span className="text-white/40 text-sm">{p.published}/{p.count} publiées</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data?.topVideos?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-sm font-medium text-white/70 mb-4">Top vidéos</h2>
              <div className="space-y-2">
                {data!.topVideos.map((v) => (
                  <div key={`${v.id}-${v.platform}`}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs bg-white/10 text-white/50 rounded px-2 py-0.5 shrink-0 capitalize">{v.template}</span>
                      {v.url ? (
                        <a href={v.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-white hover:text-teal-400 truncate">{v.title}</a>
                      ) : (
                        <span className="text-sm text-white truncate">{v.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      <span className="text-sm text-white/50">{fmtNum(v.views)} vues</span>
                      <span className="text-sm text-green-400">${v.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
