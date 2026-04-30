"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Character {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  base_seed: number;
  image_provider: string;
  version: number;
  thumbnail: string | null;
  created_at: string;
}

function statusBadge(status: string) {
  const cls =
    status === "ready" ? "bg-green-500/15 text-green-700"
    : status === "sheet_pending" ? "bg-amber-500/15 text-amber-700"
    : status === "failed" ? "bg-red-500/15 text-red-700"
    : "bg-gray-500/15 text-gray-700";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${cls}`}>{status}</span>;
}

function thumbToUrl(thumb: string | null): string | null {
  if (!thumb) return null;
  // image_path stored as "assets/images/characters/sara-front-v1.png"
  return "/api/images/" + thumb.replace(/^assets\/images\//, "");
}

export default function CharactersPage() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery<{ characters: Character[] }>({
    queryKey: ["characters"],
    queryFn: () => fetch("/api/characters").then((r) => r.json()),
    refetchInterval: 5000, // poll while sheets are generating
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/characters/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Character deleted");
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  const characters = data?.characters ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#211922]">Characters</h1>
          <p className="text-sm text-[#62625b] mt-1">
            Reusable visual DNA — fixed seed + style prompt → consistent appearance across episodes.
          </p>
        </div>
        <Link
          href="/characters/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#e60023] hover:bg-[#c0001a] text-white px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New character
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-[#62625b]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : characters.length === 0 ? (
        <div className="border border-dashed border-[#e0e0d9] rounded-2xl p-12 text-center text-[#62625b]">
          No characters yet. Create one to start producing consistent videos.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((c) => (
            <div key={c.id} className="border border-[#e0e0d9] rounded-2xl overflow-hidden bg-white">
              <Link href={`/characters/${c.id}`} className="block">
                <div className="aspect-square bg-[#f6f6f3] flex items-center justify-center overflow-hidden">
                  {thumbToUrl(c.thumbnail) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbToUrl(c.thumbnail)!} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#91918c] text-sm">No sheet yet</span>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/characters/${c.id}`} className="font-medium text-[#211922] hover:underline truncate block">
                      {c.name}
                    </Link>
                    <p className="text-xs text-[#91918c] truncate">{c.slug} · seed {c.base_seed} · v{c.version}</p>
                  </div>
                  {statusBadge(c.status)}
                </div>
                {c.description && (
                  <p className="text-sm text-[#62625b] mt-2 line-clamp-2">{c.description}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/characters/${c.id}`}
                    className="text-xs px-3 py-1 rounded-full border border-[#e0e0d9] hover:bg-[#f6f6f3]"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete character "${c.name}"? This removes all sheets.`)) del.mutate(c.id);
                    }}
                    className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
