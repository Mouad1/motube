import { AbsoluteFill, Series, Audio, staticFile, type CalculateMetadataFunction } from "remotion";
import { TitleScene } from "../scenes/TitleScene";
import { CodeScene } from "../scenes/CodeScene";
import { ConceptScene } from "../scenes/ConceptScene";
import { TransitionScene } from "../scenes/TransitionScene";
import { BulletPointScene } from "../scenes/BulletPointScene";
import { DiagramScene } from "../scenes/DiagramScene";
import { CodeWalkthrough } from "../scenes/CodeWalkthrough";

export type SceneType =
  | { type: "title"; data: { title: string; subtitle?: string; audioPath?: string; imagePath?: string } }
  | { type: "code"; data: { code: string; language: string; explanation: string; audioPath?: string; imagePath?: string } }
  | { type: "concept"; data: { heading: string; body: string; visual?: string; audioPath?: string; imagePath?: string } }
  | { type: "transition"; data: { text: string; audioPath?: string; imagePath?: string } }
  | {
      type: "bullet_points";
      data: {
        heading: string;
        bullets: Array<{ text: string; icon?: string }>;
        audioPath?: string;
        imagePath?: string;
      };
    }
  | {
      type: "diagram";
      data: {
        heading: string;
        nodes: Array<{ id: string; label: string; x: number; y: number; color?: string }>;
        edges: Array<{ from: string; to: string; label?: string }>;
        caption?: string;
        audioPath?: string;
        imagePath?: string;
      };
    }
  | {
      type: "code_walkthrough";
      data: {
        code: string;
        language: string;
        steps: Array<{ highlightLines: number[]; explanation: string }>;
        audioPath?: string;
        imagePath?: string;
      };
    };

export interface EpisodeProps {
  title: string;
  scenes: Array<SceneType & { durationInFrames?: number }>;
}

const DEFAULT_DURATIONS: Record<SceneType["type"], number> = {
  title: 150,
  code: 300,
  concept: 240,
  transition: 90,
  bullet_points: 270,
  diagram: 360,
  code_walkthrough: 420,
};

export const calculateMetadata: CalculateMetadataFunction<EpisodeProps> = ({ props }) => {
  const total = props.scenes.reduce(
    (sum, s) => sum + (s.durationInFrames ?? DEFAULT_DURATIONS[s.type] ?? 150),
    0
  );
  return { durationInFrames: Math.max(total, 30) };
};

export const KarpathyEpisode: React.FC<EpisodeProps> = ({ title, scenes }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d" }}>
      <Series>
        {scenes.map((scene, i) => {
          const duration = scene.durationInFrames ?? DEFAULT_DURATIONS[scene.type];
          const audioPath = scene.data.audioPath as string | undefined;
          return (
            <Series.Sequence key={i} durationInFrames={duration}>
              {audioPath && (
                <Audio src={staticFile(audioPath)} />
              )}
              {scene.type === "title" && (
                <TitleScene {...scene.data} episodeTitle={title} imagePath={scene.data.imagePath} />
              )}
              {scene.type === "code" && <CodeScene {...scene.data} />}
              {scene.type === "concept" && <ConceptScene {...scene.data} imagePath={scene.data.imagePath} />}
              {scene.type === "transition" && <TransitionScene {...scene.data} />}
              {scene.type === "bullet_points" && (
                <BulletPointScene {...scene.data} imagePath={scene.data.imagePath} />
              )}
              {scene.type === "diagram" && <DiagramScene {...scene.data} />}
              {scene.type === "code_walkthrough" && (
                <CodeWalkthrough {...scene.data} />
              )}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
