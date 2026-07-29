# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault ("arcade-vault") — a platform for playing games online and competing for points. The codebase is currently the unmodified `create-next-app` scaffold (App Router, TypeScript, Tailwind v4); no game/vault features have been built yet.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)

There is no test runner configured yet.

## Stack notes

- Next.js `16.2.12`, React `19.2.4` — **not the Next.js version in your training data.** Per `AGENTS.md`, consult `node_modules/next/dist/docs/` (mirrors nextjs.org/docs: `01-app`, `02-pages`, `03-architecture`, `04-community`) before relying on remembered APIs/conventions, and watch for deprecation notices.
- App Router only, under `app/`.
- Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config.*` — v4 is configured through CSS in `app/globals.css`).
- Path alias `@/*` maps to the repo root (`tsconfig.json`).

## Workflow: Spec Driven Design

Per `README.md`, this project follows a spec-driven workflow using the `/spec` and `/spec-impl` commands from the [fernando-skills](https://github.com/Klerith/fernando-skills) skill pack (installed via `npx skills@latest add Klerith/fernando-skills`). These skills are not yet installed in this repo — if `/spec` or `/spec-impl` are unavailable, that's why.
