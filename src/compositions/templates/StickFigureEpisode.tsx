import React from "react";
import {
  AbsoluteFill,
  Series,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  staticFile,
  CalculateMetadataFunction,
} from "remotion";
import { StickFigure } from "../characters/StickFigure";
import type { Emotion, Pose, HairStyle, Outfit } from "../characters/StickFigure";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CharacterConfig {
  gender: "male" | "female";
  hairStyle: HairStyle;
  outfit: Outfit;
}

export interface DialogueScene {
  speaker: "protagonist" | "antagonist";
  text: string;
  emotion: Emotion;
  pose: Pose;
  audioPath?: string;
  durationInFrames: number;
}

export type BackgroundType =
  | "living_room" | "office" | "car" | "street" | "bedroom" | "restaurant";

export interface StickFigureEpisodeProps {
  situation: string;
  backgroundType: BackgroundType;
  language: "en" | "fr" | "ar" | "es";
  characters: {
    protagonist: CharacterConfig;
    antagonist: CharacterConfig;
  };
  scenes: DialogueScene[];
  [key: string]: unknown;
}

// ─── calculateMetadata ────────────────────────────────────────────────────────

export const calculateMetadata: CalculateMetadataFunction<StickFigureEpisodeProps & Record<string, unknown>> = ({ props }) => {
  const total = (props.scenes ?? []).reduce((s, sc) => s + sc.durationInFrames, 0);
  return { durationInFrames: Math.max(total, 90) };
};

// ─── Rich SVG Backgrounds (perspective-correct, illustrated style) ────────────

const BgLivingRoom: React.FC = () => (
  <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    <defs>
      <radialGradient id="lightGlow" cx="50%" cy="10%" r="50%">
        <stop offset="0%" stopColor="#FFF6DC" />
        <stop offset="100%" stopColor="#E8C88A" />
      </radialGradient>
    </defs>
    {/* Ceiling */}
    <polygon points="0,0 1080,0 1080,340 830,500 250,500 0,340" fill="#D4A870" />
    {/* Ceiling light */}
    <ellipse cx="540" cy="20" rx="80" ry="18" fill="#F5E0A0" />
    <ellipse cx="540" cy="38" rx="60" ry="14" fill="#FFF0B0" opacity="0.9" />
    {/* Left wall */}
    <polygon points="0,340 250,500 250,1200 0,1380" fill="#C8956A" />
    {/* Right wall */}
    <polygon points="1080,340 830,500 830,1200 1080,1380" fill="#C8956A" />
    {/* Back wall */}
    <rect x="250" y="500" width="580" height="700" fill="#EDBD8A" />
    {/* Wall painting */}
    <rect x="370" y="560" width="340" height="220" rx="8" fill="#C87840" />
    <rect x="382" y="572" width="316" height="196" rx="4" fill="#A05830" />
    {/* Floor */}
    <polygon points="0,1380 1080,1380 1080,1920 0,1920" fill="#A0602C" />
    {/* Floor planks */}
    {[1420, 1500, 1580, 1660, 1740, 1820, 1900].map((y, i) => (
      <line key={i} x1="0" y1={y} x2="1080" y2={y} stroke="#8A5020" strokeWidth="2" opacity="0.4" />
    ))}
    {/* Rug */}
    <ellipse cx="540" cy="1580" rx="340" ry="100" fill="#8B2020" opacity="0.7" />
    <ellipse cx="540" cy="1580" rx="300" ry="82" fill="#6B1515" opacity="0.4" />
    {/* Sofa back */}
    <path d="M80 1100 Q80 1000 200 990 L880 990 Q1000 1000 1000 1100 L1000 1280 L80 1280 Z"
      fill="#3A6EB4" stroke="#2A5EA4" strokeWidth="3" />
    {/* Sofa arms */}
    <rect x="60" y="1000" width="160" height="300" rx="20" fill="#2A5EA4" />
    <rect x="860" y="1000" width="160" height="300" rx="20" fill="#2A5EA4" />
    {/* Sofa cushions */}
    <path d="M220 1060 L500 1060 L500 1200 L220 1200 Z" rx="12" fill="#4A7EC4" opacity="0.7" />
    <path d="M520 1060 L800 1060 L800 1200 L520 1200 Z" rx="12" fill="#4A7EC4" opacity="0.7" />
    {/* Cushion pillows */}
    <rect x="240" y="1070" width="90" height="70" rx="15" fill="#F4C842" />
    {/* TV on left wall area */}
    <rect x="80" y="660" width="280" height="180" rx="10" fill="#1A1A1A" />
    <rect x="92" y="672" width="256" height="156" rx="5" fill="#1E3A6F" />
    <rect x="190" y="840" width="60" height="30" fill="#2A2A2A" />
    <rect x="160" y="868" width="120" height="12" rx="4" fill="#2A2A2A" />
  </svg>
);

