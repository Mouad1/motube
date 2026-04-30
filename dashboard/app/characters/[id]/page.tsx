"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Character {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  style_prompt: string;
  negative_prompt: string | null;
  base_seed: number;
  image_provider: string;
  video_provider: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Sheet {
  id: string;
  character_id: string;
  kind: string;
  image_path: string;
  prompt_used: string;
  seed_used: number;
  version: number;
  created_at: string;
}

function imgUrl(p: string) {
  return "/api/images/" + p.replace(/^assets\/images\//, "");
}

export default function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ character: Character; sheets: Sheet[] }>({
    queryKey: ["character", id],
    queryFn: () => fetch(`/api/characters/${id}`).then((r) => r.json()),
    refetchInterval: (q) => (q.state.data?.character.status === "sheet_pending" ? 2500 : false),
  });

  const regen = useMutation({
    mutationFn: (regenerate: boolean) =>
      fetch(`/api/characters/${id}/sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Failed");
        return j;
      }),
    onSuccess: () => {
      toast.success("Sheet generation started");
      qc.invalidateQueries({ queryKey: ["character", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => fetch(`/api/characters/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Deleted");
      router.push("/characters");
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-[#62625b]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!data) return <div className="p-8">Not found</div>;

  const { character, sheets } = data;
  const isPending = character.status === "sheet_pending";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/characters" className="inline-flex items-center gap-1 text-sm text-[#62625b] hover:text-[#211922] mb-4">
        <ArrowLeft className="h-3 w-3" /> Back
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#211922]">{character.name}</h1>
          <p className="text-sm text-[#91918c] mt-1">
            slug <code className="bg-[#f6f6f3] px-1.5 py-0.5 rounded">{character.slug}</code>
            {" · "}seed {character.base_seed} · v{character.version} · status{" "}
            <span className={
              character.status === "ready" ? "text-green-600"
              : character.status === "sheet_pending" ? "text-amber-600"
              : character.status === "failed" ? "text-red-600"
              : "text-gray-600"
            }>{character.status}</span>
          </p>
          {character.description && (
            <p className="text-sm text-[#62625b] mt-2 max-w-2xl">{character.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            disabled={isPending || regen.isPending}
            onClick={() => regen.mutate(false)}
            className="inline-flex items-center gap-2 text-sm rounded-2xl border border-[#e0e0d9] px-3 py-1.5 hover:bg-[#f6f6f3] disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {isPending ? "Generating…" : "Generate missing"}
          </button>
          <button
            disabled={isPending || regen.isPending}
            onClick={() => {
              if (confirm("Regenerate ALL sheets? Existing images will be replaced.")) regen.mutate(true);
            }}
            className="inline-flex items-center gap-2 text-sm rounded-2xl border border-[#e0e0d9] px-3 py-1.5 hover:bg-[#f6f6f3] disabled:opacity-50"
          >
            Regenerate all
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${character.name}"?`)) del.mutate();
            }}
            className="text-sm rounded-2xl border border-red-200 text-red-600 px-3 py-1.5 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="border border-[#e0e0d9] rounded-2xl p-4 bg-[#f6f6f3] mb-6">
        <p className="text-xs uppercase tracking-wide text-[#91918c] mb-1">Style prompt</p>
        <p className="text-sm font-mono text-[#211922] whitespace-pre-wrap">{character.style_prompt}</p>
        {character.negative_prompt && (
          <>
            <p className="text-xs uppercase tracking-wide text-[#91918c] mt-3 mb-1">Negative</p>
            <p className="text-sm font-mono text-[#211922] whitespace-pre-wrap">{character.negative_prompt}</p>
          </>
        )}
      </div>

      <h2 className="text-lg font-semibold text-[#211922] mb-3">
        Character sheet ({sheets.length} {sheets.length === 1 ? "image" : "images"})
      </h2>
      {sheets.length === 0 ? (
        <div className="border border-dashed border-[#e0e0d9] rounded-2xl p-12 text-center text-[#62625b]">
          {isPending ? "Generating reference images…" : "No sheets yet — click Generate above."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sheets.map((s) => (
            <div key={s.id} className="border border-[#e0e0d9] rounded-xl overflow-hidden bg-white">
              <div className="aspect-square bg-[#f6f6f3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl(s.image_path)} alt={s.kind} className="w-full h-full object-cover" />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-[#211922]">{s.kind}</p>
                <p className="text-[10px] text-[#91918c]">seed {s.seed_used} · v{s.version}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
