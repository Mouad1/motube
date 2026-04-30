import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export type Emotion = "neutral" | "angry" | "shocked" | "happy" | "sad" | "annoyed";
export type Pose = "standing" | "sitting" | "phone" | "gesturing" | "facepalm" | "pointing";
export type SkinTone = "light" | "medium" | "dark";
export type HairStyle = "bun" | "short" | "ponytail" | "spiky" | "bald";
export type Outfit = "casual" | "formal" | "sporty";

const OUTFIT_COLORS: Record<Outfit, { body: string; accent: string }> = {
  casual:  { body: "#FFFFFF", accent: "#4A4A6A" },
  formal:  { body: "#FFFFFF", accent: "#2C2C2C" },
  sporty:  { body: "#FFFFFF", accent: "#2F8A5F" },
};

// ─── Face expressions ─────────────────────────────────────────────────────────

function FaceNeutral() {
  return (
    <>
      <ellipse cx={76} cy={72} rx={11} ry={13} fill="#111" />
      <ellipse cx={124} cy={72} rx={11} ry={13} fill="#111" />
      <path d="M82 100 Q100 106 118 100" stroke="#111" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </>
  );
}

function FaceHappy() {
  return (
    <>
      {/* Squinting happy eyes */}
      <path d="M65 72 Q76 60 87 72" stroke="#111" strokeWidth={4.5} fill="none" strokeLinecap="round" />
      <path d="M113 72 Q124 60 135 72" stroke="#111" strokeWidth={4.5} fill="none" strokeLinecap="round" />
      {/* Wide smile */}
      <path d="M75 97 Q100 118 125 97" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* Rosy cheeks */}
      <ellipse cx={68} cy={88} rx={11} ry={7} fill="#FFB3B3" opacity={0.5} />
      <ellipse cx={132} cy={88} rx={11} ry={7} fill="#FFB3B3" opacity={0.5} />
    </>
  );
}

function FaceAngry() {
  return (
    <>
      {/* Angled angry eyebrows */}
      <line x1={60} y1={52} x2={88} y2={62} stroke="#111" strokeWidth={5} strokeLinecap="round" />
      <line x1={112} y1={62} x2={140} y2={52} stroke="#111" strokeWidth={5} strokeLinecap="round" />
      {/* Small squinted eyes */}
      <ellipse cx={76} cy={72} rx={10} ry={8} fill="#111" />
      <ellipse cx={124} cy={72} rx={10} ry={8} fill="#111" />
      {/* Angry frown */}
      <path d="M78 104 Q100 94 122 104" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* Teeth showing */}
      <rect x={84} y={96} width={32} height={8} rx={2} fill="#111" />
    </>
  );
}

function FaceShocked() {
  return (
    <>
      {/* Raised eyebrows */}
      <path d="M60 50 Q76 42 88 50" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M112 50 Q124 42 140 50" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* Wide open eyes */}
      <ellipse cx={76} cy={70} rx={14} ry={16} fill="#111" />
      <ellipse cx={124} cy={70} rx={14} ry={16} fill="#111" />
      <ellipse cx={79} cy={67} rx={4} ry={5} fill="white" />
      <ellipse cx={127} cy={67} rx={4} ry={5} fill="white" />
      {/* Open O mouth */}
      <ellipse cx={100} cy={102} rx={13} ry={14} fill="#111" />
      <ellipse cx={100} cy={100} rx={8} ry={7} fill="#CC2222" />
    </>
  );
}

function FaceSad() {
  return (
    <>
      {/* Sad tilted eyebrows */}
      <path d="M62 54 Q76 62 88 58" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M112 58 Q124 62 138 54" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
      <ellipse cx={76} cy={72} rx={11} ry={13} fill="#111" />
      <ellipse cx={124} cy={72} rx={11} ry={13} fill="#111" />
      {/* Sad frown */}
      <path d="M80 106 Q100 96 120 106" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* Tears */}
      <ellipse cx={70} cy={86} rx={4} ry={7} fill="#7EC8E3" opacity={0.8} />
      <ellipse cx={130} cy={86} rx={4} ry={7} fill="#7EC8E3" opacity={0.8} />
    </>
  );
}

