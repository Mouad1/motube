# Lessons — Instructify / motube

Patterns d'erreurs rencontrés et règles pour les éviter.

---

## shadcn/ui (@base-ui/react) — pas de `asChild`

**Règle :** Ne jamais utiliser `asChild` sur `<Button>`.
**Pourquoi :** @base-ui/react ne supporte pas cette prop (contrairement à Radix).
**Correction :** Remplacer `<Button asChild><Link>` par `<Link className="btn-classes">` stylé directement.

---

## BullMQ/IORedis interdit dans Next.js routes API

**Règle :** Ne jamais importer `bullmq` ou `ioredis` dans `dashboard/app/api/`.
**Pourquoi :** Turbopack crash sur les imports cross-app vers `pipeline/`.
**Correction :** Utiliser `spawn("npx", ["tsx", "pipeline/xxx.ts", ...], { cwd: rootDir, detached: true, stdio: "ignore" })`.

---

## Import pipeline/ interdit via dynamic import dans dashboard/

**Règle :** Aucun `import()` dynamique de `pipeline/` depuis `dashboard/app/api/`.
**Pourquoi :** Turbopack rejette les chemins relatifs hors du répertoire `dashboard/`.
**Correction :** Toujours spawner un child process détaché.

---

## Zod `.default({})` avec champs requis

**Règle :** Ne pas passer `{}` comme default à un `z.object()` ayant des champs requis.
**Pourquoi :** `{}` ne satisfait pas le type inféré → erreur runtime.
**Correction :** Passer les valeurs explicites : `.default({ tags: [], privacyStatus: "private" })`.

---

## Import `getDb` vs `db`

**Règle :** Toujours importer `getDb` séparément : `import { db, getDb } from "./lib/db"`.
**Pourquoi :** `db` exporte des helpers nommés, pas `db.getDb()`.
**Comment :** Applicable dans tous les fichiers `pipeline/` qui utilisent SQLite.
