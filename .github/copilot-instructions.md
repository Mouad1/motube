# Copilot Instructions — motube

## Communication Style (Caveman Mode)

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged. Errors quoted exact.
- Pattern: `[thing] [action] [reason]. [next step].`
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Switch level: `/caveman lite|full|ultra` — default is **full**.
Stop: "stop caveman" or "normal mode"

Auto-Clarity: revert to normal for security warnings, irreversible actions, user confusion. Resume after.

---

## Persistent Memory (claude-mem)

When user asks about previous sessions ("did we solve this before?", "how did we do X last time?"):

Use the `mcp-search` MCP tools in this order to save tokens:

1. `search(query="...", project="motube")` — get compact index with IDs (~50-100 tokens/result)
2. `timeline(anchor=<id>, depth_before=3, depth_after=3)` — get chronological context
3. `get_observations(ids=[...])` — fetch full details ONLY for relevant IDs

**Never fetch full details without filtering first (10x token savings).**

---

## Project: motube (Instructify)

Automated YouTube faceless video platform. Key constraints:
- Stack: Remotion 4.x, Next.js 16.2, SQLite (better-sqlite3), BullMQ, Claude API, ElevenLabs
- **No `asChild` on `<Button>`** — uses @base-ui/react (not Radix)
- **No direct import of `pipeline/` in Next.js routes** — use child processes via `spawn`
- `serverExternalPackages: ["better-sqlite3"]` required in next.config.ts
- **No `bullmq`/`ioredis` imports in Next.js routes** (Turbopack crash)
- Env vars in `.env.local`, never hardcoded
- Episode status flow: `draft → scripted → translated → tts_done → rendered → published | failed`
