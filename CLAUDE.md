# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault ("arcade-vault") — a platform for playing games online and competing for points. Past the initial `create-next-app` scaffold: there's a working game catalog with 4 real, playable games backed by Supabase leaderboards, a contact form wired to Resend, and a placeholder auth screen (`app/auth/page.tsx` — UI only, not yet wired to Supabase Auth).

### Routes (`app/`)

- `/` — home (`HomeClient`), `/biblioteca` — full catalog (`BibliotecaClient`), both fed by `getGames()`.
- `/games/[id]` — game detail + leaderboard (real scores via `getTopScores` for real games, `seededScores` fake data otherwise).
- `/games/[id]/jugar` — the game player (`JugarClient` → engine from `components/games/registry.tsx`).
- `/salon` — hall of fame, top 12 real scores per real game.
- `/acerca-de` — about/contact page, submits through `sendContactMessage` (Resend) in `app/acerca-de/actions.ts`.
- `/auth` — sign in/up UI mockup, no backend wiring yet.

### Games

- Engines live in `components/games/<slug>/` like (`asteroids`, `tetris`, `arkanoid`, `snake` and more... see `references\implemented-games.md` when you need to check wich games are implemented and how to implemented new ones).
- Each implementing the `GameEngineProps` contract (`paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) and registered in `components/games/registry.tsx`.
- `lib/real-games.ts` (`REAL_GAME_IDS`, `isRealGame`) is the allowlist of games with real Supabase-backed scores/leaderboards; everything else in the `games` table falls back to fake seeded scores.
- `references/started-games/` holds the original standalone `game.js`/`index.html` sources games were ported from; `references/source-assets/` holds raw sprite/asset sources (e.g. Snake's sprite atlas) not yet moved into `public/`.
- New games are added via the spec workflow below, using the `/add-game` skill to generate the spec.

## Skills

- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.
- Usa `/add-game` para generar el spec de un juego nuevo (portado desde `references/started-games/` o diseñado desde cero) antes de correr `/spec-impl`. Ver `.claude/skills/add-game/SKILL.md`.
- `/spec` y `/spec-impl` (de [fernando-skills](https://github.com/Klerith/fernando-skills)) están instalados — ver "Workflow" abajo.

## Stack notes

- Next.js `16.2.12`, React `19.2.4` — **not the Next.js version in your training data.** Per `AGENTS.md`, consult `node_modules/next/dist/docs/` (mirrors nextjs.org/docs: `01-app`, `02-pages`, `03-architecture`, `04-community`) before relying on remembered APIs/conventions, and watch for deprecation notices.
- App Router only, under `app/`.
- Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config.*` — v4 is configured through CSS in `app/globals.css`).
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) is the backend — `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server components/actions) create clients; `lib/supabase/queries.ts` has the `games`/`scores` table queries. MCP server `supabase` is configured in `.mcp.json` for direct DB/migration access from Claude Code.
- Resend (`resend`) sends the contact form email server-side from `app/acerca-de/actions.ts`.
- Required env vars (`.env.template`): `RESEND_API_KEY`, `SUPABASE_DB_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- A `PostToolUse` hook (`.claude/hooks/format-and-lint.mjs`, in `.claude/settings.json`) runs Prettier + ESLint automatically after every `Write`/`Edit`.

## Workflow: Spec Driven Design

This project follows a spec-driven workflow using the `/spec` and `/spec-impl` skills from [fernando-skills](https://github.com/Klerith/fernando-skills) (tracked in `skills-lock.json`, installed under `.claude/skills/` and `.agents/skills/`). `specs/.spec-config.yml` controls whether `/spec-impl` auto-creates the `spec-NN-slug` branch (`AutoCreateBranch: true` today).

- Specs live in `specs/NN-<slug>.md`, numbered sequentially, each with a `Status` (`Draft` → `Aprobado` → `Implementado`).
- For a new game specifically, run `/add-game` first to produce the spec (it covers the `games` row, engine registry, real-games allowlist, and leaderboard wiring), then `/spec-impl NN-<slug>` to implement it.
- Current specs: 01–08 are `Implementado` (visual MVP, home, about/contact, Supabase integration, Asteroides, games leaderboard, Tetris, Arkanoid); 09-snake is `Aprobado` (approved, implemented on `main` already per recent commits — check `Status` in the file before assuming it's still pending).