const BgOffice: React.FC = () => (
  <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {/* Ceiling */}
    <polygon points="0,0 1080,0 1080,300 820,460 260,460 0,300" fill="#B8C8D8" />
    {/* Ceiling tiles */}
    {[80, 200, 320, 440, 560, 680, 800, 920, 1040].map((x, i) => (
      <line key={i} x1={x} y1="0" x2={x} y2="300" stroke="#A8B8C8" strokeWidth="1" opacity="0.5" />
    ))}
    {/* Ceiling lights (fluorescent) */}
    <rect x="200" y="30" width="220" height="18" rx="4" fill="#FFFCE8" opacity="0.95" />
    <rect x="660" y="30" width="220" height="18" rx="4" fill="#FFFCE8" opacity="0.95" />
    {/* Left wall */}
    <polygon points="0,300 260,460 260,1180 0,1320" fill="#90A8C0" />
    {/* Right wall */}
    <polygon points="1080,300 820,460 820,1180 1080,1320" fill="#90A8C0" />
    {/* Back wall */}
    <rect x="260" y="460" width="560" height="720" fill="#A8C0D8" />
    {/* Office window */}
    <rect x="340" y="520" width="380" height="420" rx="6" fill="#87CEEB" opacity="0.7" />
    <rect x="340" y="520" width="380" height="420" rx="6" fill="none" stroke="#8898A8" strokeWidth="8" />
    <line x1="530" y1="520" x2="530" y2="940" stroke="#8898A8" strokeWidth="6" />
    <line x1="340" y1="730" x2="720" y2="730" stroke="#8898A8" strokeWidth="6" />
    {/* Blinds suggestion */}
    {[560, 610, 660, 710, 760, 810, 860].map((y, i) => (
      <line key={i} x1="342" y1={y} x2="718" y2={y} stroke="#A8B8C8" strokeWidth="2" opacity="0.5" />
    ))}
    {/* Floor */}
    <polygon points="0,1320 1080,1320 1080,1920 0,1920" fill="#8090A0" />
    {/* Floor tiles */}
    {[1360, 1480, 1600, 1720, 1840].map((y, i) => (
      <line key={i} x1="0" y1={y} x2="1080" y2={y} stroke="#6A7A8A" strokeWidth="1.5" opacity="0.5" />
    ))}
    {/* Desk */}
    <rect x="50" y="1200" width="980" height="50" rx="8" fill="#8B6914" />
    <rect x="80" y="1250" width="32" height="160" fill="#7A5A10" />
    <rect x="968" y="1250" width="32" height="160" fill="#7A5A10" />
    {/* Monitor */}
    <rect x="370" y="1020" width="340" height="220" rx="8" fill="#1A1A1A" />
    <rect x="384" y="1034" width="312" height="192" rx="4" fill="#1E3A5F" />
    <rect x="510" y="1240" width="60" height="40" fill="#333" />
    {/* Keyboard */}
    <rect x="400" y="1195" width="280" height="30" rx="4" fill="#D0D0D0" />
    {/* Papers */}
    <rect x="100" y="1168" width="160" height="40" rx="4" fill="white" opacity="0.9" />
    <rect x="110" y="1178" width="110" height="4" rx="2" fill="#CCC" />
    <rect x="110" y="1190" width="80" height="4" rx="2" fill="#CCC" />
    {/* Plant */}
    <rect x="900" y="1130" width="40" height="72" rx="4" fill="#8B6044" />
    <ellipse cx="920" cy="1120" rx="50" ry="50" fill="#228B22" />
    <ellipse cx="890" cy="1140" rx="30" ry="30" fill="#1A7A1A" />
    <ellipse cx="945" cy="1145" rx="28" ry="28" fill="#2A9A2A" />
  </svg>
);

