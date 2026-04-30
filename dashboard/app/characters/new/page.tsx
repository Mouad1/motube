"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FormState {
  slug: string;
  name: string;
  description: string;
  style_prompt: string;
  negative_prompt: string;
  base_seed: string;
  generate_sheet: boolean;
}

export default function NewCharacterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    slug: "",
    name: "",
    description: "",
    style_prompt: "",
    negative_prompt: "",
    base_seed: "",
    generate_sheet: true,
  });

  const create = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        slug: form.slug,
        name: form.name,
        style_prompt: form.style_prompt,
        generate_sheet: form.generate_sheet,
      };
      if (form.description.trim()) body.description = form.description;
      if (form.negative_prompt.trim()) body.negative_prompt = form.negative_prompt;
      if (form.base_seed.trim()) body.base_seed = parseInt(form.base_seed, 10);

      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? "Failed");
      return json;
    },
    onSuccess: (json) => {
      toast.success(form.generate_sheet ? "Character created — sheet generation started" : "Character created");
      router.push(`/characters/${json.character.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#211922] mb-1">New character</h1>
      <p className="text-sm text-[#62625b] mb-6">
        Define the visual DNA. Style prompt + base seed = consistent renders across episodes.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#211922] mb-1">Slug</label>
            <input
              required
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="sara"
              className="w-full px-3 py-2 border border-[#e0e0d9] rounded-xl text-sm focus:outline-none focus:border-[#e60023]"
            />
            <p className="text-xs text-[#91918c] mt-1">lowercase, hyphens — used as identifier</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#211922] mb-1">Display name</label>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Sara"
              className="w-full px-3 py-2 border border-[#e0e0d9] rounded-xl text-sm focus:outline-none focus:border-[#e60023]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#211922] mb-1">Description (optional)</label>
          <input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Friendly Moroccan teacher, 28 years old"
            className="w-full px-3 py-2 border border-[#e0e0d9] rounded-xl text-sm focus:outline-none focus:border-[#e60023]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#211922] mb-1">
            Style prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={form.style_prompt}
            onChange={(e) => set("style_prompt", e.target.value)}
            rows={4}
            placeholder="young Moroccan woman with curly black hair, warm brown eyes, friendly smile, illustrated 2D cartoon style, flat shading, vibrant warm colors"
            className="w-full px-3 py-2 border border-[#e0e0d9] rounded-xl text-sm focus:outline-none focus:border-[#e60023] font-mono"
          />
          <p className="text-xs text-[#91918c] mt-1">This is the visual DNA. Be specific about features, art style, palette.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#211922] mb-1">Negative prompt (optional)</label>
          <textarea
            value={form.negative_prompt}
            onChange={(e) => set("negative_prompt", e.target.value)}
            rows={2}
            placeholder="realistic photo, photorealistic, 3D render"
            className="w-full px-3 py-2 border border-[#e0e0d9] rounded-xl text-sm focus:outline-none focus:border-[#e60023] font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#211922] mb-1">Base seed (optional)</label>
          <input
            type="number"
            value={form.base_seed}
            onChange={(e) => set("base_seed", e.target.value)}
            placeholder="auto-generated if blank"
            className="w-full px-3 py-2 border border-[#e0e0d9] rounded-xl text-sm focus:outline-none focus:border-[#e60023]"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="gen"
            checked={form.generate_sheet}
            onChange={(e) => set("generate_sheet", e.target.checked)}
          />
          <label htmlFor="gen" className="text-sm text-[#211922]">
            Generate character sheet immediately (7 reference images)
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#e60023] hover:bg-[#c0001a] text-white px-5 py-2 text-sm font-medium disabled:opacity-50"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create character
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-[#e0e0d9] px-5 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
