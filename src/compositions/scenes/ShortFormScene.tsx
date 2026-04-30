import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ─── Hook scene ──────────────────────────────────────────────────────────────

interface HookSceneProps {
  headline: string;
  subtext?: string;
  audioSrc?: string;
}

export const HookScene: React.FC<HookSceneProps> = ({ headline, subtext, audioSrc }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  const headSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const headY = interpolate(headSpring, [0, 1], [50, 0]);

  const subOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        opacity,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "60px 48px",
        gap: 32,
      }}
    >
      {audioSrc && <Audio src={staticFile(audioSrc)} />}

      {/* Decorative top accent */}
      <div
        style={{
          width: interpolate(frame, [5, 40], [0, 120], { extrapolateRight: "clamp" }),
          height: 4,
          backgroundColor: "#6ee7b7",
          borderRadius: 2,
        }}
      />

      {/* Headline */}
      <div
        style={{
          color: "#f0f0f0",
          fontFamily: "sans-serif",
          fontSize: 72,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.15,
          opacity: fadeIn,
          transform: `translateY(${headY}px)`,
        }}
      >
        {headline}
      </div>

      {/* Subtext */}
      {subtext && (
        <div
          style={{
            color: "#9ca3af",
            fontFamily: "sans-serif",
            fontSize: 34,
            textAlign: "center",
            lineHeight: 1.5,
            opacity: subOpacity,
          }}
        >
          {subtext}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Point scene ─────────────────────────────────────────────────────────────

interface PointSceneProps {
  text: string;
  icon?: string;
  audioSrc?: string;
}

export const PointScene: React.FC<PointSceneProps> = ({ text, icon, audioSrc }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  const textSpring = spring({ frame, fps, config: { damping: 16 } });
  const textX = interpolate(textSpring, [0, 1], [-40, 0]);

  const barWidth = interpolate(frame, [8, 50], [0, 80], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        opacity,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "60px 56px",
        gap: 40,
      }}
    >
      {audioSrc && <Audio src={staticFile(audioSrc)} />}

      {/* Icon */}
      {icon && (
        <div style={{ fontSize: 80, lineHeight: 1 }}>{icon}</div>
      )}

      {/* Accent bar */}
      <div
        style={{
          width: barWidth,
          height: 4,
          backgroundColor: "#6ee7b7",
          borderRadius: 2,
        }}
      />

      {/* Text */}
      <div
        style={{
          color: "#f0f0f0",
          fontFamily: "sans-serif",
          fontSize: 60,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.3,
          opacity: fadeIn,
          transform: `translateX(${textX}px)`,
          maxWidth: 900,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// ─── CTA scene ───────────────────────────────────────────────────────────────

interface CtaSceneProps {
  text: string;
  channelHandle: string;
  audioSrc?: string;
}

export const CtaScene: React.FC<CtaSceneProps> = ({ text, channelHandle }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  const scaleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const scale = interpolate(scaleSpring, [0, 1], [0.8, 1]);

  const handleOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        opacity,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "60px 56px",
        gap: 40,
      }}
    >
      {/* Main CTA text */}
      <div
        style={{
          color: "#f0f0f0",
          fontFamily: "sans-serif",
          fontSize: 64,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.2,
          transform: `scale(${scale})`,
        }}
      >
        {text}
      </div>

      {/* Pulsing teal circle */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          backgroundColor: "#6ee7b7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: interpolate(
            frame % 60,
            [0, 30, 60],
            [0.8, 1, 0.8],
            { extrapolateRight: "clamp" }
          ),
        }}
      >
        <div
          style={{
            color: "#000",
            fontSize: 52,
            lineHeight: 1,
          }}
        >
          ▶
        </div>
      </div>

      {/* Channel handle */}
      <div
        style={{
          color: "#6ee7b7",
          fontFamily: "monospace",
          fontSize: 32,
          letterSpacing: 2,
          opacity: handleOpacity,
        }}
      >
        @{channelHandle}
      </div>
    </AbsoluteFill>
  );
};