const BgCar: React.FC = () => (
  <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {/* Sky through windshield */}
    <rect x="0" y="0" width="1080" height="860" fill="#C0D8F0" />
    {/* Buildings in background */}
    <rect x="30" y="400" width="140" height="440" fill="#708090" opacity="0.7" />
    <rect x="190" y="480" width="110" height="360" fill="#607080" opacity="0.6" />
    <rect x="360" y="360" width="90" height="480" fill="#6A7A8A" opacity="0.6" />
    <rect x="640" y="400" width="130" height="440" fill="#708090" opacity="0.7" />
    <rect x="790" y="500" width="100" height="320" fill="#607080" opacity="0.6" />
    <rect x="910" y="440" width="140" height="400" fill="#6A7A8A" opacity="0.6" />
    {/* Building windows */}
    {[[50,440],[90,440],[50,490],[90,490],[50,540],[90,540]].map(([x,y],i) => (
      <rect key={i} x={x} y={y} width="22" height="22" rx="2" fill="#FFF7CC" opacity="0.8" />
    ))}
    {/* Car interior top frame */}
    <path d="M0,600 Q0,400 200,360 L880,360 Q1080,400 1080,600 L1080,860 L0,860 Z"
      fill="#CC3030" />
    {/* Windshield frame */}
    <path d="M80,600 Q80,440 220,420 L860,420 Q1000,440 1000,600 L1000,860 L80,860 Z"
      fill="#C0D8F0" />
    {/* Windshield reflection */}
    <path d="M120,460 Q300,440 400,460 L380,530 Q200,520 100,540 Z"
      fill="white" opacity="0.15" />
    {/* Car body (red) */}
    <rect x="0" y="860" width="1080" height="200" fill="#CC3030" />
    {/* Dashboard */}
    <path d="M0,980 Q100,940 200,960 L880,960 Q980,940 1080,980 L1080,1200 L0,1200 Z"
      fill="#2A1A1A" />
    {/* Dash instruments */}
    <circle cx="320" cy="1050" r="55" fill="#1A1A1A" stroke="#444" strokeWidth="4" />
    <circle cx="320" cy="1050" r="40" fill="#111" />
    <line x1="320" y1="1050" x2="320" y2="1020" stroke="#FF4444" strokeWidth="4" strokeLinecap="round" />
    <circle cx="760" cy="1050" r="55" fill="#1A1A1A" stroke="#444" strokeWidth="4" />
    <circle cx="760" cy="1050" r="40" fill="#111" />
    <line x1="760" y1="1050" x2="778" y2="1024" stroke="white" strokeWidth="4" strokeLinecap="round" />
    {/* Steering wheel */}
    <circle cx="420" cy="1180" r="140" fill="none" stroke="#111" strokeWidth="28" />
    <circle cx="420" cy="1180" r="38" fill="#1A1A1A" />
    <line x1="420" y1="1042" x2="420" y2="1142" stroke="#111" strokeWidth="22" />
    <line x1="284" y1="1180" x2="382" y2="1180" stroke="#111" strokeWidth="22" />
    <line x1="458" y1="1180" x2="556" y2="1180" stroke="#111" strokeWidth="22" />
    {/* Car seats visible */}
    <rect x="0" y="1200" width="480" height="720" fill="#8B1515" />
    <rect x="600" y="1200" width="480" height="720" fill="#8B1515" />
    <rect x="480" y="1200" width="120" height="720" fill="#6B0A0A" />
    {/* Floor area */}
    <rect x="0" y="1700" width="1080" height="220" fill="#2A1A0A" />
  </svg>
);

