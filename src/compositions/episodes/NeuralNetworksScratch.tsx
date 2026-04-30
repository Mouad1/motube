import { KarpathyEpisode, type EpisodeProps } from "../templates/KarpathyEpisode";

// Épisode: Neural Networks from Scratch
// Date: 2026-04-13
// Script: scripts/episodes/neural-networks-scratch.md

const props: EpisodeProps = {
  title: "Neural Networks from Scratch",
  scenes: [
    {
      type: "title",
      durationInFrames: 150,
      data: {
        title: "Neural Networks from Scratch",
        subtitle: "Construit depuis zéro",
      },
    },
    {
      type: "concept",
      durationInFrames: 300,
      data: {
        heading: "L'intuition d'abord",
        body: "Avant tout code, comprendre POURQUOI. Décris le concept ici.",
      },
    },
    {
      type: "code",
      durationInFrames: 400,
      data: {
        language: "python",
        code: "# Implémentation depuis zéro\nprint('hello world')",
        explanation: "Explication de ce que fait ce code.",
      },
    },
    {
      type: "transition",
      durationInFrames: 90,
      data: { text: "maintenant vérifions" },
    },
  ],
};

export const NeuralNetworksScratch: React.FC = () => <KarpathyEpisode {...props} />;
