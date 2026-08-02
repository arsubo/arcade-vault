# SPEC 06 — Tabla de juegos y leaderboard reales (Supabase)

> **Status:** Implementado
> **Depends on:** 04-supabase-integration, 05-asteroides
> **Date:** 2026-08-01
> **Objective:** Reemplazar el catálogo hardcodeado (`GAMES` en `lib/games.ts`) por una tabla `games` en Supabase que alimenta toda la app, y reemplazar el Salón de la Fama simulado por una tabla `scores` real que registra partidas de Asteroides (el único juego con motor real) enviadas de forma anónima con solo un nombre de jugador.

## Scope

**In:**

- Migración SQL (`mcp__supabase__apply_migration`) que crea las tablas `games` y `scores`, habilita RLS en ambas con policies de lectura pública, una policy de insert público en `scores`, y siembra los 9 juegos actuales (incluido `asteroides`) como filas iniciales de `games`, tomando los valores de `lib/games.ts`.
- `lib/supabase/queries.ts` con funciones server-side: `getGames()`, `getGameById(id)`, `getTopScores(gameId, limit)`, usando el cliente de `lib/supabase/server.ts`.
- `lib/games.ts` deja de exportar el array `GAMES`; conserva `Game`, `GameCategory`, `ScoreRow`, `PLAYERS` y `seededScores()`, que siguen usándose como fallback de leaderboard para los juegos sin motor real.
- Migración de `app/page.tsx`, `app/biblioteca/page.tsx`, `app/salon/page.tsx` y `app/games/[id]/jugar/page.tsx` a Server Components que hacen el fetch a Supabase y pasan los datos como props a nuevos componentes cliente (`components/HomeClient.tsx`, `components/BibliotecaClient.tsx`, `components/SalonClient.tsx`, `components/games/JugarClient.tsx`) que conservan toda la lógica interactiva existente (animaciones `useReveal`, búsqueda/filtros, tabs, HUD, pausa, registro de motores).
- `app/games/[id]/page.tsx` (ya es Server Component) reemplaza `GAMES.find` por `getGameById(id)`.
- En `/salon` y en la ficha de detalle, el tab/juego `"asteroides"` muestra puntajes reales desde `getTopScores("asteroides", …)`; cualquier otro juego sigue mostrando `seededScores()` exactamente como hoy.
- Server Action `app/games/[id]/jugar/actions.ts` (`submitScore(gameId, playerName, score)`): valida `gameId === "asteroides"`, `playerName` no vacío (máx. 20 caracteres) y `score` entero positivo, e inserta en `scores` con el cliente server de Supabase.
- En `JugarClient.tsx`, cuando el motor real dispara `onGameOver`, el modal "FIN DEL JUEGO" existente agrega un campo de nombre y un botón "GUARDAR PUNTAJE" que llama a `submitScore`. Para cualquier otro juego (sin motor real) el modal se mantiene exactamente igual a hoy.

**Out of scope (para specs futuros):**

- Recalcular `best`/`plays` en `games` a partir de `MAX(scores.score)` — quedan como columnas fijas.
- Puntajes reales para juegos que no sean `asteroides` — siguen con `seededScores()` como hoy.
- Autenticación real — los puntajes se guardan con un nombre libre, sin usuario ni sesión (`/auth` sigue siendo un formulario simulado).
- Editar, borrar o moderar puntajes ya enviados — no hay panel de administración.
- Rate limiting o antifraude más allá de la validación mínima de tipos/rangos en la Server Action.
- Ranking global entre todos los juegos — el leaderboard sigue organizado por juego, con tabs, igual que hoy.
- Cambios visuales o de props en `components/GameCard.tsx` / `components/MiniCard.tsx` — siguen recibiendo el mismo shape de `Game`.

## Data model

```sql
-- migración: tablas games y scores

create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan','magenta','yellow','green')),
  best integer not null default 0,
  plays text not null default '0',
  created_at timestamptz not null default now()
);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games(id),
  player_name text not null,
  score integer not null check (score > 0),
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on public.scores (game_id, score desc);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "Allow public read of games" on public.games for select using (true);
create policy "Allow public read of scores" on public.scores for select using (true);
create policy "Allow public insert of scores" on public.scores for insert with check (true);

insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('bloque-buster', 'BLOQUE BUSTER', '...', '...', 'ARCADE', 'cover-bricks', 'cyan', 28450, '12.4K'),
  ('caida', 'CAÍDA', '...', '...', 'PUZZLE', 'cover-tetro', 'magenta', 184220, '31.8K'),
  ('serpentina', 'SERPENTINA', '...', '...', 'ARCADE', 'cover-snake', 'green', 7820, '9.1K'),
  ('gloton', 'GLOTÓN', '...', '...', 'ARCADE', 'cover-glot', 'yellow', 96400, '27.2K'),
  ('invasores', 'INVASORES', '...', '...', 'SHOOTER', 'cover-invaders', 'green', 54190, '18.0K'),
  ('rocas', 'ROCAS', '...', '...', 'SHOOTER', 'cover-rocas', 'yellow', 41200, '15.6K'),
  ('ranaria', 'RANARIA', '...', '...', 'ARCADE', 'cover-rana', 'green', 18900, '6.4K'),
  ('duelo-pixel', 'DUELO PIXEL', '...', '...', 'VERSUS', 'cover-duelo', 'cyan', 24, '4.2K'),
  ('asteroides', 'ASTEROIDES', '...', '...', 'SHOOTER', 'cover-rocas', 'yellow', 67300, '2.1K');
  -- valores short/long completos: copiados literalmente de GAMES en lib/games.ts
```

