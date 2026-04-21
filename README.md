# VolleyIQ — Volleyball Analytics Platform

Plataforma moderna de estatística e analytics de voleibol: scouting ao vivo,
dashboard avançado, detecção de padrões por IA e relatórios táticos.
Pensada como alternativa moderna ao DataVolley, disponível como PWA em
desktop, tablet e telemóvel.

## Stack

- **Frontend** — React 18 + TypeScript, Vite, Tailwind + shadcn/ui,
  Recharts, Framer Motion, Wouter, TanStack Query.
- **Backend** — Node.js + Express, SQLite via Drizzle ORM, Zod.
- **Auth** — Firebase Auth (email/password + Google).
- **IA** — Anthropic Claude para detecção de padrões e recomendações.

## Começar

```bash
cp .env.example .env          # defaults correm sem Firebase e com AI mockada
npm install
npm run db:push               # cria o ficheiro SQLite e aplica o schema
npm run db:seed               # (opcional) popula com uma equipa demo
npm run dev                   # server:3000 + client:5173
```

Abre `http://localhost:5173`.

## Estrutura

```
client/   Frontend React (Vite)
server/   API Express (rotas, storage Drizzle, adaptadores IA)
shared/   Schema Drizzle + Zod + tipos partilhados client/server
```

## Scripts

| Comando | Efeito |
|--|--|
| `npm run dev` | Server + client em paralelo (hot reload) |
| `npm run build` | Build do client e transpile do server |
| `npm run typecheck` | TS strict em client e server |
| `npm run db:push` | Aplica o schema Drizzle ao SQLite |
| `npm run db:seed` | Popula dados demo |

## Roadmap

Fase 1 (este commit) — fundação, auth, layout, schema, Dashboard mock.
Fase 2 — CRUD de equipas/jogadores/jogos.
Fase 3 — Live Scout + agregação real de stats.
Fase 4 — IA (patterns, scenario, training), PostMatch, ScoutingReport.
