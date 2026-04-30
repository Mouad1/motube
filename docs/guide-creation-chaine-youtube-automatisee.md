# Comment créer une chaîne YouTube automatisée de A à Z
### Guide complet — Instructify Automation Platform

---

## Introduction

Dans ce guide, je vais te montrer exactement comment j'ai construit **Instructify** — une chaîne YouTube faceless entièrement automatisée qui génère des vidéos multilingues à partir d'articles ou de vidéos existantes, avec clonage de voix, animation, et publication automatique.

Ce que tu vas apprendre :
- Créer et configurer une chaîne YouTube professionnelle
- Connecter l'API YouTube à ton code
- Automatiser la création et publication de vidéos avec l'IA
- Suivre tes analytics et revenus depuis un dashboard

---

## Partie 1 — Créer la chaîne YouTube

### Étape 1 : Créer un compte Google dédié (recommandé)

1. Va sur [accounts.google.com](https://accounts.google.com)
2. Crée un nouveau compte Google **séparé de ton compte personnel**
   - Nom d'utilisateur : quelque chose lié à ta marque (ex. `instructify.channel`)
   - Avantage : isolation complète, plus facile à revendre ou déléguer
3. Active la vérification en 2 étapes (obligatoire pour l'API YouTube)

### Étape 2 : Créer la chaîne YouTube

1. Connecte-toi sur [youtube.com](https://youtube.com) avec le compte dédié
2. Clique sur ton avatar → **"Créer une chaîne"**
3. Choisis **"Utiliser un nom personnalisé"** (pas ton nom Google)
   - Nom : `Instructify`
4. Complète le profil :
   - **Description** : contenu éducatif multilingue, Arabic → FR/EN/ES
   - **Liens** : laisse vide pour l'instant
   - **Photo de profil** : logo minimaliste (lettre I stylisée, fond sombre)
5. Note ton **Channel ID** (visuel dans l'URL de ta chaîne) — tu en auras besoin

### Étape 3 : Paramètres de monétisation (préparer le terrain)

1. Va dans **YouTube Studio** → Paramètres → Chaîne → Éligibilité
2. Cible : 1 000 abonnés + 4 000 heures de visionnage pour activer AdSense
3. Active le **mode Contenu pour les adultes désactivé** pour maximiser les annonces
4. Langue de la chaîne : Anglais (audience mondiale) même si contenu multilingue

---

## Partie 2 — Google Cloud Console + YouTube Data API

### Étape 4 : Créer un projet Google Cloud

1. Va sur [console.cloud.google.com](https://console.cloud.google.com)
2. Clique sur le sélecteur de projet en haut → **"Nouveau projet"**
   - Nom : `instructify-automation`
   - Organisation : aucune (compte personnel)
3. Sélectionne le projet créé

### Étape 5 : Activer YouTube Data API v3

1. Dans le menu gauche → **"APIs et services"** → **"Bibliothèque"**
2. Cherche `YouTube Data API v3`
3. Clique → **"Activer"**
4. Attends 30 secondes que l'activation se propage

### Étape 6 : Configurer l'écran de consentement OAuth

1. **APIs et services** → **"Écran de consentement OAuth"**
2. Type d'utilisateur : **Externe** (même pour usage personnel)
3. Remplis les informations :
   - Nom de l'application : `Instructify Automation`
   - Email d'assistance : ton email
   - Logo : optionnel
4. Clique **"Enregistrer et continuer"** (skip les scopes pour l'instant)
5. Sur la page "Utilisateurs de test" → **ajoute ton email Google de la chaîne**
6. Clique **"Enregistrer et continuer"** jusqu'à la fin

### Étape 7 : Créer les credentials OAuth2

1. **APIs et services** → **"Identifiants"** → **"+ Créer des identifiants"** → **"ID client OAuth"**
2. Type d'application : **Application Web**
3. Nom : `instructify-dashboard`
4. **URI de redirection autorisés** → ajoute :
   ```
   http://localhost:3000/api/auth/youtube/callback
   ```
5. Clique **"Créer"**
6. **Copie immédiatement** le `Client ID` et `Client Secret` affichés
7. Télécharge le fichier JSON (garde-le en sécurité, ne le commit jamais)

### Étape 8 : Configurer les variables d'environnement

Dans ton fichier `.env.local` à la racine du projet :

```env
YOUTUBE_CLIENT_ID=ton_client_id_ici
YOUTUBE_CLIENT_SECRET=ton_client_secret_ici
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback
```

---

## Partie 3 — La plateforme d'automatisation

### Architecture du système

Voici comment fonctionne la chaîne de production automatisée :

```
Source (Article / Vidéo YouTube / Histoire arabe)
    ↓
script-gen.ts — Claude AI génère le script structuré (scènes JSON)
    ↓
tts.ts — ElevenLabs clone ta voix et génère l'audio scène par scène
    ↓
translate.ts — Gemini Flash traduit en FR/EN/ES/AR automatiquement
    ↓
render.ts — Remotion assemble la vidéo (animations, texte, audio)
    ↓
publish.ts — Upload automatique YouTube + TikTok + Instagram Reels
    ↓
analytics — Suivi des vues, revenus AdSense, CTR depuis le dashboard
```

### Les templates vidéo disponibles

**KarpathyEpisode (16:9 — YouTube)** : vidéos éducatives style Andrej Karpathy, texte dense, code animé, idéal pour les sujets tech

**ArabicStoryEpisode (16:9 — YouTube)** : histoires arabes animées avec personnages Lottie, overlay de traduction, RTL natif

**ShortFormEpisode (9:16 — Shorts/Reels/TikTok)** : format vertical 60 secondes, texte impactant, optimisé pour la viralité

### Stack technique utilisée

| Outil | Rôle | Coût |
|-------|------|------|
| Remotion 4.x | Rendu vidéo programmatique | Gratuit (open source) |
| Claude claude-sonnet-4-6 | Génération de scripts IA | Claude Pro |
| ElevenLabs | Clonage de voix + TTS | Free tier (10K chars/mo) |
| Gemini Flash | Traduction multilingue | Gemini Pro |
| YouTube Data API v3 | Upload + Analytics | Gratuit (quotas généreux) |
| Next.js 16 | Dashboard de gestion | Gratuit |
| SQLite | Base de données locale | Gratuit |
| BullMQ + Redis | File de jobs asynchrones | Gratuit (Redis local) |

---

## Partie 4 — Workflow quotidien

### Créer un épisode depuis un article

```bash
# 1. Ouvre le dashboard
cd dashboard && npm run dev

# 2. Va sur localhost:3000 → "Nouvelle vidéo" → Source : Article
# 3. Colle l'URL de l'article → Lance la génération

# Ou en ligne de commande :
npx tsx pipeline/script-gen.ts --episode-id <id> --url https://example.com/article
```

### Générer l'audio avec ta voix clonée

```bash
# Depuis le dashboard → page Voix → Upload sample (30 sec de ta voix)
# L'API ElevenLabs clone ta voix en ~2 minutes

# Ou en ligne de commande :
npx tsx pipeline/tts.ts --episode-id <id>
```

### Rendre la vidéo

```bash
npx tsx pipeline/render.ts --episode-id <id> --quality preview
# preview : rapide, 720p (test)
# full : lent, 1080p (publication)
```

### Publier sur YouTube

```bash
# Depuis le dashboard → épisode → "Publier"
# Ou automatiquement via les workers BullMQ
npm run workers
```

---

## Partie 5 — Stratégie de croissance

### Les 3 piliers d'une chaîne faceless qui scale

**1. Volume + Cohérence**
- 3-5 vidéos par semaine minimum les 3 premiers mois
- L'algorithme YouTube récompense la régularité plus que la perfection
- L'automatisation te permet de tenir ce rythme sans burn-out

**2. Niches à fort CPC**
Les thèmes les plus rentables pour AdSense en 2025 :
- Finance personnelle / investissement : $15-50 CPM
- Tech / IA / Programmation : $10-30 CPM
- Développement personnel : $8-20 CPM
- Histoire / éducation : $5-15 CPM

**3. Multi-langue = multiplication des audiences**
Une seule vidéo → 4 versions (AR/FR/EN/ES) = 4x l'exposition avec le même effort

### Thumbnails (stratégie NotebookLM)

NotebookLM peut analyser tes scripts et suggérer :
- Les angles de thumbnail les plus clickbait pour le sujet
- Les mots-clés à mettre en gros sur le visuel
- Le contraste émotionnel optimal (curiosité vs révélation)

Format recommandé : fond sombre + visage/personnage à droite + texte choc à gauche (style MrBeast simplifié)

### SEO YouTube — checklist par vidéo

- [ ] Titre : mot-clé principal dans les 5 premiers mots
- [ ] Description : 200 mots minimum, mot-clé répété 3x naturellement
- [ ] Tags : 5-8 tags spécifiques (pas génériques)
- [ ] Chapitres : timestamps dans la description (booste watch time)
- [ ] Cards et écran de fin : renvoyer vers d'autres vidéos
- [ ] Première heure : partager dans 2-3 communautés pertinentes

---

## Conclusion

Tu as maintenant tous les éléments pour lancer une chaîne YouTube entièrement automatisée :
- Infrastructure technique complète avec le projet motube
- Connexion YouTube via OAuth2
- Pipeline IA : script → voix → vidéo → publication
- Stratégie de croissance multi-langue

Le seul investissement réel : ton temps pour les 2-3 premières vidéos le temps de valider le pipeline. Ensuite, le système tourne seul.

---

*Guide généré dans le cadre du projet Instructify — plateforme open source d'automatisation vidéo YouTube*
