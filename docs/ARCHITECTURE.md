# Architecture — Instructify

Plateforme de production vidéo automatisée pour YouTube faceless (arabe, français, anglais, espagnol).

---

## Vue d'ensemble

```
URL article/YouTube
      │
      ▼
 script-gen.ts          ← Claude API → SceneType[] JSON + .md
      │
      ├──► translate.ts  ← Gemini Flash → traductions multi-langues (DB)
      │
      ├──► tts.ts        ← ElevenLabs → assets/audio/{id}/scene-{i}.mp3
      │
      ├──► render.ts     ← Remotion headless → output/{episodeId}.mp4
      │
      └──► publish.ts    ← YouTube Data API v3 → upload + re-encode TikTok/Reels
```

Tout passe par SQLite comme source de vérité. Le dashboard orchestre via des child processes spawned.

---

## Status flow épisode

```
draft → scripted → translated → tts_done → rendered → published | failed
```

---

## Composants principaux

### 1. Dashboard — `dashboard/` (Next.js 16.2)

Interface de gestion sur `localhost:3000`.

| Route | Rôle |
|-------|------|
| `/` | Liste des épisodes + statuts |
| `/episodes/new` | Wizard création épisode (article / YouTube / histoire arabe) |
| `/episodes/[id]` | Détail épisode, progression pipeline |
| `/voice` | Clonage voix ElevenLabs |
| `/analytics` | Revenue + vues YouTube (recharts) |
| `/publishing` | File de publication |

**Contrainte critique :** Les routes API ne font jamais d'import direct de `pipeline/`. Elles spawnen des processus enfants détachés.

### 2. Pipeline — `pipeline/` (scripts Node.js autonomes)

Scripts exécutables individuellement ou via BullMQ workers.

| Fichier | Rôle |
|---------|------|
| `script-gen.ts` | URL → SceneType[] JSON via Claude |
| `tts.ts` | Scènes texte → MP3 via ElevenLabs |
| `translate.ts` | Props JSON → traductions multilingues via Gemini |
| `render.ts` | Remotion headless → output/{id}.mp4 |
| `publish.ts` | Upload YouTube + re-encode ffmpeg pour TikTok/Reels |
| `animate.ts` | Injection couleur/texte dans Lottie JSON |
| `workers.ts` | BullMQ workers (render ×1, tts ×2, publish ×3) |

#### Bibliothèques partagées (`pipeline/lib/`)

| Fichier | Rôle |
|---------|------|
| `db.ts` | SQLite init WAL, 5 tables, exports `getDb()` + helpers |
| `queue.ts` | BullMQ : 3 queues (render, tts, publish) |
| `elevenlabs.ts` | TTS + clonage voix + quota tracker |
| `gemini.ts` | Traduction multilingue + extraction scènes arabes |
| `youtube.ts` | OAuth2 + uploadVideo() + getVideoAnalytics() |
| `analytics-sync.ts` | Sync YouTube Analytics → SQLite |

### 3. Templates vidéo — `src/compositions/` (Remotion 4)

| Template | Format | Usage |
|----------|--------|-------|
| `KarpathyEpisode.tsx` | 1920×1080 | Éducation tech, style Karpathy |
| `ArabicStoryEpisode.tsx` | 1920×1080 RTL | Histoires arabes |
| `ShortFormEpisode.tsx` | 1080×1920 | Shorts / Reels |

#### Scènes arabes (`src/compositions/scenes/`)
- `ArabicTitleScene.tsx` — titre RTL + ornements
- `ArabicNarratorScene.tsx` — Lottie gauche + texte RTL droite
- `ArabicDialogueScene.tsx` — bulle discours RTL + traduction

### 4. Base de données — `data/motube.db` (SQLite)

5 tables principales :
- `episodes` — source de vérité, statut pipeline
- `scenes` — scènes JSON par épisode
- `translations` — traductions par langue
- `publications` — records upload YouTube
- `analytics` — métriques vues/revenue

### 5. File de jobs — BullMQ + Redis

3 queues gérées par `pipeline/workers.ts` :
- `render` — concurrence 1 (Remotion CPU-bound)
- `tts` — concurrence 2
- `publish` — concurrence 3

**Interdit dans Next.js :** BullMQ/IORedis ne peuvent pas être importés dans les routes API (Turbopack crash).

---

## Dépendances externes

| Service | Usage | Clé env |
|---------|-------|---------|
| Claude claude-sonnet-4-6 | Génération scripts | `ANTHROPIC_API_KEY` |
| Gemini Flash | Traduction multilingue | `GEMINI_API_KEY` |
| ElevenLabs (free tier) | TTS + clonage voix (10K chars/mois) | `ELEVENLABS_API_KEY` |
| YouTube Data API v3 | Upload vidéos | `YOUTUBE_CLIENT_ID/SECRET` |
| YouTube Analytics API | Sync métriques | (même credentials) |
| Redis | BullMQ broker | `REDIS_URL` |

---

## Commandes

```bash
# Lancer le dashboard
npm run dashboard              # localhost:3000

# Lancer les workers BullMQ (Redis requis)
npm run workers

# Remotion Studio (prévisualisation)
npm run studio

# Pipeline CLI
npm run generate:script        # URL → script JSON
npm run generate:tts           # scènes → MP3
npx tsx pipeline/translate.ts --episode-id <id> --languages fr,en,es
npx tsx pipeline/render.ts --episode-id <id> --quality preview|full
npx tsx pipeline/publish.ts --episode-id <id>

# OAuth YouTube (première fois)
npx tsx pipeline/lib/youtube-exchange.ts
```

---

## Phases de développement

| Phase | Statut | Contenu |
|-------|--------|---------|
| 1 | ✅ | DB SQLite + BullMQ + Dashboard scaffold |
| 2 | ✅ | Script-gen Claude, TTS ElevenLabs, traduction Gemini |
| 3 | ✅ | Templates Remotion, render headless, workers |
| 4 | ✅ | YouTube OAuth2 + upload, analytics, multi-platform |
