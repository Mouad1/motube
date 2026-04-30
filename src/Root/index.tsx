import { Composition, registerRoot } from "remotion";
import { KarpathyEpisode, calculateMetadata as karpathyMeta } from "../compositions/templates/KarpathyEpisode";
import type { EpisodeProps } from "../compositions/templates/KarpathyEpisode";
import { ArabicStoryEpisode } from "../compositions/templates/ArabicStoryEpisode";
import type { ArabicEpisodeProps } from "../compositions/templates/ArabicStoryEpisode";
import { ShortFormEpisode } from "../compositions/templates/ShortFormEpisode";
import type { ShortFormProps } from "../compositions/templates/ShortFormEpisode";
import { ConceptEpisode, calculateMetadata as conceptMeta } from "../compositions/templates/ConceptEpisode";
import type { ConceptEpisodeProps } from "../compositions/templates/ConceptEpisode";
import { StickFigureEpisode, calculateMetadata as stickFigureMeta } from "../compositions/templates/StickFigureEpisode";
import type { StickFigureEpisodeProps } from "../compositions/templates/StickFigureEpisode";

const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Karpathy style (technical education, 16:9, 1920x1080) ─────── */}
      <Composition
        id="KarpathyEpisode"
        component={KarpathyEpisode}
        calculateMetadata={karpathyMeta}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={
          {
            title: "Episode sans titre",
            scenes: [],
          } satisfies EpisodeProps
        }
      />

      {/* ── Arabic story (animated, 16:9, 1920x1080) ──────────────────── */}
      <Composition
        id="ArabicStoryEpisode"
        component={ArabicStoryEpisode}
        durationInFrames={30 * 60 * 8}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={
          {
            title: "قصة",
            language: "ar",
            scenes: [
              {
                type: "arabic-title",
                data: {
                  arabicTitle: "عنوان القصة",
                  translatedTitle: "Story Title",
                },
                durationInFrames: 150,
              },
            ],
          } satisfies ArabicEpisodeProps
        }
      />

      {/* ── Short form (vertical 9:16, 1080x1920 — TikTok / Reels) ────── */}
      <Composition
        id="ShortFormEpisode"
        component={ShortFormEpisode}
        durationInFrames={30 * 60}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={
          {
            title: "Short",
            language: "en",
            channelHandle: "motube",
            scenes: [
              {
                type: "hook",
                data: { headline: "Did you know?", subtext: "This will change how you think about AI" },
                durationInFrames: 150,
              },
              {
                type: "point",
                data: { text: "Point 1", icon: "🔥" },
                durationInFrames: 120,
              },
              {
                type: "cta",
                data: { text: "Follow for more", channelHandle: "motube" },
                durationInFrames: 150,
              },
            ],
          } satisfies ShortFormProps
        }
      />

      {/* ── Concept Episode (HeyGen avatar + motion overlays, 16:9, 1920x1080) ─ */}
      <Composition
        id="ConceptEpisode"
        component={ConceptEpisode}
        calculateMetadata={conceptMeta}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={
          {
            chunks: [],
            motionEvents: [],
            lang: "fr",
            title: "Concept Episode",
          } satisfies ConceptEpisodeProps
        }
      />
      {/* ── Stick Figure Episode (2D animation, 9:16, 1080x1920 — Instagram/TikTok) ─ */}
      <Composition
        id="StickFigureEpisode"
        component={StickFigureEpisode}
        calculateMetadata={stickFigureMeta}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={
          {
            situation: "When your boss asks you to work on the weekend",
            backgroundType: "office",
            language: "en",
            characters: {
              protagonist: { gender: "male", hairStyle: "spiky", outfit: "casual" },
              antagonist: { gender: "male", hairStyle: "spiky", outfit: "formal" },
            },
            scenes: [
              {
                speaker: "antagonist",
                text: "Can you come in Saturday?",
                emotion: "happy",
                pose: "gesturing",
                durationInFrames: 90,
              },
              {
                speaker: "protagonist",
                text: "...",
                emotion: "shocked",
                pose: "standing",
                durationInFrames: 60,
              },
              {
                speaker: "protagonist",
                text: "My grandma died. Again.",
                emotion: "annoyed",
                pose: "phone",
                durationInFrames: 90,
              },
              {
                speaker: "antagonist",
                text: "That's the third time this year!",
                emotion: "angry",
                pose: "gesturing",
                durationInFrames: 90,
              },
            ],
          } satisfies StickFigureEpisodeProps
        }
      />
    </>
  );
};

registerRoot(RemotionRoot);
