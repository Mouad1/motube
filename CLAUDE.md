# CLAUDE.md — Instructify Automation Platform

## Vue d'ensemble

**Instructify** est une plateforme de production vidéo automatisée pour YouTube faceless.
Chaîne multilingue (arabe, français, anglais, espagnol) avec IA, clonage de voix et publication automatique.

---

## Structure du projet

```
motube/
├── src/                        # Remotion — templates vidéo
│   └── compositions/
│       ├── templates/
│       │   ├── KarpathyEpisode.tsx        # 1920x1080 — éducation tech
│       │   ├── ArabicStoryEpisode.tsx     # 1920x1080 RTL — histoires arabes
│       │   └── ShortFormEpisode.tsx       # 1080x1920 9:16 — Shorts/Reels
│       └── scenes/                        # Composants scène individuels
├── pipeline/                   # Scripts Node.js autonomes
│   ├── lib/
│   │   ├── db.ts               # SQLite — source de vérité (getDb + db helpers)
│   │   ├── queue.ts            # BullMQ — 3 queues (render, tts, publish)
│   │   ├── elevenlabs.ts       # TTS + clonage voix (quota tracker inclus)
│   │   └── gemini.ts           # Traduction multilingue via Gemini Flash
│   ├── script-gen.ts           # Claude API : URL → SceneType[] JSON + .md
│   ├── tts.ts                  # ElevenLabs : texte scènes → audio MP3
│   ├── translate.ts            # Gemini : props_json → traductions multi-langues
│   ├── render.ts               # Remotion headless render → output/{id}.mp4
│   ├── publish.ts              # YouTube upload + multi-platform (Phase 4)
│   ├── animate.ts              # Lottie JSON injection couleur/texte
│   └── workers.ts              # BullMQ workers entry point
├── dashboard/                  # Next.js 16.2 — interface de gestion
│   ├── app/
│   │   ├── api/                # Routes API Next.js
│   │   ├── episodes/           # Pages gestion épisodes
│   │   ├── voice/              # Clonage voix ElevenLabs
│   │   ├── analytics/          # Revenue + vues (Phase 4)
│   │   └── publishing/         # File publication (Phase 4)
│   └── components/
│       ├── layout/             # Sidebar, AppShell
│       ├── episodes/           # EpisodeCard, NewEpisodeWizard
│       └── pipeline/           # IngestForm, RenderProgress
├── assets/
│   ├── audio/{episodeId}/      # Fichiers MP3 par scène
│   └── lottie/                 # Animations Lottie (base/ + {episodeId}/)
├── data/
│   ├── motube.db               # SQLite — créé automatiquement
│   └── elevenlabs-quota.json   # Suivi quota ElevenLabs free tier
├── output/                     # Vidéos rendues {episodeId}.mp4
├── scripts/episodes/           # Scripts markdown générés
└── docs/                       # Guides et documentation vidéo
```

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Vidéo | Remotion | 4.x |
| Frontend | Next.js | 16.2.3 |
| UI | shadcn/ui (@base-ui/react) | latest |
| DB | SQLite (better-sqlite3) | — |
| Queue | BullMQ + IORedis | — |
| Script IA | Claude claude-sonnet-4-6| API |
| TTS | ElevenLabs | free tier |
| Traduction | Gemini Flash | API |
| Publish | YouTube Data API v3 | Phase 4 |

---

## Contraintes critiques

### shadcn/ui — @base-ui/react (PAS Radix)
- **Ne pas utiliser `asChild` sur `<Button>`** — @base-ui ne supporte pas cette prop
- Remplacer `<Button asChild><Link>` par `<Link className="...">` stylé directement

### Remotion vs Next.js — isolation des modules
- Remotion utilise `"type": "module"` + `"moduleResolution": "bundler"`
- Next.js utilise Turbopack avec sa propre résolution
- **Ne jamais importer de modules pipeline/ dans les routes API via dynamic import**
- Les routes API spawnt des processus enfants via `spawn("npx", ["tsx", "pipeline/xxx.ts", ...])`

### SQLite dans Next.js
- `serverExternalPackages: ["better-sqlite3"]` dans `next.config.ts` — obligatoire
- Le fichier DB est partagé entre dashboard (Server Components) et pipeline scripts

### BullMQ dans le dashboard
- **Interdit** d'importer `bullmq` ou `ioredis` dans les routes Next.js (Turbopack crash)
- Les queues sont uniquement utilisées par `pipeline/workers.ts` (processus Node séparé)

### ElevenLabs free tier
- Quota : ~10 000 chars/mois
- Tracker de quota dans `data/elevenlabs-quota.json`
- Vérifier le quota avant chaque job TTS via `getRemainingQuota()`

---

## Status flow épisode

```
draft → scripted → translated → tts_done → rendered → published | failed
```

---

## Variables d'environnement (.env.local)

```env
ANTHROPIC_API_KEY=          # Claude Pro — génération scripts
GEMINI_API_KEY=             # Gemini Pro — traduction multilingue
ELEVENLABS_API_KEY=         # Free tier (10K chars/mo)
YOUTUBE_CLIENT_ID=          # Google Cloud Console — YouTube Data API v3
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback
REDIS_URL=redis://localhost:6379
DB_PATH=./data/motube.db
```

---

## Commandes

```bash
# Dashboard
cd dashboard && npm run dev          # localhost:3000

# Remotion Studio (3 templates visibles)
npm run studio

# BullMQ Workers (nécessite Redis)
npm run workers

# Pipeline CLI
npx tsx pipeline/script-gen.ts --episode-id <id> --url <url>
npx tsx pipeline/tts.ts --episode-id <id> [--voice-id <id>]
npx tsx pipeline/translate.ts --episode-id <id> --languages fr,en,es
npx tsx pipeline/render.ts --episode-id <id> --quality preview|full
npx tsx pipeline/animate.ts --episode-id <id> --scenes 5
```

---

## Phases de développement

| Phase | Statut | Contenu |
|-------|--------|---------|
| Phase 1 | ✅ Terminée | DB SQLite + BullMQ + Dashboard scaffold |
| Phase 2 | ✅ Terminée | Script-gen Claude, TTS ElevenLabs, traduction Gemini |
| Phase 3 | ✅ Terminée | Templates Remotion (Arabic + ShortForm), render headless, workers |
| Phase 4 | 🔄 En cours | YouTube OAuth2 + upload, analytics, multi-platform |

---

## Guides et documentation

- `docs/guide-creation-chaine-youtube-automatisee.md` — guide complet création chaîne + OAuth + workflow (utilisable comme script vidéo)
