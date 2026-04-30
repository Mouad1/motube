"use client";

import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Job {
  id: string;
  queue: string;
  name: string;
  state: string;
  data: { episodeId?: string };
  progress: number;
  failedReason?: string;
  timestamp: number;
}

const QUEUE_LABELS: Record<string, string> = {
  "render-queue": "Render",
  "tts-queue": "TTS",
  "publish-queue": "Publication",
};

const STATE_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  waiting: "secondary",
  delayed: "outline",
  failed: "destructive",
};

export function RenderProgress({ episodeId }: { episodeId?: string }) {
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["queue", episodeId],
    queryFn: async () => {
      const res = await fetch("/api/queue");
      return res.json() as Promise<Job[]>;
    },
    refetchInterval: 3000, // poll every 3s
    enabled: true,
  });

  const relevant = episodeId
    ? jobs.filter((j) => j.data?.episodeId === episodeId)
    : jobs;

  if (relevant.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Jobs en cours</h3>
      {relevant.map((job) => (
        <div key={job.id} className="p-3 rounded-lg border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {QUEUE_LABELS[job.queue] ?? job.queue}
              </Badge>
              <span className="text-sm">{job.name}</span>
            </div>
            <Badge variant={STATE_COLORS[job.state] ?? "secondary"} className="text-xs">
              {job.state}
            </Badge>
          </div>

          {typeof job.progress === "number" && job.progress > 0 && (
            <div className="space-y-1">
              <Progress value={job.progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-right">{job.progress}%</p>
            </div>
          )}

          {job.failedReason && (
            <p className="text-xs text-destructive">{job.failedReason}</p>
          )}
        </div>
      ))}
    </div>
  );
}