```ts
// lib/supabase/queries.ts
import type { Game, ScoreRow } from "@/lib/games";

export async function getGames(): Promise<Game[]> {
  /* ... */
}
export async function getGameById(id: string): Promise<Game | null> {
  /* ... */
}
export async function getTopScores(
  gameId: string,
  limit: number
): Promise<ScoreRow[]> {
  /* ... */
}
```

```ts
// app/games/[id]/jugar/actions.ts
"use server";

export async function submitScore(
  gameId: string,
  playerName: string,
  score: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  /* ... */
}
```

`lib/games.ts` conserva `Game`, `GameCategory`, `ScoreRow`, `PLAYERS`, `seededScores()`; elimina el array `GAMES`.

## Implementation plan

1. Crear la migración SQL (`games`, `scores`, RLS + policies, seed de los 9 juegos actuales) vía `mcp__supabase__apply_migration`. El sistema sigue funcional: las tablas existen con datos, pero la app todavía lee del array hardcodeado.
2. Crear `lib/supabase/queries.ts` con `getGames()`, `getGameById(id)`, `getTopScores(gameId, limit)`. El sistema sigue funcional: las funciones existen, sin consumidores todavía.
3. Extraer el contenido interactivo de `app/page.tsx` a `components/HomeClient.tsx` (recibe `games: Game[]` como prop, incluyendo `useReveal()`), y convertir `app/page.tsx` en Server Component que llama `getGames()` y renderiza `HomeClient`. El sistema sigue funcional: Home ahora lee de Supabase; el resto de páginas sin cambios.
4. Mismo patrón para `/biblioteca`: extraer a `components/BibliotecaClient.tsx` (recibe `games` y conserva la búsqueda/filtro por categoría), `app/biblioteca/page.tsx` pasa a Server Component que llama `getGames()`. El sistema sigue funcional.
5. Actualizar `app/games/[id]/page.tsx`: reemplazar `GAMES.find` por `getGameById(id)`; si `id === "asteroides"` usar `getTopScores("asteroides", 10)`, si no `seededScores()` como hoy. El sistema sigue funcional.
6. Mismo patrón para `/games/[id]/jugar`: extraer a `components/games/JugarClient.tsx` (recibe `game: Game` como prop, conserva HUD, pausa, `GAME_REGISTRY`), `app/games/[id]/jugar/page.tsx` pasa a Server Component que llama `getGameById(id)` y dispara `notFound()` si no existe. El sistema sigue funcional: el juego real sigue corriendo igual, ahora con datos de Supabase.
7. Mismo patrón para `/salon`: extraer a `components/SalonClient.tsx` (recibe `games: Game[]` y `asteroidesScores: ScoreRow[]` como props, conserva los tabs), `app/salon/page.tsx` pasa a Server Component que llama `getGames()` + `getTopScores("asteroides", 12)`. El tab `"asteroides"` usa las filas reales; cualquier otro tab sigue llamando `seededScores()` exactamente como hoy. El sistema sigue funcional.
8. Eliminar el array `GAMES` de `lib/games.ts` (ya no queda ningún importador). El sistema sigue funcional: `npm run build` sigue pasando.
9. Crear `app/games/[id]/jugar/actions.ts` con la Server Action `submitScore(gameId, playerName, score)` (validación + insert en `scores`). El sistema sigue funcional: la acción existe, sin consumidor todavía.
10. En `JugarClient.tsx`, cuando `GAME_REGISTRY[id]` existe (motor real) y se dispara `onGameOver`, agregar al modal "FIN DEL JUEGO" un campo de nombre y un botón "GUARDAR PUNTAJE" que llama `submitScore`; para cualquier otro `id` el modal se mantiene igual a hoy. Último paso ejecutable del spec: se puede jugar Asteroides de punta a punta, guardar el puntaje real y verlo reflejado en `/salon` y en `/games/asteroides` tras recargar.
11. Pasada de QA: `npm run build`; jugar una partida real de Asteroides y guardar un puntaje con nombre; confirmar que aparece en `/salon` (tab "ASTEROIDES") y en `/games/asteroides` (detalle) tras recargar; confirmar que los otros 8 juegos siguen mostrando exactamente el mismo catálogo y leaderboards simulados que antes (sin regresión visual); confirmar con `mcp__supabase__get_advisors` que no hay alertas de seguridad nuevas por las tablas/policies agregadas.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni ESLint.
- [ ] Existen las tablas `games` y `scores` en el schema `public` de Supabase, con RLS habilitado, policies de lectura pública en ambas y de insert público en `scores`.
- [ ] La tabla `games` contiene los 9 juegos actuales (incluido `asteroides`) tras la migración.
- [ ] `lib/games.ts` ya no exporta `GAMES`; sigue exportando `Game`, `GameCategory`, `ScoreRow`, `PLAYERS` y `seededScores()`.
- [ ] Home (`/`), `/biblioteca`, `/salon`, `/games/[id]` y `/games/[id]/jugar` obtienen el catálogo desde Supabase, sin cambios visuales respecto al catálogo actual.
- [ ] `/salon`, tab "ASTEROIDES", muestra puntajes reales desde `scores` (vacío si aún no hay ninguno); cualquier otro tab sigue mostrando `seededScores()` exactamente como hoy.
- [ ] `/games/asteroides` (detalle), panel "MEJORES PUNTUACIONES", muestra puntajes reales desde `scores`; la ficha de cualquier otro juego sigue usando `seededScores()` como hoy.
- [ ] Al terminar una partida real de Asteroides, el modal "FIN DEL JUEGO" permite ingresar un nombre y guardar el puntaje real vía `submitScore`.
- [ ] Un puntaje guardado en una partida de Asteroides aparece en `/salon` y en `/games/asteroides` después de recargar la página.
- [ ] `submitScore` rechaza nombres vacíos y puntajes no positivos sin lanzar una excepción no controlada.
- [ ] El modal "FIN DEL JUEGO" para cualquier otro juego (sin motor real) no muestra el campo de nombre ni el botón "GUARDAR PUNTAJE", igual que hoy.
- [ ] `mcp__supabase__get_advisors` no reporta alertas nuevas de seguridad asociadas a `games`/`scores` tras la migración.

