import { AbsoluteFill, Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface WalkthroughStep {
  highlightLines: number[]; // 1-indexed lines to highlight
  explanation: string;
}

interface CodeWalkthroughProps {
  code: string;
  language: string;
  steps: WalkthroughStep[];
  audioPath?: string;
}

// Scène code walkthrough — highlight step-by-step avec explication synchronisée
export const CodeWalkthrough: React.FC<CodeWalkthroughProps> = ({
  code,
  language,
  steps,
  audioPath,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const lines = code.split("\n");
  const FRAMES_PER_STEP = Math.max(40, Math.floor(durationInFrames / steps.length));

  // Current step index
  const stepIndex = Math.min(
    Math.floor(frame / FRAMES_PER_STEP),
    steps.length - 1
  );
  const currentStep = steps[stepIndex];

  // Progress within current step (0–1)
  const stepProgress = (frame % FRAMES_PER_STEP) / FRAMES_PER_STEP;

  const explanationOpacity = interpolate(
    frame % FRAMES_PER_STEP,
    [0, 15],
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
      {audioPath && <Audio src={audioPath} />}

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
        <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
          {["#ff5f57", "#ffbd2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c }} />
          ))}
          <span style={{ color: "#555", fontFamily: "monospace", fontSize: 14, marginLeft: 12 }}>
            {language}
          </span>
          <span style={{ color: "#444", fontFamily: "monospace", fontSize: 12, marginLeft: "auto" }}>
            step {stepIndex + 1}/{steps.length}
          </span>
        </div>

        {/* Lines */}
        <div style={{ fontFamily: "monospace", fontSize: 20, lineHeight: 1.8 }}>
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const isHighlighted = currentStep.highlightLines.includes(lineNum);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 20,
                  backgroundColor: isHighlighted ? "rgba(110, 231, 183, 0.08)" : "transparent",
                  borderLeft: isHighlighted ? "3px solid #6ee7b7" : "3px solid transparent",
                  paddingLeft: 8,
                  borderRadius: 4,
                  transition: "background 0.2s",
                }}
              >
                <span style={{ color: isHighlighted ? "#6ee7b7" : "#444", minWidth: 30, textAlign: "right" }}>
                  {lineNum}
                </span>
                <span
                  style={{
                    color: isHighlighted ? "#e2e8f0" : "#666",
                    whiteSpace: "pre",
                    fontWeight: isHighlighted ? 600 : 400,
                  }}
                >
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explication de l'étape */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          opacity: explanationOpacity,
        }}
      >
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 8 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 32,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= stepIndex ? "#6ee7b7" : "#333",
              }}
            />
          ))}
        </div>

        <div
          style={{
            color: "#6ee7b7",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          walkthrough
        </div>

        <div
          style={{
            color: "#f0f0f0",
            fontFamily: "sans-serif",
            fontSize: 28,
            lineHeight: 1.6,
          }}
        >
          {currentStep.explanation}
        </div>

        {/* Highlighted lines badge */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {currentStep.highlightLines.map((l) => (
            <span
              key={l}
              style={{
                backgroundColor: "rgba(110, 231, 183, 0.1)",
                border: "1px solid #6ee7b7",
                color: "#6ee7b7",
                fontFamily: "monospace",
                fontSize: 14,
                padding: "2px 10px",
                borderRadius: 4,
              }}
            >
              L{l}
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
