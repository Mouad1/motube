import { NewEpisodeWizard } from "@/components/episodes/NewEpisodeWizard";

export default function NewEpisodePage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle vidéo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crée un épisode à partir d&apos;un article, d&apos;une vidéo YouTube ou d&apos;une histoire arabe
        </p>
      </div>
      <NewEpisodeWizard />
    </div>
  );
}
