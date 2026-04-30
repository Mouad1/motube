import { AbsoluteFill, Series } from "remotion";
import { HookScene, PointScene, CtaScene } from "../scenes/ShortFormScene";

export type ShortSceneType =
  | { type: "hook"; data: { headline: string; subtext?: string; audioSrc?: string } }
  | { type: "point"; data: { text: string; icon?: string; audioSrc?: string } }
  | { type: "cta"; data: { text: string; channelHandle: string; audioSrc?: string } };

export interface ShortFormProps {
  title: string;
  language?: string;
  channelHandle?: string;
  scenes: Array<ShortSceneType & { durationInFrames?: number }>;
  [key: string]: unknown;
}

const DEFAULT_DURATIONS: Record<ShortSceneType["type"], number> = {
  hook: 150,  // 5s
  point: 120, // 4s
  cta: 150,   // 5s
};

export const ShortFormEpisode: React.FC<ShortFormProps> = ({ scenes }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
      <Series>
        {scenes.map((scene, i) => {
          const duration = scene.durationInFrames ?? DEFAULT_DURATIONS[scene.type];
          return (
            <Series.Sequence key={i} durationInFrames={duration}>
              {scene.type === "hook" && <HookScene {...scene.data} />}
              {scene.type === "point" && <PointScene {...scene.data} />}
              {scene.type === "cta" && <CtaScene {...scene.data} />}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
