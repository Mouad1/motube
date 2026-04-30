import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

interface CodeSceneProps {
  code: string;
  language: string;
  explanation: string;
}

// Scène de code — style terminal, révélation ligne par ligne (Karpathy : code comme medium)
export const CodeScene: React.FC<CodeSceneProps> = ({ code, language, explanation }) => {
  const frame = useCurrentFrame();
  const lines = code.split("\n");

  // Révèle une ligne toutes les 8 frames (≈ 0.27s)
  const visibleLines = Math.min(
    Math.floor(frame / 8) + 1,
    lines.length
  );

  const explanationOpacity = interpolate(
    frame,
    [lines.length * 8, lines.length * 8 + 20],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        flexDirection: "row",
        padding: 60,
        gap: 60,
      }}
    >
      {/* Bloc code */}
      <div
        style={{
          flex: 1.4,
          backgroundColor: "#111",
          borderRadius: 12,
          padding: 40,
          border: "1px solid #222",
          overflow: "hidden",
        }}
      >
        {/* Header terminal */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["#ff5f57", "#ffbd2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c }} />
          ))}
          <span style={{ color: "#555", fontFamily: "monospace", fontSize: 14, marginLeft: 12 }}>
            {language}
          </span>
        </div>

        {/* Lignes de code */}
        <div style={{ fontFamily: "monospace", fontSize: 22, lineHeight: 1.7 }}>
          {lines.slice(0, visibleLines).map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 20 }}>
              <span style={{ color: "#444", minWidth: 30, textAlign: "right" }}>{i + 1}</span>
              <span style={{ color: "#e2e8f0", whiteSpace: "pre" }}>{line}</span>
            </div>
          ))}
          {/* Curseur clignotant */}
          {visibleLines <= lines.length && (
            <span style={{ color: "#6ee7b7", opacity: frame % 30 < 15 ? 1 : 0 }}>▋</span>
          )}
        </div>
      </div>

      {/* Explication textuelle */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: explanationOpacity,
        }}
      >
        <div
          style={{
            color: "#f0f0f0",
            fontFamily: "sans-serif",
            fontSize: 28,
            lineHeight: 1.6,
          }}
        >
          {explanation}
        </div>
      </div>
    </AbsoluteFill>
  );
};
