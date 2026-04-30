import { AbsoluteFill, interpolate, useCurrentFrame, staticFile, Img } from "remotion";

interface ConceptSceneProps {
  heading: string;
  body: string;
  visual?: string; // path vers une image ou SVG inline
  imagePath?: string; // AI-generated background image
}

// Scène concept — intuition visuelle avant la formule (méthode Karpathy)
export const ConceptScene: React.FC<ConceptSceneProps> = ({ heading, body, visual, imagePath }) => {
  const frame = useCurrentFrame();

  const headingOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const bodyOpacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp" });
  const visualOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" });
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        padding: 80,
        flexDirection: "row",
        alignItems: "center",
        gap: 80,
        overflow: "hidden",
      }}
    >
      {/* Background image */}
      {imagePath && (
        <AbsoluteFill style={{ opacity: bgOpacity * 0.25 }}>
          <Img
            src={staticFile(imagePath)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      )}
      {imagePath && (
        <AbsoluteFill style={{ background: "linear-gradient(135deg, rgba(13,13,13,0.9) 0%, rgba(13,13,13,0.7) 50%, rgba(13,13,13,0.95) 100%)" }} />
      )}

      {/* Texte */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 32, position: "relative" }}>
        <div
          style={{
            color: "#6ee7b7",
            fontFamily: "monospace",
            fontSize: 16,
            letterSpacing: 3,
            textTransform: "uppercase",
            opacity: headingOpacity,
          }}
        >
          concept
        </div>

        <div
          style={{
            color: "#f0f0f0",
            fontFamily: "sans-serif",
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.2,
            opacity: headingOpacity,
            textShadow: imagePath ? "0 2px 16px rgba(0,0,0,0.9)" : "none",
          }}
        >
          {heading}
        </div>

        <div
          style={{
            color: "#aaa",
            fontFamily: "sans-serif",
            fontSize: 26,
            lineHeight: 1.7,
            opacity: bodyOpacity,
          }}
        >
          {body}
        </div>
      </div>

      {/* Zone visuelle — explicit image takes priority over AI background */}
      {visual && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: visualOpacity,
            backgroundColor: "#111",
            borderRadius: 16,
            minHeight: 400,
            border: "1px solid #222",
            position: "relative",
          }}
        >
          <img src={visual} style={{ maxWidth: "100%", maxHeight: 500, borderRadius: 12 }} />
        </div>
      )}
    </AbsoluteFill>
  );
};
