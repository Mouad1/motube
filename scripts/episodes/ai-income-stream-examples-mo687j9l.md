---
title: "8 Sources de Revenus en Restant Salarié"
slug: "ai-income-stream-examples-mo687j9l"
date: 2026-04-19
status: scripted
---

# 8 Sources de Revenus en Restant Salarié

## Scène 1 — TITLE
> Duration: 150 frames

**title**: 8 Sources de Revenus
**subtitle**: Construire sa liberté financière sans quitter son emploi

## Scène 2 — CONCEPT
> Duration: 240 frames

**heading**: Pourquoi diversifier ses revenus ?
**body**: Dépendre d'un seul salaire est risqué : licenciement, inflation, plafond de verre. Construire plusieurs flux de revenus en parallèle permet d'atteindre la liberté financière progressivement, sans tout risquer d'un coup. L'objectif : faire travailler son temps ET ses compétences existantes.

## Scène 3 — CONCEPT
> Duration: 240 frames

**heading**: Flux #1 — Freelance & Consulting
**body**: Monétisez directement vos compétences professionnelles actuelles (code, marketing, design, finance) en dehors des heures de travail. Les plateformes comme Malt, Upwork ou LinkedIn permettent de trouver ses premiers clients. Un taux journalier moyen de 400-800€ est accessible dès la première mission.

## Scène 4 — CONCEPT
> Duration: 240 frames

**heading**: Flux #2 — Contenu Digital & Personal Branding
**body**: Créer du contenu sur YouTube, TikTok ou LinkedIn autour de votre expertise génère de la visibilité qui se monétise via la publicité, le sponsoring et les partenariats. Exemple concret : Sabrina Ramonov est passée de 0 à 500k abonnés en 6 mois avec 0€ de budget publicitaire, uniquement grâce à la constance et à l'IA.

## Scène 5 — CODE
> Duration: 300 frames

```
# Automatiser la création de contenu avec l'IA (Python + OpenAI)
import openai

client = openai.OpenAI(api_key="YOUR_API_KEY")

def generer_idees_contenu(niche: str, nb_idees: int = 8) -> list[str]:
    """Génère des idées de posts viraux pour une niche donnée."""
    prompt = f"""
    Tu es un expert en marketing de contenu.
    Génère {nb_idees} idées de posts viraux pour la niche : {niche}
    Format : liste numérotée, titres accrocheurs, style éducatif.
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8
    )
    idees = response.choices[0].message.content.strip().split("\n")
    return [i for i in idees if i.strip()]

# Exemple d'utilisation
niche = "revenus passifs pour développeurs"
idees = generer_idees_contenu(niche, nb_idees=8)
for idee in idees:
    print(idee)
```
**language**: python
**explanation**: Ce script utilise l'API OpenAI pour générer automatiquement des idées de contenu viral pour n'importe quelle niche. En automatisant la phase d'idéation (la plus chronophage), vous pouvez publier 5x plus de contenu avec le même temps investi — c'est exactement le principe derrière des outils comme Blotato.

## Scène 6 — CONCEPT
> Duration: 240 frames

**heading**: Flux #3 & #4 — Produits Numériques & Formations
**body**: Un e-book, un template Notion, un cours en ligne ou un prompt pack se vend indéfiniment sans coût marginal. Créé une seule fois, ce type de produit génère des revenus passifs 24h/24. Plateformes recommandées : Gumroad, Teachable, ou votre propre site avec Stripe.

## Scène 7 — CODE
> Duration: 300 frames

