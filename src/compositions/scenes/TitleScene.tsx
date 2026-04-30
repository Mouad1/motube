import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Img } from "remotion";

interface TitleSceneProps {
  episodeTitle: string;
  title: string;
  subtitle?: string;
  imagePath?: string;
}

export const TitleScene: React.FC<TitleSceneProps> = ({ episodeTitle, title, subtitle, imagePath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = spring({ frame, fps, config: { damping: 14 } });
  const titleTranslateY = interpolate(titleY, [0, 1], [40, 0]);
  const subtitleOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const bgScale = interpolate(frame, [0, 300], [1, 1.05], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 24,
        padding: 80,
        overflow: "hidden",
      }}
    >
      {/* Background image — slow Ken Burns zoom */}
      {imagePath && (
        <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
          <Img
            src={staticFile(imagePath)}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }}
          />
        </AbsoluteFill>
      )}

      {/* Dark gradient overlay to ensure text readability */}
      {imagePath && (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(13,13,13,0.4) 0%, rgba(13,13,13,0.85) 100%)" }} />
      )}

      {/* Badge épisode */}
      <div
        style={{
          color: "#6ee7b7",
          fontFamily: "monospace",
          fontSize: 18,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: subtitleOpacity,
          position: "relative",
        }}
      >
        {episodeTitle}
      </div>

      {/* Titre principal */}
      <div
        style={{
          color: "#f0f0f0",
          fontFamily: "sans-serif",
          fontSize: 72,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.1,
          opacity: titleOpacity,
          transform: `translateY(${titleTranslateY}px)`,
          maxWidth: 1200,
          position: "relative",
          textShadow: imagePath ? "0 2px 20px rgba(0,0,0,0.8)" : "none",
        }}
      >
        {title}
      </div>

      {/* Sous-titre */}
      {subtitle && (
        <div
          style={{
            color: "#888",
            fontFamily: "sans-serif",
            fontSize: 28,
            textAlign: "center",
            opacity: subtitleOpacity,
            maxWidth: 900,
            position: "relative",
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Ligne décorative */}
      <div
        style={{
          width: interpolate(frame, [10, 60], [0, 200], { extrapolateRight: "clamp" }),
          height: 3,
          backgroundColor: "#6ee7b7",
          borderRadius: 2,
          position: "relative",
          boxShadow: "0 0 12px #6ee7b7",
        }}
      />
    </AbsoluteFill>
  );
};
