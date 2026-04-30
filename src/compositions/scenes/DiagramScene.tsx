import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";

interface DiagramNode {
  id: string;
  label: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  color?: string;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

interface DiagramSceneProps {
  heading: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  caption?: string;
  audioPath?: string;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;
const CANVAS_W = 1760; // 1920 - 2*80 padding
const CANVAS_H = 760;  // ~720 usable

// Scène diagramme — noeuds et arêtes animés, révélation progressive
export const DiagramScene: React.FC<DiagramSceneProps> = ({
  heading,
  nodes,
  edges,
  caption,
  audioPath,
}) => {
  const frame = useCurrentFrame();

  const headingOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Nodes appear staggered after frame 20
  const FRAMES_PER_NODE = 18;

  // Build node position map
  const nodeMap = new Map(
    nodes.map((n) => [
      n.id,
      {
        cx: (n.x / 100) * CANVAS_W,
        cy: (n.y / 100) * CANVAS_H,
        color: n.color ?? "#6ee7b7",
        label: n.label,
      },
    ])
  );

  // Edges appear after all nodes
  const edgesStartFrame = 20 + nodes.length * FRAMES_PER_NODE;
  const FRAMES_PER_EDGE = 20;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        padding: 80,
        flexDirection: "column",
        gap: 24,
      }}
    >
      {audioPath && <Audio src={audioPath} />}

      {/* Heading */}
      <div
        style={{
          color: "#f0f0f0",
          fontFamily: "sans-serif",
          fontSize: 42,
          fontWeight: 700,
          opacity: headingOpacity,
        }}
      >
        {heading}
      </div>

      {/* SVG canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <svg
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ position: "absolute", inset: 0 }}
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;

            const edgeFrame = edgesStartFrame + i * FRAMES_PER_EDGE;
            const opacity = interpolate(frame, [edgeFrame, edgeFrame + 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            const mx = (from.cx + to.cx) / 2;
            const my = (from.cy + to.cy) / 2;

            return (
              <g key={i} opacity={opacity}>
                <line
                  x1={from.cx}
                  y1={from.cy}
                  x2={to.cx}
                  y2={to.cy}
                  stroke="#555"
                  strokeWidth={2}
                  markerEnd="url(#arrow)"
                />
                {edge.label && (
                  <text
                    x={mx}
                    y={my - 10}
                    fill="#aaa"
                    fontSize={16}
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Arrow marker */}
          <defs>
            <marker
              id="arrow"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#555" />
            </marker>
          </defs>
        </svg>

        {/* Nodes (HTML for better text rendering) */}
        {nodes.map((node, i) => {
          const pos = nodeMap.get(node.id)!;
          const nodeFrame = 20 + i * FRAMES_PER_NODE;
          const opacity = interpolate(frame, [nodeFrame, nodeFrame + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const scale = interpolate(frame, [nodeFrame, nodeFrame + 15], [0.7, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: pos.cx - NODE_WIDTH / 2,
                top: pos.cy - NODE_HEIGHT / 2,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                backgroundColor: "#111",
                border: `2px solid ${pos.color}`,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity,
                transform: `scale(${scale})`,
              }}
            >
              <span
                style={{
                  color: pos.color,
                  fontFamily: "monospace",
                  fontSize: 18,
                  fontWeight: 600,
                  textAlign: "center",
                  padding: "0 12px",
                }}
              >
                {node.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Caption */}
      {caption && (
        <div
          style={{
            color: "#888",
            fontFamily: "sans-serif",
            fontSize: 22,
            opacity: interpolate(frame, [edgesStartFrame + edges.length * FRAMES_PER_EDGE, edgesStartFrame + edges.length * FRAMES_PER_EDGE + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {caption}
        </div>
      )}
    </AbsoluteFill>
  );
};