const BgRestaurant: React.FC = () => (
  <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {/* Ceiling */}
    <polygon points="0,0 1080,0 1080,320 840,480 240,480 0,320" fill="#C8A878" />
    {/* Recessed ceiling lights */}
    <circle cx="300" cy="80" r="38" fill="#FFF5D0" opacity="0.95" />
    <circle cx="300" cy="80" r="28" fill="#FFFAE8" />
    <circle cx="780" cy="80" r="38" fill="#FFF5D0" opacity="0.95" />
    <circle cx="780" cy="80" r="28" fill="#FFFAE8" />
    {/* Light glow */}
    <circle cx="300" cy="80" r="80" fill="#FFFAE8" opacity="0.15" />
    <circle cx="780" cy="80" r="80" fill="#FFFAE8" opacity="0.15" />
    {/* Left wall */}
    <polygon points="0,320 240,480 240,1160 0,1340" fill="#B8905A" />
    {/* Right wall */}
    <polygon points="1080,320 840,480 840,1160 1080,1340" fill="#B8905A" />
    {/* Back wall */}
    <rect x="240" y="480" width="600" height="680" fill="#D4A870" />
    {/* Wainscoting */}
    <rect x="240" y="900" width="600" height="260" fill="#8B5C2A" />
    <rect x="240" y="896" width="600" height="12" rx="4" fill="#7A4C1A" />
    {/* Wall panels */}
    <rect x="280" y="520" width="240" height="360" rx="6" fill="#C49860" opacity="0.5" />
    <rect x="560" y="520" width="240" height="360" rx="6" fill="#C49860" opacity="0.5" />
    {/* Floor */}
    <polygon points="0,1340 1080,1340 1080,1920 0,1920" fill="#8B6840" />
    {/* Floor tiles */}
    {[1380, 1480, 1580, 1680, 1780, 1880].map((y, i) => (
      <line key={i} x1="0" y1={y} x2="1080" y2={y} stroke="#7A5830" strokeWidth="2" opacity="0.5" />
    ))}
    {[0, 180, 360, 540, 720, 900, 1080].map((x, i) => (
      <line key={i} x1={x} y1="1340" x2={x} y2="1920" stroke="#7A5830" strokeWidth="2" opacity="0.4" />
    ))}
    {/* Rug */}
    <rect x="200" y="1500" width="680" height="140" rx="8" fill="#5A3020" />
    {/* Rug diamond pattern */}
    {[260, 340, 420, 500, 580, 660, 740, 820].map((x, i) => (
      <polygon key={i} points={`${x},1540 ${x+30},1570 ${x},1600 ${x-30},1570`}
        fill="#8B5530" opacity="0.6" />
    ))}
    {/* Left booth */}
    <polygon points="0,900 240,840 240,1160 0,1220" fill="#8B1A1A" />
    <polygon points="0,800 240,750 240,850 0,900" fill="#6B1010" />
    {/* Right booth */}
    <polygon points="1080,900 840,840 840,1160 1080,1220" fill="#8B1A1A" />
    <polygon points="1080,800 840,750 840,850 1080,900" fill="#6B1010" />
    {/* Table — white tablecloth with perspective */}
    <polygon points="300,920 780,920 880,1160 200,1160" fill="white" />
    <polygon points="300,920 780,920 800,970 280,970" fill="#E8E8E8" />
    {/* Table edge shadow */}
    <line x1="200" y1="1160" x2="880" y2="1160" stroke="#CCC" strokeWidth="4" />
    {/* Table legs */}
    <rect x="290" y="1160" width="22" height="100" rx="4" fill="#5C3A1E" />
    <rect x="768" y="1160" width="22" height="100" rx="4" fill="#5C3A1E" />
    {/* Wine bottle */}
    <rect x="510" y="740" width="60" height="180" rx="12" fill="#1A2840" />
    <rect x="524" y="718" width="32" height="32" rx="6" fill="#1A2840" />
    <rect x="530" y="700" width="20" height="24" rx="4" fill="#2A3850" />
    {/* Label */}
    <rect x="514" y="800" width="52" height="70" rx="4" fill="#E8D0A0" />
    {/* Wine glasses */}
    <path d="M400 880 Q395 940 388 960 L418 960 M388 960 L418 960 M403 960 L403 990"
      stroke="#C0C0C0" strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M680 880 Q675 940 668 960 L698 960 M668 960 L698 960 M683 960 L683 990"
      stroke="#C0C0C0" strokeWidth="6" fill="none" strokeLinecap="round" />
    {/* Red wine in glasses */}
    <ellipse cx="403" cy="945" rx="15" ry="8" fill="#8B0000" opacity="0.7" />
    <ellipse cx="683" cy="945" rx="15" ry="8" fill="#8B0000" opacity="0.7" />
    {/* Plates */}
    <ellipse cx="400" cy="1060" rx="88" ry="26" fill="#F0F0F0" />
    <ellipse cx="400" cy="1056" rx="72" ry="20" fill="#E8E8E8" />
    <ellipse cx="680" cy="1060" rx="88" ry="26" fill="#F0F0F0" />
    <ellipse cx="680" cy="1056" rx="72" ry="20" fill="#E8E8E8" />
    {/* Food on plates */}
    <ellipse cx="400" cy="1054" rx="50" ry="14" fill="#8B3A12" />
    <ellipse cx="680" cy="1054" rx="50" ry="14" fill="#8B3A12" />
    {/* Cutlery */}
    <line x1="308" y1="1000" x2="296" y2="1130" stroke="#B0B0B0" strokeWidth="5" strokeLinecap="round" />
    <line x1="296" y1="1000" x2="310" y2="1130" stroke="#B0B0B0" strokeWidth="5" strokeLinecap="round" />
    <line x1="772" y1="1000" x2="784" y2="1130" stroke="#B0B0B0" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const BgStreet: React.FC = () => (
  <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {/* Sky */}
    <rect x="0" y="0" width="1080" height="1020" fill="#87CEEB" />
    {/* Clouds */}
    <ellipse cx="200" cy="180" rx="130" ry="60" fill="white" opacity="0.9" />
    <ellipse cx="280" cy="160" rx="100" ry="50" fill="white" opacity="0.9" />
    <ellipse cx="150" cy="195" rx="90" ry="45" fill="white" opacity="0.9" />
    <ellipse cx="760" cy="140" rx="120" ry="55" fill="white" opacity="0.85" />
    <ellipse cx="840" cy="120" rx="90" ry="45" fill="white" opacity="0.85" />
    {/* Buildings left */}
    <rect x="0" y="320" width="200" height="700" fill="#8090A0" />
    <rect x="20" y="350" width="50" height="50" fill="#FFF7CC" opacity="0.8" />
    <rect x="90" y="350" width="50" height="50" fill="#FFF7CC" opacity="0.8" />
    <rect x="20" y="420" width="50" height="50" fill="#FFF7CC" opacity="0.8" />
    <rect x="90" y="420" width="50" height="50" fill="#FFF7CC" opacity="0.8" />
    <rect x="20" y="490" width="50" height="50" fill="#C8E8FF" opacity="0.7" />
    {/* Buildings right */}
    <rect x="880" y="280" width="200" height="740" fill="#7888A0" />
    <rect x="900" y="310" width="50" height="50" fill="#FFF7CC" opacity="0.8" />
    <rect x="970" y="310" width="50" height="50" fill="#FFF7CC" opacity="0.8" />
    <rect x="900" y="380" width="50" height="50" fill="#FFF7CC" opacity="0.8" />
    <rect x="900" y="450" width="50" height="50" fill="#C8E8FF" opacity="0.7" />
    {/* Sidewalk */}
    <polygon points="0,1020 1080,1020 1080,1280 0,1280" fill="#C0C0C0" />
    {/* Sidewalk lines */}
    {[180, 360, 540, 720, 900].map((x, i) => (
      <line key={i} x1={x} y1="1020" x2={x} y2="1280" stroke="#A8A8A8" strokeWidth="2" opacity="0.6" />
    ))}
    {/* Road */}
    <rect x="0" y="1280" width="1080" height="640" fill="#484848" />
    {/* Road markings */}
    {[1320, 1440, 1560, 1680, 1800].map((y, i) => (
      <rect key={i} x="420" y={y} width="240" height="40" rx="4" fill="white" opacity="0.7" />
    ))}
    {/* Curb */}
    <rect x="0" y="1270" width="1080" height="20" fill="#909090" />
    {/* Lamp post */}
    <rect x="160" y="680" width="18" height="340" fill="#606060" />
    <ellipse cx="169" cy="680" rx="50" ry="20" fill="#606060" />
    <ellipse cx="219" cy="660" rx="22" ry="16" fill="#FFEE88" opacity="0.9" />
    {/* Tree */}
    <rect x="860" y="820" width="22" height="200" fill="#5A3A1A" />
    <ellipse cx="871" cy="800" rx="70" ry="80" fill="#228B22" />
    <ellipse cx="840" cy="840" rx="50" ry="55" fill="#1A7A1A" />
    <ellipse cx="900" cy="830" rx="55" ry="60" fill="#2A9A2A" />
  </svg>
);

const BgBedroom: React.FC = () => (
  <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {/* Ceiling */}
    <polygon points="0,0 1080,0 1080,300 820,460 260,460 0,300" fill="#C4A0C4" />
    {/* Left wall */}
    <polygon points="0,300 260,460 260,1200 0,1360" fill="#A880A8" />
    {/* Right wall */}
    <polygon points="1080,300 820,460 820,1200 1080,1360" fill="#A880A8" />
    {/* Back wall */}
    <rect x="260" y="460" width="560" height="740" fill="#D4A8D4" />
    {/* Window */}
    <rect x="370" y="520" width="340" height="380" rx="8" fill="#87CEEB" opacity="0.6" />
    <rect x="370" y="520" width="340" height="380" rx="8" fill="none" stroke="#9870A8" strokeWidth="8" />
    <line x1="540" y1="520" x2="540" y2="900" stroke="#9870A8" strokeWidth="6" />
    <line x1="370" y1="710" x2="710" y2="710" stroke="#9870A8" strokeWidth="6" />
    {/* Curtains */}
    <path d="M370,520 Q320,620 340,900 L370,900 L370,520" fill="#9858B8" opacity="0.7" />
    <path d="M710,520 Q760,620 740,900 L710,900 L710,520" fill="#9858B8" opacity="0.7" />
    {/* Floor */}
    <polygon points="0,1360 1080,1360 1080,1920 0,1920" fill="#9060A0" />
    {/* Carpet */}
    <ellipse cx="540" cy="1580" rx="380" ry="110" fill="#784898" opacity="0.7" />
    {/* Bed */}
    <rect x="180" y="1080" width="720" height="500" rx="20" fill="#F0E0F0" stroke="#C8A0C8" strokeWidth="4" />
    {/* Pillow */}
    <rect x="240" y="1090" width="200" height="120" rx="20" fill="white" stroke="#DDD" strokeWidth="3" />
    <rect x="640" y="1090" width="200" height="120" rx="20" fill="white" stroke="#DDD" strokeWidth="3" />
    {/* Blanket */}
    <rect x="180" y="1220" width="720" height="360" rx="10" fill="#B870C8" />
    <line x1="180" y1="1250" x2="900" y2="1250" stroke="#A060B8" strokeWidth="3" />
    {/* Headboard */}
    <rect x="140" y="960" width="800" height="160" rx="30" fill="#784898" />
    <rect x="160" y="978" width="760" height="124" rx="24" fill="#9858B8" />
    {/* Nightstand */}
    <rect x="52" y="1140" width="140" height="200" rx="8" fill="#6A3888" />
    <rect x="888" y="1140" width="140" height="200" rx="8" fill="#6A3888" />
    {/* Lamp */}
    <rect x="100" y="1090" width="16" height="54" fill="#4A2060" />
    <path d="M68 1088 L132 1088 L120 1048 L80 1048 Z" fill="#FFFAA0" opacity="0.9" />
  </svg>
);

const BACKGROUNDS: Record<BackgroundType, React.FC> = {
  living_room: BgLivingRoom,
  office: BgOffice,
  car: BgCar,
  restaurant: BgRestaurant,
  street: BgStreet,
  bedroom: BgBedroom,
};

// ─── Speech bubble (comes from speaker direction) ─────────────────────────────

const SpeechBubble: React.FC<{ text: string; side: "left" | "right" }> = ({ text, side }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 18, stiffness: 220 } });

  if (!text || text === "...") return (
    <div style={{
      position: "absolute",
      top: 70,
      left: 60,
      right: 60,
      display: "flex",
      justifyContent: "center",
      transform: `scale(${scale})`,
      transformOrigin: "top center",
    }}>
      <div style={{
        background: "white",
        borderRadius: 20,
        padding: "18px 40px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        border: "3px solid #DDD",
      }}>
        <p style={{
          color: "#111",
          fontSize: 54,
          fontWeight: 900,
          fontFamily: "Arial Black, sans-serif",
          margin: 0,
          letterSpacing: 10,
        }}>...</p>
      </div>
    </div>
  );

  return (
    <div style={{
      position: "absolute",
      top: 60,
      left: 50,
      right: 50,
      display: "flex",
      justifyContent: "center",
      transform: `scale(${scale})`,
      transformOrigin: "top center",
    }}>
      <div style={{
        background: "white",
        borderRadius: 24,
        padding: "24px 44px",
        boxShadow: "0 6px 28px rgba(0,0,0,0.18)",
        border: "3.5px solid #E0E0E0",
        maxWidth: "92%",
        position: "relative",
      }}>
        {/* Bubble tail pointing down toward speaker */}
        <div style={{
          position: "absolute",
          bottom: -22,
          left: side === "left" ? "28%" : "68%",
          width: 0,
          height: 0,
          borderLeft: "18px solid transparent",
          borderRight: "18px solid transparent",
          borderTop: "24px solid white",
          filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.08))",
        }} />
        <p style={{
          color: "#111",
          fontSize: 50,
          fontWeight: 900,
          fontFamily: "Arial Black, sans-serif",
          textAlign: "center",
          margin: 0,
          lineHeight: 1.3,
        }}>
          {text}
        </p>
      </div>
    </div>
  );
};

