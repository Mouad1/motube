import { AbsoluteFill, Audio, interpolate, useCurrentFrame, useVideoConfig, staticFile, Img } from "remotion";

interface BulletItem {
  text: string;
  icon?: string; // emoji or symbol
}

interface BulletPointSceneProps {
  heading: string;
  bullets: BulletItem[];
  audioPath?: string;
  imagePath?: string;
}

// Scène bullet points — révélation bullet par bullet avec fade-in staggered
export const BulletPointScene: React.FC<BulletPointSceneProps> = ({
  heading,
  bullets,
  audioPath,
  imagePath,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const FRAMES_PER_BULLET = Math.max(20, Math.floor((durationInFrames - 30) / bullets.length));

  const headingOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const headingY = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: "clamp" });
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        padding: 80,
        flexDirection: "column",
        justifyContent: "center",
        gap: 48,
        overflow: "hidden",
      }}
    >
      {imagePath && (
        <AbsoluteFill style={{ opacity: bgOpacity * 0.2 }}>
          <Img
            src={staticFile(imagePath)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      )}
      {imagePath && (
        <AbsoluteFill style={{ background: "linear-gradient(to right, rgba(13,13,13,0.95) 60%, rgba(13,13,13,0.75) 100%)" }} />
      )}

      {audioPath && <Audio src={audioPath} />}

      {/* Heading */}
      <div
        style={{
          color: "#6ee7b7",
          fontFamily: "sans-serif",
          fontSize: 48,
          fontWeight: 700,
          opacity: headingOpacity,
          transform: `translateY(${headingY}px)`,
          position: "relative",
          textShadow: imagePath ? "0 2px 16px rgba(0,0,0,0.9)" : "none",
        }}
      >
        {heading}
      </div>

      {/* Bullets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28, position: "relative" }}>
        {bullets.map((bullet, i) => {
          const startFrame = 25 + i * FRAMES_PER_BULLET;
          const opacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const x = interpolate(frame, [startFrame, startFrame + 15], [-30, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 24,
                opacity,
                transform: `translateX(${x}px)`,
              }}
            >
              {/* Bullet indicator */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#6ee7b7",
                  marginTop: 14,
                  flexShrink: 0,
                  boxShadow: "0 0 8px #6ee7b7",
                }}
              />
              <div
                style={{
                  color: "#f0f0f0",
                  fontFamily: "sans-serif",
                  fontSize: 30,
                  lineHeight: 1.5,
                }}
              >
                {bullet.icon && (
                  <span style={{ marginRight: 12 }}>{bullet.icon}</span>
                )}
                {bullet.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
