import React from "react";
import {
  AbsoluteFill,
  Series,
  Video,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type { CalculateMetadataFunction } from "remotion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MotionEvent {
  sceneType: "title" | "bullet_points" | "concept" | "diagram";
  data: Record<string, unknown>;
  triggerAt: number; // seconds absolute
}

export interface ConceptChunk {
  videoSrc: string;  // assets/heygen/{id}/chunk-N.mp4
  audioSrc: string;  // assets/audio/{id}/chunks/chunk-N.mp3 (fallback)
  duration: number;  // seconds
}

export interface ConceptEpisodeProps {
  chunks: ConceptChunk[];
  motionEvents: MotionEvent[];
  lang: "fr" | "en" | "ar" | "es";
  title?: string;
  [key: string]: unknown;
}

// ─── calculateMetadata ────────────────────────────────────────────────────────

export const calculateMetadata: CalculateMetadataFunction<ConceptEpisodeProps & Record<string, unknown>> = ({ props }) => {
  const totalFrames = props.chunks.reduce(
    (sum, c) => sum + Math.round(c.duration * 30),
    0
  );
  return { durationInFrames: Math.max(totalFrames, 90) };
};

// ─── Overlay components ───────────────────────────────────────────────────────

const TitleOverlay: React.FC<{ data: Record<string, unknown>; frame: number; fps: number }> = ({ data, frame, fps }) => {
  const progress = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: 60, pointerEvents: "none" }}>
      <div style={{
        background: "rgba(0,0,0,0.7)",
        borderRadius: 12,
        padding: "20px 32px",
        transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
        opacity: progress,
        maxWidth: 900,
      }}>
        <div style={{ color: "#ffffff", fontSize: 42, fontWeight: 700, fontFamily: "sans-serif" }}>
          {String(data.title ?? "")}
        </div>
        {data.subtitle != null && (
          <div style={{ color: "#aaaaff", fontSize: 26, marginTop: 8, fontFamily: "sans-serif" }}>
            {String(data.subtitle)}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const BulletOverlay: React.FC<{ data: Record<string, unknown>; frame: number; fps: number }> = ({ data, frame, fps }) => {
  const bullets = Array.isArray(data.bullets) ? (data.bullets as string[]) : [];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", padding: 60, pointerEvents: "none" }}>
      <div style={{
        background: "rgba(0,0,0,0.75)",
        borderRadius: 16,
        padding: "24px 36px",
        width: 700,
      }}>
        <div style={{ color: "#ffffff", fontSize: 28, fontWeight: 600, marginBottom: 16, fontFamily: "sans-serif" }}>
          {String(data.heading ?? "")}
        </div>
        {bullets.map((b, i) => {
          const itemProgress = spring({ frame: Math.max(0, frame - i * 8), fps, config: { damping: 15 } });
          return (
            <div key={i} style={{
              color: "#e0e0e0",
              fontSize: 22,
              marginBottom: 10,
              opacity: itemProgress,
              transform: `translateX(${interpolate(itemProgress, [0, 1], [-20, 0])}px)`,
              fontFamily: "sans-serif",
            }}>
              • {b}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Overlay dispatcher ───────────────────────────────────────────────────────

const Overlay: React.FC<{ event: MotionEvent; frame: number; fps: number }> = ({ event, frame, fps }) => {
  const localFrame = frame - Math.round(event.triggerAt * fps);
  if (localFrame < 0) return null;

  switch (event.sceneType) {
    case "title": return <TitleOverlay data={event.data} frame={localFrame} fps={fps} />;
    case "bullet_points": return <BulletOverlay data={event.data} frame={localFrame} fps={fps} />;
    default: return null;
  }
};

// ─── Main composition ─────────────────────────────────────────────────────────

export const ConceptEpisode: React.FC<ConceptEpisodeProps> = ({ chunks, motionEvents }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const offsets: number[] = [];
  let acc = 0;
  for (const chunk of chunks) {
    offsets.push(acc);
    acc += Math.round(chunk.duration * fps);
  }

  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      <Series>
        {chunks.map((chunk, i) => {
          const chunkDurationFrames = Math.round(chunk.duration * fps);
          const chunkStartFrame = offsets[i];

          return (
            <Series.Sequence key={i} durationInFrames={chunkDurationFrames}>
              <Video
                src={staticFile(chunk.videoSrc)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {motionEvents
                .filter(e => {
                  const eFrame = Math.round(e.triggerAt * fps);
                  return eFrame >= chunkStartFrame && eFrame < chunkStartFrame + chunkDurationFrames;
                })
                .map((event, j) => (
                  <Overlay
                    key={j}
                    event={{ ...event, triggerAt: event.triggerAt - chunkStartFrame / fps }}
                    frame={frame}
                    fps={fps}
                  />
                ))}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