## Decisions

- **Sí:** un solo spec combinado (tabla de juegos + leaderboard) en vez de dos specs separados — decisión explícita del usuario, aunque tocan dominios distintos.
- **Sí:** "tabla de juegos" significa una tabla `games` real en Supabase que reemplaza el array `GAMES` de `lib/games.ts`, no una vista de tabla en la UI.
- **Sí:** el leaderboard reemplaza los datos de `/salon`, que hoy usa `seededScores()` hardcodeado.
- **Sí:** puntajes anónimos con nombre libre, sin autenticación real — `/auth` sigue siendo un formulario simulado, fuera de alcance de este spec.
- **Sí:** `best`/`plays` en `games` quedan como columnas fijas, no se recalculan desde `scores` en este spec.
- **Sí:** solo `"asteroides"` (el único juego con motor real, spec 05) puede enviar puntajes reales; el resto de los 8 juegos sigue con `seededScores()` como fallback visual, tanto en `/salon` como en la ficha de detalle.
- **Sí:** el puntaje se guarda desde el propio modal "FIN DEL JUEGO" (agregando un campo de nombre), en vez de un flujo separado en `/salon`.
- **Sí:** el leaderboard se mantiene organizado por juego (tabs), no se convierte en un ranking global.
- **Sí:** las páginas migran a Server Components que hacen el fetch a Supabase y pasan los datos como props a componentes cliente nuevos (`HomeClient`, `BibliotecaClient`, `SalonClient`, `JugarClient`) que conservan toda la lógica interactiva existente.
- **Sí:** el insert de un puntaje pasa por una Server Action (`submitScore`) que valida mínimamente antes de escribir en Supabase, en vez de un insert directo desde el cliente sin ninguna validación intermedia.
- **Sí:** la migración que crea `games` siembra los 9 juegos actuales (incluido `asteroides`) en el mismo paso, para que el catálogo no desaparezca de la app tras el deploy de este spec.
- **No:** recalcular `best` desde `MAX(scores.score)` — fuera de alcance, columna fija por ahora.
- **No:** rate limiting, moderación o eliminación de puntajes — fuera de alcance.
- **No:** ranking global entre juegos — fuera de alcance.
- **Definición rápida en las secciones finales** (Data model en adelante), sin ronda de confirmación sección por sección — a pedido explícito del usuario ("termina el documento y graba el spec").

## Identified risks

- **Policy de insert abierta en `scores` (`with check (true)`):** cualquiera con la publishable key puede insertar puntajes arbitrarios llamando directamente a la API de Supabase, sin pasar por la Server Action ni por una partida real. Riesgo aceptado explícitamente al elegir puntajes anónimos sin autenticación; mitigado parcialmente por la validación mínima de `submitScore` para el flujo normal de la UI, pero no impide un insert directo fuera de la app.
- **Refactor de 5 páginas a Server Component + Client Component:** riesgo de romper estado o comportamiento existente (`useReveal()` en Home, filtros en `/biblioteca`, tabs en `/salon`, HUD/pausa en `/jugar`) al mover la lógica a los nuevos componentes cliente. Mitigado por la pasada de QA del paso 11.
- **Inconsistencia entre `games.best` (columna fija) y el puntaje máximo real en `scores` para "asteroides":** una vez que se guarden puntajes reales que superen el `best` sembrado (67300), la ficha de detalle mostrará un "mejor global" desactualizado. Riesgo aceptado por decisión explícita de no recalcular `best` en este spec.
