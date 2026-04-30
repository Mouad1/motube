/**
 * pipeline/new-episode.ts
 * Crée le scaffold d'un nouvel épisode (script + composition)
 * Usage: npm run new:episode -- --title "Mon sujet" --slug "mon-sujet"
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const title = getArg("--title") ?? "Episode sans titre";
const slug = getArg("--slug") ?? title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
const date = new Date().toISOString().split("T")[0];

// 1. Crée le script markdown
const scriptPath = join("scripts/episodes", `${slug}.md`);
if (!existsSync("scripts/episodes")) mkdirSync("scripts/episodes", { recursive: true });

const scriptContent = `---
title: "${title}"
slug: "${slug}"
date: ${date}
status: draft
---

# ${title}

## Hook (0:00 - 0:30)
> Commence par la conclusion surprenante. Montre ce qu'on va construire.

[SCRIPT]

## Intuition (0:30 - 2:00)
> Explication visuelle AVANT toute formule. Utilise des analogies concrètes.

[SCRIPT]

## Construction from scratch (2:00 - X:XX)
> Implémente pas à pas. Chaque ligne de code expliquée. Aucune boîte noire.

### Étape 1 : [Nom]
\`\`\`python
# code ici
\`\`\`
[Explication de cette étape]

### Étape 2 : [Nom]
\`\`\`python
# code ici
\`\`\`
[Explication de cette étape]

## Vérification (X:XX - X:XX)
> Montre que ça marche. Teste les cas limites. Explique les échecs.

[SCRIPT]

## Takeaway dense (X:XX - fin)
> Résumé sans padding. Exactement ce qu'il faut retenir.

[SCRIPT]
`;

writeFileSync(scriptPath, scriptContent);
console.log(`Script créé : ${scriptPath}`);

// 2. Crée la composition TypeScript
const compDir = join("src/compositions/episodes");
if (!existsSync(compDir)) mkdirSync(compDir, { recursive: true });

const compName = slug
  .split("-")
  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
  .join("");

const compPath = join(compDir, `${compName}.tsx`);
const compContent = `import { KarpathyEpisode, type EpisodeProps } from "../templates/KarpathyEpisode";

// Épisode: ${title}
// Date: ${date}
// Script: scripts/episodes/${slug}.md

const props: EpisodeProps = {
  title: "${title}",
  scenes: [
    {
      type: "title",
      durationInFrames: 150,
      data: {
        title: "${title}",
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
        code: "# Implémentation depuis zéro\\nprint('hello world')",
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

export const ${compName}: React.FC = () => <KarpathyEpisode {...props} />;
`;

writeFileSync(compPath, compContent);
console.log(`Composition créée : ${compPath}`);

console.log(`
Épisode "${title}" initialisé avec succès.

Prochaines étapes :
  1. Rédiger le script → ${scriptPath}
  2. Adapter la composition → ${compPath}
  3. Enregistrer dans src/Root/index.tsx
  4. npm run studio — pour prévisualiser
`);