// ─── Situation label (small, top-left) ───────────────────────────────────────

const SituationLabel: React.FC<{ situation: string }> = ({ situation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame, fps, config: { damping: 20, stiffness: 160 } });

  return (
    <div style={{
      position: "absolute",
      top: 28,
      right: 32,
      opacity,
    }}>
      <div style={{
        background: "linear-gradient(135deg, #FF8C00, #FFA500)",
        borderRadius: 40,
        padding: "10px 22px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        border: "2.5px solid #FF6500",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{ fontSize: 22 }}>🐾</span>
        <p style={{
          color: "white",
          fontSize: 26,
          fontWeight: 800,
          fontFamily: "Arial Black, sans-serif",
          textShadow: "1px 1px 0 rgba(0,0,0,0.3)",
          margin: 0,
          maxWidth: 320,
          lineHeight: 1.2,
        }}>
          {situation}
        </p>
      </div>
    </div>
  );
};

// ─── Character stage (single speaker, centered large) ────────────────────────

const CharacterStage: React.FC<{
  config: CharacterConfig;
  emotion: Emotion;
  pose: Pose;
  flip: boolean;
}> = ({ config, emotion, pose, flip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterProgress = spring({ frame, fps, config: { damping: 22, stiffness: 180 } });
  const slideX = interpolate(enterProgress, [0, 1], [flip ? 120 : -120, 0]);

  return (
    <div style={{
      position: "absolute",
      bottom: 120,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-end",
      transform: `translateX(${slideX}px)`,
    }}>
      <StickFigure
        gender={config.gender}
        hairStyle={config.hairStyle}
        outfit={config.outfit}
        emotion={emotion}
        pose={pose}
        isSpeaking
        flip={flip}
        scale={3.4}
      />
    </div>
  );
};

// ─── Single dialogue scene ────────────────────────────────────────────────────

const DialogueSceneComponent: React.FC<{
  scene: DialogueScene;
  protagonistConfig: CharacterConfig;
  antagonistConfig: CharacterConfig;
  situation: string;
  bgType: BackgroundType;
}> = ({ scene, protagonistConfig, antagonistConfig, situation, bgType }) => {
  const { speaker, text, emotion, pose, audioPath } = scene;
  const isProtagonist = speaker === "protagonist";
  const config = isProtagonist ? protagonistConfig : antagonistConfig;
  // Protagonist enters from left, antagonist from right
  const flip = !isProtagonist;
  const bubbleSide = isProtagonist ? "left" : "right";

  const BgComponent = BACKGROUNDS[bgType];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <BgComponent />
      <SituationLabel situation={situation} />
      <SpeechBubble text={text} side={bubbleSide} />
      <CharacterStage config={config} emotion={emotion} pose={pose} flip={flip} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────

export const StickFigureEpisode: React.FC<StickFigureEpisodeProps> = ({
  situation,
  backgroundType,
  characters,
  scenes,
}) => {
  return (
    <AbsoluteFill>
      <Series>
        {scenes.map((scene, i) => (
          <Series.Sequence key={i} durationInFrames={scene.durationInFrames}>
            <DialogueSceneComponent
              scene={scene}
              protagonistConfig={characters.protagonist}
              antagonistConfig={characters.antagonist}
              situation={situation}
              bgType={backgroundType}
            />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
