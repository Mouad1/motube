# Design Spec — HeyGen Avatar Pipeline (Concept Episodes)

**Date :** 2026-04-16  
**Statut :** Approuvé  
**Approche retenue :** A — HeyGen comme asset, Remotion comme éditeur

---

## Vue d'ensemble

Ce pipeline transforme un script texte brut en vidéo professionnelle avec avatar IA en quelques minutes. Il s'intègre dans le pipeline Instructify existant comme une nouvelle piste de production dédiée aux épisodes d'explication de concepts.

**Stack :**
- **ElevenLabs** — clonage voix, génération audio par chunk
- **HeyGen Avatar 5** — avatar visuel réaliste (workaround Playwright en attendant l'API officielle)
- **Remotion** — assemblage final, overlays motion graphics synchronisés via Whisper
- **FFmpeg** — utilisé en interne par Remotion pour le stitching

---

## Status Flow

```
draft → scripted → translated → tts_done → heygen_chunked → heygen_done → rendered → published | failed
```

- `heygen_chunked` : chunks découpés, jobs HeyGen Avatar 4 soumis
- `heygen_done` : tous les MP4 Avatar 5 téléchargés dans `assets/heygen/{episodeId}/`

---

## Nouveaux fichiers

```
pipeline/
├── chunk-script.ts         # Découpe script → chunks 45-60s (fin de phrase)
├── heygen.ts               # Génération HeyGen API Avatar 4 + polling
├── heygen-upgrade.ts       # Playwright : upgrade Avatar 4 → Avatar 5 + download
└── lib/
    ├── heygen.ts           # Client HeyGen API (génération, polling, download)
    └── transcribe.ts       # Whisper local → timestamps mot par mot

src/compositions/templates/
└── ConceptEpisode.tsx      # Nouveau template Remotion 1920x1080

data/
├── chunks/{episodeId}.json      # Chunks texte + durées estimées
└── transcripts/{episodeId}.json # Timestamps Whisper

assets/
└── heygen/{episodeId}/
    ├── chunk-0.mp4
    ├── chunk-1.mp4
    └── ...
```

---

## Section 1 — Architecture & Flux de données

```
script.md
  └─ chunk-script.ts ──→ chunks[] (texte + durée estimée)
       └─ tts.ts ────────→ assets/audio/{id}/chunk-N.mp3
            └─ heygen.ts ─→ HeyGen API (Avatar 4, audio_url=chunk-N.mp3) → job_id[]
                 └─ heygen-upgrade.ts (Playwright)
                      └─ assets/heygen/{id}/chunk-N.mp4  ← lip sync sur audio ElevenLabs
                           └─ transcribe.ts ──→ data/transcripts/{id}.json
                                └─ render.ts ──→ ConceptEpisode → output/{id}.mp4
```

> **Lip sync :** L'audio ElevenLabs est fourni à HeyGen lors de la génération (`audio_url` dans l'API). HeyGen génère la vidéo avatar avec lip sync calé sur cet audio. Dans Remotion, la vidéo HeyGen est rendue telle quelle (audio inclus). `audioSrc` dans les props sert uniquement de fallback ou pour les overlays.

---

## Section 2 — Chunking & Contraintes

### Algorithme de découpe

- Cible : **45 à 60 secondes** de parole par chunk
- Estimation : ~150 mots/minute → **112–150 mots par chunk**
- Règle de coupe : **uniquement à la fin d'une phrase** (`.`, `!`, `?`, `…`)
- Si une phrase seule dépasse 60s → passe seule, loggué en warning
- Output : `data/chunks/{episodeId}.json`

```ts
type Chunk = {
  index: number;
  text: string;
  estimatedDuration: number; // secondes
}
```

### Contraintes HeyGen

| Contrainte | Solution |
|---|---|
| Cap 3 min par génération | Chunks ≤ 60s → bien en dessous |
| Avatar 5 non dispo via API | Playwright auto-upgrade après Avatar 4 |
| Coût ~$4/min | Log coût estimé avant soumission, confirmation CLI |
| Polling status | `GET /v2/video_status` toutes les 10s, timeout 10min |

### Contraintes ElevenLabs

| Contrainte | Solution |
|---|---|
| Dégradation au-delà de 1 min | Chunks ≤ 60s |
| Quota free tier 10K chars/mo | `getRemainingQuota()` existant dans `lib/elevenlabs.ts` |

### Variables d'environnement (`.env.local`)

```env
HEYGEN_API_KEY=             # HeyGen Creator plan (~$30/mo)
HEYGEN_AVATAR_ID=           # ID de l'avatar entraîné (Avatar 4)
WHISPER_MODEL=base          # ou openai/whisper-1 si API
```

### Coûts estimés

| Service | Coût | Fréquence |
|---|---|---|
| HeyGen API | ~$4/min de vidéo | Par épisode |
| HeyGen Creator | ~$30/mo | Mensuel |
| ElevenLabs Creator | ~$22/mo | Mensuel |
| Vidéo 10 min | ~$50 en credits | Par épisode |

---

## Section 3 — Playwright Avatar 5 & Transcription

### `heygen-upgrade.ts`

Playwright headless exécuté après génération de tous les chunks Avatar 4 :

1. Login HeyGen (session persistée dans `data/.heygen-session.json`)
2. Pour chaque chunk Avatar 4 :
   - Ouvrir le clip dans le dashboard
   - Cliquer "Switch to Avatar 5"
   - Confirmer la régénération
   - Polling jusqu'à `completed`
   - Télécharger MP4 → `assets/heygen/{episodeId}/chunk-N.mp4`
3. Marquer épisode → `heygen_done`

**Gestion d'erreur :** retry x2 par chunk, fallback sur Avatar 4 si échec (warning loggué).  
**Note :** Ce fichier sera supprimé dès qu'Avatar 5 est disponible via API officielle.

### `lib/transcribe.ts`

Utilise `whisper.cpp` (via `nodejs-whisper`) sur les MP3 ElevenLabs :

```json
[
  { "word": "Les", "start": 0.0, "end": 0.12 },
  { "word": "réseaux", "start": 0.13, "end": 0.45 }
]
```

Stocké dans `data/transcripts/{episodeId}.json`.

### `ConceptEpisode.tsx` — Props Remotion

```ts
type ConceptEpisodeProps = {
  chunks: {
    videoSrc: string;   // assets/heygen/{id}/chunk-N.mp4
    audioSrc: string;   // assets/audio/{id}/chunk-N.mp3
    duration: number;   // secondes
  }[];
  motionEvents: {
    sceneType: string;  // "title" | "bullet_points" | "concept" | "diagram"
    data: object;
    triggerAt: number;  // secondes → converti en frames via Math.round(t * fps)
  }[];
  lang: "fr" | "en" | "ar" | "es";
}
```

Les chunks défilent en séquence via `<Series>`. Les overlays s'affichent exactement aux timestamps Whisper.

---

## Commandes CLI

```bash
npx tsx pipeline/chunk-script.ts --episode-id <id>
npx tsx pipeline/tts.ts --episode-id <id>
npx tsx pipeline/heygen.ts --episode-id <id>
npx tsx pipeline/heygen-upgrade.ts --episode-id <id>
npx tsx pipeline/render.ts --episode-id <id> --template concept
```