function FaceAnnoyed() {
  return (
    <>
      {/* One eyebrow raised */}
      <path d="M60 50 Q76 46 88 54" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
      <line x1={112} y1={58} x2={140} y2={54} stroke="#111" strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={76} cy={72} rx={11} ry={12} fill="#111" />
      <ellipse cx={124} cy={72} rx={11} ry={12} fill="#111" />
      {/* Flat annoyed mouth, slight smirk */}
      <path d="M80 102 Q90 106 118 100" stroke="#111" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </>
  );
}

const FACES: Record<Emotion, React.FC> = {
  neutral: FaceNeutral,
  happy: FaceHappy,
  angry: FaceAngry,
  shocked: FaceShocked,
  sad: FaceSad,
  annoyed: FaceAnnoyed,
};

// ─── Hair ─────────────────────────────────────────────────────────────────────

function Hair({ style, gender }: { style: HairStyle; gender: "male" | "female" }) {
  if (style === "bald") return null;

  if (style === "spiky" || (style === "short" && gender === "male")) {
    return (
      <>
        {/* Dark cap */}
        <path d="M28 72 Q28 10 100 10 Q172 10 172 72" fill="#2A1A0A" />
        {/* Spikes */}
        <line x1={60} y1={18} x2={52} y2={2} stroke="#2A1A0A" strokeWidth={8} strokeLinecap="round" />
        <line x1={88} y1={12} x2={84} y2={-4} stroke="#2A1A0A" strokeWidth={8} strokeLinecap="round" />
        <line x1={118} y1={14} x2={120} y2={-2} stroke="#2A1A0A" strokeWidth={8} strokeLinecap="round" />
      </>
    );
  }

  if (style === "bun" || (style === "short" && gender === "female")) {
    return (
      <>
        <path d="M28 72 Q28 10 100 10 Q172 10 172 72" fill="#5C3317" />
        <circle cx={100} cy={6} r={18} fill="#5C3317" />
      </>
    );
  }

  if (style === "ponytail") {
    const hairColor = gender === "female" ? "#E8B420" : "#2A1A0A";
    return (
      <>
        {/* Back cap */}
        <path d="M28 72 Q28 10 100 10 Q172 10 172 72" fill={hairColor} />
        {/* Side ponytail flowing right */}
        <path
          d="M168 50 Q210 40 220 90 Q226 130 190 160 Q165 170 162 130 Q158 90 168 50"
          fill={hairColor}
        />
        {/* Ponytail tie */}
        <ellipse cx={168} cy={108} rx={8} ry={10} fill={gender === "female" ? "#FF6B9D" : hairColor} />
      </>
    );
  }

  return null;
}

// ─── Arm paths ────────────────────────────────────────────────────────────────

function getArmPaths(pose: Pose, bob: number) {
  switch (pose) {
    case "phone":
      return {
        left:  "M100 198 Q58 240 48 285",
        right: `M100 198 Q148 165 ${152 + bob * 2} ${118 + bob}`,
      };
    case "gesturing":
      return {
        left:  "M100 198 Q52 245 42 288",
        right: `M100 198 Q155 150 ${162 + bob * 2} ${105 + bob * 1.5}`,
      };
    case "pointing":
      return {
        left:  "M100 198 Q52 245 42 288",
        right: `M100 198 Q152 160 ${168 + bob} ${118 + bob}`,
      };
    case "facepalm":
      return {
        left:  "M100 198 Q52 245 42 288",
        right: "M100 198 Q130 168 100 120",
      };
    case "sitting":
      return {
        left:  "M100 198 Q65 248 58 295",
        right: "M100 198 Q135 248 142 295",
      };
    default: // standing
      return {
        left:  "M100 198 Q55 245 44 288",
        right: "M100 198 Q145 245 156 288",
      };
  }
}

// ─── Phone prop ───────────────────────────────────────────────────────────────

function PhoneProp({ pose }: { pose: Pose }) {
  if (pose !== "phone") return null;
  return (
    <g>
      <rect x={148} y={102} width={26} height={44} rx={5} fill="#1A1A1A" />
      <rect x={152} y={107} width={18} height={30} rx={2} fill="#3A5A8A" />
    </g>
  );
}

// ─── Pointing finger ─────────────────────────────────────────────────────────

function PointingFinger({ pose }: { pose: Pose }) {
  if (pose !== "pointing") return null;
  return (
    <line x1={162} y1={116} x2={185} y2={100} stroke="#EEE" strokeWidth={7} strokeLinecap="round" />
  );
}

