import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Lottie } from "@remotion/lottie";

interface ArabicNarratorSceneProps {
  arabicText: string;
  translatedText: string;
  lottieSrc?: string; // path relative to public/ or absolute via staticFile
  audioSrc?: string;  // path to MP3 in assets/audio/
}

export const ArabicNarratorScene: React.FC<ArabicNarratorSceneProps> = ({
  arabicText,
  translatedText,
  lottieSrc,
  audioSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animations
  const panelOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const arabicSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const arabicY = interpolate(arabicSpring, [0, 1], [30, 0]);
  const arabicOpacity = interpolate(frame, [5, 30], [0, 1], { extrapolateRight: "clamp" });

  const translatedOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: "clamp" });

  // Fade out near end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const combinedOpacity = Math.min(panelOpacity, fadeOut);

  // Lottie animation data (loaded inline if provided)
  const [lottieData, setLottieData] = React.useState<object | null>(null);

  React.useEffect(() => {
    if (!lottieSrc) return;
    fetch(lottieSrc)
      .then((r) => r.json())
      .then(setLottieData)
      .catch(() => setLottieData(null));
  }, [lottieSrc]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d", opacity: combinedOpacity }}>
      {/* Audio */}
      {audioSrc && (
        <Audio src={staticFile(audioSrc)} />
      )}

      {/* Split layout: Lottie left (40%), Text right (60%) */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          padding: "60px 80px",
          gap: 60,
          alignItems: "center",
        }}
      >
        {/* Left: Lottie character animation */}
        <div
          style={{
            flex: "0 0 40%",
            height: "70%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#111",
            borderRadius: 24,
            border: "1px solid #1e1e1e",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {lottieData ? (
            <Lottie
              animationData={lottieData}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            /* Placeholder geometric pattern when no Lottie */
            <div
              style={{
                width: 200,
                height: 200,
                border: "2px solid #6ee7b7",
                borderRadius: "50%",
                opacity: 0.3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  border: "2px solid #6ee7b7",
                  borderRadius: "50%",
                  opacity: 0.5,
                }}
              />
            </div>
          )}

          {/* Teal corner accent */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: "#6ee7b7",
              opacity: 0.6,
            }}
          />
        </div>

        {/* Right: Text content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 36,
            justifyContent: "center",
          }}
        >
          {/* Arabic text — RTL */}
          <div
            style={{
              color: "#f5f0e8",
              fontFamily: "serif",
              fontSize: 44,
              lineHeight: 1.8,
              direction: "rtl",
              textAlign: "right",
              opacity: arabicOpacity,
              transform: `translateY(${arabicY}px)`,
            }}
          >
            {arabicText}
          </div>

          {/* Divider */}
          <div
            style={{
              width: interpolate(frame, [20, 60], [0, 200], { extrapolateRight: "clamp" }),
              height: 2,
              backgroundColor: "#6ee7b7",
              opacity: 0.5,
              borderRadius: 1,
              alignSelf: "flex-end",
            }}
          />

          {/* Translation */}
          <div
            style={{
              color: "#9ca3af",
              fontFamily: "sans-serif",
              fontSize: 26,
              lineHeight: 1.7,
              fontStyle: "italic",
              opacity: translatedOpacity,
              textAlign: "left",
            }}
          >
            {translatedText}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
