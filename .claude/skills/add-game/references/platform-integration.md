# Puntos de integración con la plataforma

Referencia de detalle para `/add-game`, Fase 3 y Fase 4. Cada afirmación aquí está verificada contra el código real del repo en la fecha en que se escribió esta skill — si alguna ruta o rango de líneas ya no coincide, confía en el archivo real, no en este documento, y considera actualizarlo.

## El refactor del allowlist

Hoy solo existe `"asteroides"` como juego con motor real, y su id está escrito a mano en 4 archivos. `lib/real-games.ts` generaliza eso a un allowlist único:

```ts
// lib/real-games.ts
export const REAL_GAME_IDS = ["asteroides"] as const;

export function isRealGame(id: string): boolean {
  return (REAL_GAME_IDS as readonly string[]).includes(id);
}
```

Vive en `lib/`, no en `components/games/registry.tsx`, a propósito: `registry.tsx` importa componentes cliente (`AsteroidsGame` y los que sigan), y `isRealGame` se necesita desde una Server Action (`actions.ts`) y desde Server Components (`app/games/[id]/page.tsx`, `app/salon/page.tsx`). Mezclar ambos forzaría a esos módulos server-only a arrastrar código cliente.

Los 4 sitios de hoy, con su reemplazo:

| Archivo                                      | Hoy                                                                                                                                                                                 | Objetivo                                                                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/games/[id]/jugar/actions.ts` (línea 10) | `if (gameId !== "asteroides") { return { ok: false, error: "..." }; }`                                                                                                              | `if (!isRealGame(gameId)) { return { ok: false, error: "..." }; }`                                                                                           |
| `app/games/[id]/page.tsx` (líneas 11-14)     | `const scores = id === "asteroides" ? await getTopScores("asteroides", 10) : seededScores(id.length * 17 + 3, 10);`                                                                 | `const scores = isRealGame(id) ? await getTopScores(id, 10) : seededScores(id.length * 17 + 3, 10);`                                                         |
| `app/salon/page.tsx` (líneas 4-8)            | `const [games, asteroidesScores] = await Promise.all([getGames(), getTopScores("asteroides", 12)]);` seguido de `<SalonClient games={games} asteroidesScores={asteroidesScores} />` | `Promise.all` sobre `REAL_GAME_IDS.map(id => getTopScores(id, 12))`, combinado con los ids en un `Record<string, ScoreRow[]>`, pasado como prop `realScores` |
| `components/SalonClient.tsx` (líneas 8-22)   | prop `asteroidesScores: ScoreRow[]`; `tab === "asteroides" ? asteroidesScores : seededScores(...)`                                                                                  | prop `realScores: Record<string, ScoreRow[]>`; `realScores[tab] ?? seededScores(tab.length * 23 + 7, 12)`                                                    |

Después de este refactor, sumar un juego real más es **una sola línea**: agregar su id a `REAL_GAME_IDS`. Ningún otro sitio necesita tocarse.

Si `lib/real-games.ts` ya existe cuando corre esta skill (porque un spec anterior ya lo creó), el spec generado **no** repite este refactor — solo agrega el id nuevo al array existente.

## El contrato del motor (`GameEngineProps`)

Definido en `components/games/registry.tsx`, no se modifica al agregar un juego:

```tsx
export interface GameEngineProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export const GAME_REGISTRY: Record<string, ComponentType<GameEngineProps>> = {
  asteroides: AsteroidsGame,
  // <slug>: <Nombre>Game,
};
```

Si el juego nuevo no tiene "vidas" (p. ej. Tetris) o no tiene "niveles" en el sentido de asteroides, el motor igual debe llamar a `onLivesChange`/`onLevelChange` con algún valor coherente (constante, o una métrica análoga como líneas eliminadas) — el contrato no cambia por juego. Qué valor mandar ahí es una decisión de Fase 3, nunca una suposición.

## El contrato del canvas dentro de `.crt-screen`

`app/globals.css` define `.crt-screen` (sección "player", ~línea 623) como `position: relative; aspect-ratio: 4 / 3; background: #000; border-radius: 12px / 28px; overflow: hidden;` más scanlines y viñeta vía pseudo-elementos. El canvas del motor debe:

- Usar una resolución interna 4:3 si es posible (800×600 en asteroides) para que el escalado CSS no distorsione.
- Renderizar con `style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}` para llenar `.crt-screen` sin más CSS.

Si el juego de origen no es 4:3 (Tetris es 300×600 = 1:2), forzar el estiramiento lo distorsiona. Este es exactamente el punto que la Fase 3 de la skill pregunta explícitamente — no asumas letterboxing ni estiramiento sin confirmarlo.

## La plantilla del wrapper de React

`components/games/asteroids/AsteroidsGame.tsx` es la plantilla a copiar para cualquier motor nuevo:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { createAsteroidsEngine, type AsteroidsEngineHandle } from "./engine";