// ─── Main StickFigure ─────────────────────────────────────────────────────────

export interface StickFigureProps {
  gender: "male" | "female";
  skinTone?: SkinTone;
  hairStyle?: HairStyle;
  outfit?: Outfit;
  emotion?: Emotion;
  pose?: Pose;
  isSpeaking?: boolean;
  flip?: boolean;
  scale?: number;
}

export const StickFigure: React.FC<StickFigureProps> = ({
  gender,
  skinTone = "medium",
  hairStyle,
  outfit = "casual",
  emotion = "neutral",
  pose = "standing",
  isSpeaking = false,
  flip = false,
  scale = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const resolvedHair = hairStyle ?? (gender === "female" ? "ponytail" : "spiky");

  const talkBob = isSpeaking ? Math.abs(Math.sin((frame / fps) * Math.PI * 3.5)) : 0;
  const bodyBob = isSpeaking
    ? interpolate(Math.sin((frame / fps) * Math.PI * 2), [-1, 1], [-3, 3])
    : 0;

  const { body: bodyColor, accent: accentColor } = OUTFIT_COLORS[outfit];
  const FaceComponent = FACES[emotion];
  const { left: leftArm, right: rightArm } = getArmPaths(pose, talkBob * 6);

  // Mouth open animation when speaking
  const mouthRy = interpolate(talkBob, [0, 1], [3, 10]);
  const mouthRx = interpolate(talkBob, [0, 1], [5, 12]);

  return (
    <svg
      viewBox="0 0 200 480"
      width={200 * scale}
      height={480 * scale}
      style={{ transform: flip ? "scaleX(-1)" : undefined, overflow: "visible" }}
    >
      <g transform={`translate(0, ${bodyBob})`}>

        {/* Hair behind head */}
        <Hair style={resolvedHair} gender={gender} />

        {/* Head — white circle, signature of this style */}
        <circle cx={100} cy={75} r={68} fill="white" stroke="#111" strokeWidth={4.5} />

        {/* Face */}
        <FaceComponent />

        {/* Speaking mouth overlay */}
        {isSpeaking && (
          <ellipse cx={100} cy={100} rx={mouthRx} ry={mouthRy} fill="#111" />
        )}

        {/* Neck */}
        <line x1={100} y1={143} x2={100} y2={178} stroke="#111" strokeWidth={6} strokeLinecap="round" />

        {/* Shirt / body shape */}
        {pose === "sitting" ? (
          <>
            {/* Upper body */}
            <path d="M68 182 Q100 174 132 182 L128 295 L72 295 Z"
              fill={bodyColor} stroke="#111" strokeWidth={3.5} />
            {/* Sitting legs go horizontal */}
            <line x1={72} y1={295} x2={30} y2={320} stroke="#111" strokeWidth={6} strokeLinecap="round" />
            <line x1={128} y1={295} x2={170} y2={320} stroke="#111" strokeWidth={6} strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M68 182 Q100 174 132 182 L128 310 L72 310 Z"
              fill={bodyColor} stroke="#111" strokeWidth={3.5} />
            {/* Pants */}
            <path d="M72 310 Q68 365 60 420" stroke="#111" strokeWidth={7} fill="none" strokeLinecap="round" />
            <path d="M128 310 Q132 365 140 420" stroke="#111" strokeWidth={7} fill="none" strokeLinecap="round" />
            {/* Shoes */}
            <line x1={50} y1={420} x2={72} y2={420} stroke="#111" strokeWidth={7} strokeLinecap="round" />
            <line x1={128} y1={420} x2={150} y2={420} stroke="#111" strokeWidth={7} strokeLinecap="round" />
          </>
        )}

        {/* Outfit accent — tie or collar detail */}
        {outfit === "formal" && (
          <path d="M96 182 L100 220 L104 182" fill={accentColor} />
        )}

        {/* Arms */}
        <path d={leftArm} stroke="#111" strokeWidth={6} fill="none" strokeLinecap="round" />
        <path d={rightArm} stroke="#111" strokeWidth={6} fill="none" strokeLinecap="round" />

        {/* Props */}
        <PhoneProp pose={pose} />
        <PointingFinger pose={pose} />

      </g>
    </svg>
  );
};
