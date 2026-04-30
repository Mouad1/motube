import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface ArabicTitleSceneProps {
  arabicTitle: string;
  translatedTitle: string;
  lottieSrc?: string; // unused until Phase 3 Lottie integration
}

export const ArabicTitleScene: React.FC<ArabicTitleSceneProps> = ({
  arabicTitle,
  translatedTitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const arabicSpring = spring({ frame, fps, config: { damping: 14 } });
  const arabicY = interpolate(arabicSpring, [0, 1], [60, 0]);
  const arabicOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });

  const translatedOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [15, 70], [0, 320], { extrapolateRight: "clamp" });

  // Ornamental dots opacity
  const ornamentsOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        opacity: bgOpacity,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 32,
        padding: 100,
      }}
    >
      {/* Ornamental top line */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: ornamentsOpacity,
        }}
      >
        <div style={{ width: 40, height: 2, backgroundColor: "#6ee7b7", borderRadius: 1 }} />
        <div
          style={{
            color: "#6ee7b7",
            fontFamily: "serif",
            fontSize: 28,
            letterSpacing: 8,
          }}
        >
          ✦ ✦ ✦
        </div>
        <div style={{ width: 40, height: 2, backgroundColor: "#6ee7b7", borderRadius: 1 }} />
      </div>

      {/* Arabic title — RTL */}
      <div
        style={{
          color: "#f5f0e8",
          fontFamily: "serif",
          fontSize: 88,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.3,
          direction: "rtl",
          opacity: arabicOpacity,
          transform: `translateY(${arabicY}px)`,
          maxWidth: 1300,
          textShadow: "0 2px 20px rgba(110,231,183,0.15)",
        }}
      >
        {arabicTitle}
      </div>

      {/* Teal separator line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          backgroundColor: "#6ee7b7",
          borderRadius: 2,
        }}
      />

      {/* Translated subtitle */}
      <div
        style={{
          color: "#9ca3af",
          fontFamily: "sans-serif",
          fontSize: 32,
          textAlign: "center",
          fontStyle: "italic",
          opacity: translatedOpacity,
          letterSpacing: 1,
        }}
      >
        {translatedTitle}
      </div>
    </AbsoluteFill>
  );
};