```
# Calculateur de revenus passifs - projections sur 12 mois
def projeter_revenus_passifs(
    prix_produit: float,
    ventes_mois_1: int,
    taux_croissance_mensuel: float = 0.15,
    nb_mois: int = 12
) -> dict:
    """Projette les revenus d'un produit numérique sur N mois."""
    revenus_par_mois = []
    ventes = ventes_mois_1

    for mois in range(1, nb_mois + 1):
        revenu_mois = round(ventes * prix_produit, 2)
        revenus_par_mois.append({
            "mois": mois,
            "ventes": int(ventes),
            "revenu": revenu_mois
        })
        ventes *= (1 + taux_croissance_mensuel)

    total = sum(m["revenu"] for m in revenus_par_mois)
    return {"projection": revenus_par_mois, "total_annuel": round(total, 2)}

# Scénario : e-book à 29€, 10 ventes le mois 1, +15% par mois
resultat = projeter_revenus_passifs(
    prix_produit=29.0,
    ventes_mois_1=10,
    taux_croissance_mensuel=0.15
)

print(f"Total annuel estimé : {resultat['total_annuel']}€")
for mois in resultat['projection']:
    print(f"Mois {mois['mois']:2d} → {mois['ventes']:3d} ventes → {mois['revenu']:7.2f}€")
```
**language**: python
**explanation**: Ce calculateur modélise la croissance exponentielle des revenus passifs. Avec seulement 10 ventes au départ et une croissance de 15%/mois (raisonnable avec du contenu régulier), un produit à 29€ peut générer plus de 6000€ sur l'année. La puissance des intérêts composés appliquée aux produits numériques.

## Scène 8 — CONCEPT
> Duration: 240 frames

**heading**: Flux #5 & #6 — Affiliation & TikTok Shop
**body**: L'affiliation consiste à recommander des produits et toucher une commission (5-50%) sur chaque vente générée via votre lien unique. TikTok Shop pousse ce modèle plus loin : les créateurs peuvent vendre directement dans les vidéos sans gérer de stock. Démarrage possible avec zéro investissement initial.

## Scène 9 — CONCEPT
> Duration: 240 frames

**heading**: Flux #7 & #8 — SaaS Micro et Investissements
**body**: Un micro-SaaS (petit logiciel par abonnement) résout un problème précis pour une niche : revenus récurrents, scalabilité maximale. En parallèle, l'investissement passif (ETF, angel investing, crypto) fait travailler le capital accumulé. Sabrina Ramonov a combiné ces deux approches après avoir vendu sa startup 10M$+.

## Scène 10 — CODE
> Duration: 300 frames

```
# Tableau de bord multi-revenus : tracker toutes vos sources
from dataclasses import dataclass
from typing import Literal

SourceType = Literal["freelance", "contenu", "produit_num", 
                     "formation", "affiliation", "saas", "investissement"]

@dataclass
class SourceRevenu:
    nom: str
    type: SourceType
    revenu_mensuel: float
    heures_par_semaine: float
    est_passif: bool

    @property
    def taux_horaire(self) -> float:
        heures_mois = self.heures_par_semaine * 4.33
        if heures_mois == 0:
            return float('inf')  # 100% passif
        return round(self.revenu_mensuel / heures_mois, 2)

sources = [
    SourceRevenu("Consulting Dev",     "freelance",      1500, 8,   False),
    SourceRevenu("YouTube Tech",       "contenu",         400, 5,   False),
    SourceRevenu("E-book Python",      "produit_num",     250, 0.5, True),
    SourceRevenu("Cours Udemy",        "formation",       180, 1,   True),
    SourceRevenu("Affiliation Outils", "affiliation",     120, 0,   True),
    SourceRevenu("ETF & Dividendes",   "investissement",  200, 0,   True),
]

total = sum(s.revenu_mensuel for s in sources)
passif = sum(s.revenu_mensuel for s in sources if s.est_passif)

print(f"{'Source':<25} {'Type':<15} {'€/mois':>8} {'€/h':>8} {'Passif'}")
print("-" * 70)
for s in sorted(sources, key=lambda x: x.revenu_mensuel, reverse=True):
    th = f"{s.taux_horaire:.0f}" if s.taux_horaire != float('inf') else "∞"
    print(f"{s.nom:<25} {s.type:<15} {s.revenu_mensuel:>7.0f}€ {th:>7}/h  {'✅' if s.est_passif else '🔄'}")

print("-" * 70)
print(f"{'TOTAL':<25} {'':15} {total:>7.0f}€")
print(f"Dont revenus passifs : {passif:.0f}€/mois ({passif/total*100:.0f}%)")
```
**language**: python
**explanation**: Ce tracker visualise tous vos flux de revenus avec leur taux horaire effectif — la métrique clé pour prioriser où investir votre temps. Les revenus passifs (∞ €/h) doivent devenir une proportion croissante du total. L'objectif à terme : que les revenus passifs couvrent vos dépenses fixes.

## Scène 11 — TRANSITION
> Duration: 90 frames

**text**: Points Clés à Retenir
