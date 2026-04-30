import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface ArabicDialogueSceneProps {
  speaker: string;
  arabicLine: string;
  translatedLine: string;
  lottieSrc?: string;
  audioSrc?: string;
}

export const ArabicDialogueScene: React.FC<ArabicDialogueSceneProps> = ({
  speaker,
  arabicLine,
  translatedLine,
  audioSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(sceneOpacity, fadeOut);

  const bubbleSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const bubbleScale = interpolate(bubbleSpring, [0, 1], [0.85, 1]);
  const bubbleOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });

  const translatedOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        opacity,
        padding: "80px 120px",
        flexDirection: "column",
        justifyContent: "center",
        gap: 48,
      }}
    >
      {audioSrc && <Audio src={staticFile(audioSrc)} />}

      {/* Speaker label */}
      <div
        style={{
          color: "#6ee7b7",
          fontFamily: "monospace",
          fontSize: 18,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: bubbleOpacity,
          textAlign: "right",
          direction: "rtl",
        }}
      >
        ◀ {speaker}
      </div>

      {/* Arabic speech bubble */}
      <div
        style={{
          backgroundColor: "#111",
          border: "1px solid #2a2a2a",
          borderRadius: 20,
          borderBottomRightRadius: 4,
          padding: "40px 48px",
          direction: "rtl",
          opacity: bubbleOpacity,
          transform: `scale(${bubbleScale})`,
          transformOrigin: "right center",
          position: "relative",
        }}
      >
        {/* Teal left border accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 4,
            backgroundColor: "#6ee7b7",
            borderRadius: "0 20px 4px 0",
          }}
        />

        <div
          style={{
            color: "#f5f0e8",
            fontFamily: "serif",
            fontSize: 52,
            lineHeight: 1.7,
            textAlign: "right",
          }}
        >
          {arabicLine}
        </div>
      </div>

      {/* Translation (LTR, smaller, italic) */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          opacity: translatedOpacity,
          paddingLeft: 20,
        }}
      >
        <div
          style={{
            width: 3,
            height: "100%",
            minHeight: 60,
            backgroundColor: "#6ee7b7",
            opacity: 0.4,
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            color: "#9ca3af",
            fontFamily: "sans-serif",
            fontSize: 28,
            lineHeight: 1.6,
            fontStyle: "italic",
          }}
        >
          {translatedLine}
        </div>
      </div>
    </AbsoluteFill>
  );
};