interface AsteroidsGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export default function AsteroidsGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: AsteroidsGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngineHandle | null>(null);
  const callbacksRef = useRef({
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
  });

  useEffect(() => {
    callbacksRef.current = {
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
    };
  }, [onScoreChange, onLivesChange, onLevelChange, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createAsteroidsEngine(canvas, {
      onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
      onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
      onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
```

El detalle que importa: `callbacksRef` existe porque el `useEffect` que crea el motor tiene deps `[]` — el motor se instancia **una sola vez** por montaje, y el ref mantiene los callbacks siempre frescos sin forzar una recreación. Copiar este patrón literal para el juego nuevo, cambiando solo el import de la factory, el tipo del handle, y `width`/`height` si la resolución interna es distinta.

## Cómo `JugarClient.tsx` consume el registro

`components/games/JugarClient.tsx` decide con `const isRegistered = Boolean(GAME_REGISTRY[game.id])` si renderiza el motor real o la simulación falsa (`.game-arena`). No hace falta tocar este archivo al agregar un juego — ya es genérico por diseño (spec 05). Dos detalles a tener presentes si el spec generado necesita explicarlos:

- `key={gameKey}` sobre el componente del motor fuerza un remontaje completo (nuevo `useEffect` de creación) cada vez que `restart()` incrementa `gameKey` — así "JUGAR DE NUEVO" siempre arranca una partida limpia del motor, no solo del estado de React.
- El modal "FIN DEL JUEGO" ya tiene el campo de nombre y el botón "GUARDAR PUNTAJE" condicionados a `isRegistered`, que a su vez depende únicamente de que el id esté en `GAME_REGISTRY`. No hace falta ninguna edición aquí — solo registrar el motor nuevo en `registry.tsx` ya activa el flujo de guardado en la UI. El allowlist de `lib/real-games.ts` es lo que decide, del lado del servidor, si `submitScore` acepta o rechaza ese id.

## Convención de las clases `.cover-*`

`app/globals.css`, sección `/* ===== Cover art generators (pure CSS) ===== */` (líneas ~396-511). Todas usan una base común:

```css
.cover-bg {
  position: absolute;
  inset: 0;
}
```

y luego una clase específica (`.cover-rocas`, `.cover-tetro`, `.cover-snake`, …) que define un `background` con gradiente sobre el elemento, más capas `::after`/`::before` de `radial-gradient`/`linear-gradient`/`repeating-linear-gradient` y `filter: drop-shadow(...)` para el brillo neón, usando las variables `--cyan --magenta --yellow --green --ink`. Nunca son imágenes — todo es CSS puro. El tamaño típico es 8-18 líneas.

El nombre de la clase **no** es el id del juego (`caida` usa `.cover-tetro`; `rocas` y `asteroides` comparten `.cover-rocas`). Al confirmar la cover en Fase 3, deja explícito si se reusa una existente (dar la razón temática, como hizo asteroides con rocas) o si se crea una nueva — y en ese caso, en qué elementos visuales se inspira.

Se usa siempre igual en el consumidor: `<div className={"cover-bg " + game.cover}></div>` (en `components/GameCard.tsx`, `components/MiniCard.tsx`, y `app/games/[id]/page.tsx`) — ninguno de esos tres archivos necesita cambios al agregar un juego, siempre que `game.cover` en la fila de Supabase apunte a una clase que exista en `globals.css`.

## La migración de `games`

Mismo shape que el spec 06, con los `check` de columnas que Postgres ya exige:

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('<slug>', '<TÍTULO>', '<short>', '<long>', '<CAT>', 'cover-<slug-o-reusada>', '<color>', <best>, '<plays>');
```

`cat` debe ser uno de `ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`; `color` uno de `cyan`/`magenta`/`yellow`/`green`. No hace falta tocar el esquema de `scores` — `game_id` ya es una FK genérica a `games(id)`, así que el juego nuevo hereda la tabla de puntajes sin cambios.

## Lo que nunca cambia al agregar un juego

Estos archivos no requieren ninguna edición en un spec de este tipo — si el spec generado propone tocarlos, es una señal de que algo se está sobre-alcanzando:

- `components/GameCard.tsx`, `components/MiniCard.tsx` — reciben el mismo shape `Game` sin importar cuántas filas tenga `games`.
- `components/HomeClient.tsx`, `components/BibliotecaClient.tsx` — iteran sobre `getGames()` genéricamente.
- `lib/games.ts` — solo tipos, `CATS`, `PLAYERS`, `seededScores()`; no conoce ids de juegos.
- `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/queries.ts` — genéricos por `gameId`, ya funcionan para cualquier id nuevo.
- El CSS del modal "FIN DEL JUEGO" (`.modal-bd`, `.modal`, `.input-row`, `.toast-saved`, etc., en `app/globals.css`) — ya cubre el flujo de guardado completo.
