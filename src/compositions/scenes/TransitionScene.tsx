import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

interface TransitionSceneProps {
  text: string;
}

export const TransitionScene: React.FC<TransitionSceneProps> = ({ text }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 10, 75, 90], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  const lineWidth = interpolate(frame, [5, 50], [0, 400], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 24,
        opacity,
      }}
    >
      <div
        style={{
          width: lineWidth,
          height: 1,
          backgroundColor: "#333",
        }}
      />
      <div
        style={{
          color: "#555",
          fontFamily: "monospace",
          fontSize: 20,
          letterSpacing: 4,
        }}
      >
        {text}
      </div>
      <div
        style={{
          width: lineWidth,
          height: 1,
          backgroundColor: "#333",
        }}
      />
    </AbsoluteFill>
  );
};
