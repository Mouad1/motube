import { AbsoluteFill, Series } from "remotion";
import { ArabicTitleScene } from "../scenes/ArabicTitleScene";
import { ArabicNarratorScene } from "../scenes/ArabicNarratorScene";
import { ArabicDialogueScene } from "../scenes/ArabicDialogueScene";
import { TransitionScene } from "../scenes/TransitionScene";

export type ArabicSceneType =
  | {
      type: "arabic-title";
      data: { arabicTitle: string; translatedTitle: string; lottieSrc?: string };
    }
  | {
      type: "arabic-narrator";
      data: { arabicText: string; translatedText: string; lottieSrc?: string; audioSrc?: string };
    }
  | {
      type: "arabic-dialogue";
      data: {
        speaker: string;
        arabicLine: string;
        translatedLine: string;
        lottieSrc?: string;
        audioSrc?: string;
      };
    }
  | { type: "transition"; data: { text: string } };

export interface ArabicEpisodeProps {
  title: string;
  language?: string;
  scenes: Array<ArabicSceneType & { durationInFrames?: number }>;
  [key: string]: unknown;
}

const DEFAULT_DURATIONS: Record<ArabicSceneType["type"], number> = {
  "arabic-title": 150,    // 5s
  "arabic-narrator": 300, // 10s
  "arabic-dialogue": 240, // 8s
  transition: 90,         // 3s
};

export const ArabicStoryEpisode: React.FC<ArabicEpisodeProps> = ({ title, scenes }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
      <Series>
        {scenes.map((scene, i) => {
          const duration = scene.durationInFrames ?? DEFAULT_DURATIONS[scene.type];
          return (
            <Series.Sequence key={i} durationInFrames={duration}>
              {scene.type === "arabic-title" && (
                <ArabicTitleScene {...scene.data} />
              )}
              {scene.type === "arabic-narrator" && (
                <ArabicNarratorScene {...scene.data} />
              )}
              {scene.type === "arabic-dialogue" && (
                <ArabicDialogueScene {...scene.data} />
              )}
              {scene.type === "transition" && (
                <TransitionScene {...scene.data} />
              )}
            </Series.Sequence>
          );
        })}
      </Series>

      {/* Persistent watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          right: 48,
          color: "#6ee7b7",
          fontFamily: "monospace",
          fontSize: 20,
          opacity: 0.4,
          letterSpacing: 2,
        }}
      >
        motube · {title}
      </div>
    </AbsoluteFill>
  );
};
