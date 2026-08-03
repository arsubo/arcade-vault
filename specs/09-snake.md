# SPEC 09 — Juego Snake (motor real embebido)

> **Status:** Draft
> **Depends on:** 05-asteroides, 06-games-leaderboard, 07-tetris, 08-arkanoid
> **Date:** 2026-08-03
> **Objective:** Agregar "SNAKE" como nuevo juego jugable del catálogo, implementando desde cero (sin código de origen) un motor de snake clásico en grilla 20×20 con wrap-around, usando el spritesheet real de frutas (`references/source-assets/snake-assets`), con HUD 100% externo de React y puntajes reales en Supabase.

## Scope

**In:**

- Fila nueva `"snake"` en `games` (migración SQL vía `mcp__supabase__apply_migration`): `title: "SNAKE"`, `cat: "ARCADE"`, `color: "green"`, `cover: "cover-snake"` (clase existente, reusada), `best: 9400`, `plays: "6.3K"`, `short: "Guía a la serpiente por la grilla y devora frutas antes de morderte la cola."`, `long: "Motor real de snake clásico: controla la serpiente con las flechas sobre una grilla de 20×20 celdas, atraviesa los bordes del tablero sin morir (wrap-around), devora frutas reales del spritesheet de Google Snake para crecer y sumar puntos, sube de nivel cada 50 puntos con velocidad creciente, y evita morderte tu propia cola las tres vidas disponibles."`. La entrada `"serpentina"` existente **no se modifica**.
- Reutilización de `.cover-snake` (ya existe en `app/globals.css`, usada hoy por `"serpentina"`) — sin clase CSS nueva.
- Assets movidos desde `references/source-assets/snake-assets/`: `fruits.png` a `public/games/snake/fruits.png`; `sprites.js` portado a `components/games/snake/sprites.ts` como módulo ES tipado (`FRUITS`, `FRUIT_KEYS`, `FRUITS_SRC`), sin depender de `window.SPRITE_ATLAS`.
- Motor implementado desde cero en `components/games/snake/engine.ts`: grilla de 20×20 celdas de 30px (canvas interno 600×600), serpiente de longitud inicial 3 controlada con las 4 flechas (sin permitir giro de 180° instantáneo sobre sí misma), movimiento por tick (no por frame de `requestAnimationFrame` directo — el loop acumula tiempo hasta alcanzar el intervalo del tick vigente), wrap-around en los 4 bordes del tablero (sale por un lado, reaparece por el opuesto), una fruta a la vez en una celda libre aleatoria con sprite aleatorio entre las 21 de `FRUIT_KEYS`, cada fruta comida suma 10 puntos y hace crecer la serpiente un segmento, sistema de 3 vidas donde chocar contra la propia cola resta una vida y reinicia la serpiente a longitud 3 en el centro del tablero **sin perder puntaje ni nivel**, nivel sube +1 cada 50 puntos y el tick baja 10ms por nivel (inicial 150ms, mínimo 60ms), fin de partida al perder la tercera vida.
- El motor **no dibuja HUD dentro del canvas**: solo tablero, serpiente y fruta. Score, vidas y nivel viven exclusivamente en el HUD externo de React (mismo criterio que Tetris).
- `onLivesChange` mapea directo a las vidas restantes (3→0). `onLevelChange` mapea directo al nivel explícito (1→∞, sin techo). `onScoreChange` mapea directo al puntaje acumulado. `onGameOver` se dispara una sola vez, al perder la tercera vida, con el `score` real acumulado.
- Nuevo componente cliente `components/games/snake/SnakeGame.tsx`: canvas 600×600 (proporción 1:1) con letterboxing centrado dentro de `.crt-screen` (mismo criterio que `TetrisGame.tsx`, que tampoco es 4:3), siguiendo el patrón de `AsteroidsGame.tsx` (`callbacksRef`, `useEffect` de creación con cleanup que llama `destroy()`, `useEffect` que sincroniza `paused`).
- Registro `snake: SnakeGame` en `components/games/registry.tsx`.
- `lib/real-games.ts` ya existe; este spec agrega `"snake"` a `REAL_GAME_IDS`, sin cambiar su forma.
- Controles: `↑`/`↓`/`←`/`→` para cambiar de dirección.

**Out of scope (para specs futuros):**

- `revalidatePath` en `submitScore` — ya implementado de forma genérica desde el spec 08 (`revalidatePath("/salon")` y `revalidatePath(\`/games/${gameId}\`)`sobre un`gameId`dinámico); cubre`"snake"` automáticamente, sin cambios en este spec.
- El guard de `rows[1]`/`rows[2]` en `SalonClient.tsx` para podios con menos de 3 puntajes — ya arreglado en el spec 07; cubre `"snake"` automáticamente, sin cambios en este spec.
- Recalcular `best`/`plays` en `games` a partir de `MAX(scores.score)`.
- Autenticación real, moderación de puntajes o rate limiting más allá de la validación mínima ya existente en `submitScore`.
- Motores reales para los demás juegos del catálogo (`bloque-buster`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`, `caida`) — siguen con la simulación falsa vía el fallback del registro.
- Cualquier cambio a la entrada `"serpentina"`, a su simulación falsa, o a la clase `.cover-snake` que ambas comparten.
- Valor de puntaje distinto por tipo de fruta — las 21 frutas del atlas valen lo mismo (10 pts), se eligen al azar solo por variedad visual.
- Power-ups, obstáculos, múltiples frutas simultáneas, o cualquier mecánica que no sea el snake clásico de grilla con wrap-around.
- Sonido — no hay assets de audio en `snake-assets/`, el motor no reproduce nada.

## Data model

```sql
-- migración: fila nueva en public.games
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('snake', 'SNAKE',
   'Guía a la serpiente por la grilla y devora frutas antes de morderte la cola.',
   'Motor real de snake clásico: controla la serpiente con las flechas sobre una grilla de 20×20 celdas, atraviesa los bordes del tablero sin morir (wrap-around), devora frutas reales del spritesheet de Google Snake para crecer y sumar puntos, sube de nivel cada 50 puntos con velocidad creciente, y evita morderte tu propia cola las tres vidas disponibles.',
   'ARCADE', 'cover-snake', 'green', 9400, '6.3K');
```

```ts
// lib/real-games.ts (ya existe; este spec agrega la línea de snake)
export const REAL_GAME_IDS = [
  "asteroides",
  "tetris",
  "arkanoid",
  "snake",
] as const;
```

```ts
// components/games/snake/sprites.ts
export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const FRUITS_SRC = "/games/snake/fruits.png";
export const FRUITS: Record<string, SpriteRect>; // 21 entradas: banana, orange, grape, garlic, eggplant,
// strawberry, cherry, carrot, mushroom, broccoli, watermelon, pepper, kiwi, lemon, peach, peanut,
// apple, tomato, berries, grapes2, pineapple, melon — mismas coordenadas que snake-assets/sprites.js
export const FRUIT_KEYS: string[]; // Object.keys(FRUITS)
```

```ts
// components/games/snake/engine.ts
export interface SnakeCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface SnakeEngineHandle {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

export function createSnakeEngine(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks
): SnakeEngineHandle {
  /* ... */
}
```

```tsx
// components/games/registry.tsx (se agrega una entrada, sin modificar la interfaz existente)
export const GAME_REGISTRY: Record<string, ComponentType<GameEngineProps>> = {
  asteroides: AsteroidsGame,
  tetris: TetrisGame,
  arkanoid: ArkanoidGame,
  snake: SnakeGame,
};
```

El contrato `GameEngineProps` (`paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) definido en `components/games/registry.tsx` no cambia.

## Implementation plan

1. Migración SQL que inserta la fila `"snake"` en `games`, vía `mcp__supabase__apply_migration`. El sistema sigue funcional: snake aparece en Home/biblioteca con la simulación falsa, como cualquier juego sin motor registrado.
2. Mover `fruits.png` a `public/games/snake/fruits.png`; portar `sprites.js` a `components/games/snake/sprites.ts` exportando `FRUITS_SRC`, `FRUITS` y `FRUIT_KEYS` tipados, con las mismas coordenadas de recorte del original. El sistema sigue funcional, sin consumidores todavía.
3. Implementar `components/games/snake/engine.ts` con `createSnakeEngine(canvas, callbacks)`: grilla 20×20 de 30px, estado de la serpiente (array de segmentos, dirección actual y dirección en cola para evitar giro de 180° instantáneo), loop con acumulador de tiempo que avanza un paso de grilla cada vez que se cumple el tick vigente (150ms inicial, −10ms por nivel, mínimo 60ms), fruta única en celda libre aleatoria con sprite aleatorio de `FRUIT_KEYS`, wrap-around en los 4 bordes, colisión contra la propia cola (resta una vida, reinicia serpiente a longitud 3 en el centro conservando score/nivel), `onScoreChange` en cada fruta comida (+10), `onLevelChange` cada 50 puntos, `onGameOver` al perder la tercera vida, listeners de teclado sobre `document` con `preventDefault` en las 4 flechas, patrón de pausa por flag y `destroy()` que cancela el rAF y remueve los listeners (receta de `engine-porting.md`). El sistema sigue funcional: el módulo existe, sin consumidores todavía.
4. Crear `components/games/snake/SnakeGame.tsx`: canvas 600×600 con letterboxing centrado dentro de `.crt-screen` (mismo criterio que `TetrisGame.tsx`), instancia el motor en un `useEffect` con `callbacksRef` (patrón de `AsteroidsGame.tsx`), sincroniza `paused` en otro `useEffect`. El sistema sigue funcional: el componente existe, sin consumidores.
5. Registrar `snake: SnakeGame` en `components/games/registry.tsx`. El sistema queda funcional: `/games/snake/jugar` corre el motor real (todavía no puede guardar puntaje, `"snake"` no está en el allowlist).
6. Agregar `"snake"` a `REAL_GAME_IDS` en `lib/real-games.ts`. Último paso ejecutable del spec: se puede jugar Snake de punta a punta y guardar un puntaje real, reflejado sin recargar en `/salon` y en `/games/snake` gracias al `revalidatePath` ya existente desde el spec 08.
7. Pasada de QA: `npm run build`; jugar una partida completa moviendo con las 4 flechas; confirmar que el wrap-around funciona en los 4 bordes sin terminar la partida; comer varias frutas y confirmar que el sprite mostrado cambia entre las 21 opciones y el score sube +10 por cada una; confirmar que el nivel sube cada 50 puntos y el juego se acelera de forma perceptible; confirmar que morder la propia cola resta una vida, reinicia posición y largo, y conserva score/nivel; perder las 3 vidas y confirmar que dispara el modal "FIN DEL JUEGO" con el puntaje real, campo de nombre y "GUARDAR PUNTAJE"; guardar un puntaje y confirmar que aparece en `/salon` (tab "SNAKE") y en `/games/snake` sin recargar; confirmar que "PAUSA"/"REANUDAR" del HUD externo detiene y reactiva el loop; confirmar que ningún otro juego del catálogo (incluidos asteroides, tetris y arkanoid) tiene regresión visual ni de comportamiento; confirmar que no hay errores ni warnings en consola durante una partida completa; confirmar con `mcp__supabase__get_advisors` que no hay alertas de seguridad nuevas.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni ESLint.
- [ ] La tabla `games` contiene la fila `"snake"` tras la migración; `"serpentina"` permanece sin cambios.
- [ ] `/games/snake` (detalle) muestra la ficha usando la nueva entrada, con "JUGAR AHORA" apuntando a `/games/snake/jugar`.
- [ ] `/games/snake/jugar` renderiza el tablero real dentro de `.crt-screen` con letterboxing (canvas 600×600, sin distorsión), controlable con las 4 flechas.
- [ ] La serpiente atraviesa los 4 bordes del tablero sin morir (wrap-around) y solo pierde una vida al chocar contra su propia cola.
- [ ] El motor no dibuja HUD dentro del canvas — solo tablero, serpiente y fruta.
- [ ] El HUD externo (`player-hud`) refleja en tiempo real el puntaje, las vidas (3→0) y el nivel reales del motor.
- [ ] Comer una fruta suma exactamente 10 puntos y hace crecer la serpiente un segmento; el sprite de la fruta varía entre partidas.
- [ ] El nivel sube cada 50 puntos y la velocidad del tick aumenta de forma perceptible (hasta un mínimo de 60ms).
- [ ] Al chocar contra la propia cola con vidas restantes, la serpiente reinicia a longitud 3 en el centro del tablero sin perder puntaje ni nivel.
- [ ] "PAUSA"/"REANUDAR" del HUD externo detiene y reactiva el loop del motor.
- [ ] Al perder la tercera vida, el motor notifica el fin de partida y aparece el modal "FIN DEL JUEGO" con el puntaje real, campo de nombre y "GUARDAR PUNTAJE".
- [ ] Un puntaje guardado en Snake aparece en `/salon` (tab "SNAKE") y en `/games/snake` **sin necesidad de recargar** la página.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva (tablero, serpiente, puntaje, vidas y nivel vuelven a su estado inicial).
- [ ] Cualquier otro juego del catálogo (asteroides, tetris y arkanoid incluidos) sigue funcionando exactamente igual, sin regresión visual ni de comportamiento.
- [ ] Desmontar `/games/snake/jugar` en cualquier momento no deja el loop del motor corriendo ni listeners de teclado activos.
- [ ] No hay errores ni warnings en la consola del navegador al jugar una partida completa.
- [ ] `mcp__supabase__get_advisors` no reporta alertas nuevas de seguridad.

## Decisions

- **Sí:** `id`/título = `snake`/`SNAKE`, distinto de `"serpentina"` (que permanece sin cambios) — mismo criterio que tetris/caida y arkanoid/bloque-buster: el juego real recibe un id nuevo, el sibling falso no se toca.
- **Sí:** `cat`/`color` = `ARCADE`/`green`, igual que `"serpentina"` (su sibling falso más cercano temáticamente) — mismo criterio que asteroides reusando `yellow` de `rocas`.
- **Sí:** reusar `.cover-snake` existente en vez de crear una clase nueva — decisión explícita del usuario pese al riesgo ya documentado con tetris/caida (tarjetas visualmente idénticas en `/biblioteca` entre `"serpentina"` y `"snake"`). Ver sección de Riesgos.
- **Sí:** grilla 20×20 celdas de 30px (canvas interno 600×600, proporción 1:1) con letterboxing centrado dentro de `.crt-screen`, igual criterio que Tetris (1:2) — evita distorsionar la grilla estirándola a 4:3.
- **Sí:** movimiento con wrap-around en los 4 bordes (fiel al Snake de Nokia/clásico) en vez de paredes sólidas — la única condición de choque es contra la propia cola.
- **Sí:** sistema de 3 vidas donde chocar contra la cola reinicia posición y longitud (a 3 segmentos, centro del tablero) pero conserva score y nivel — más indulgente que terminar la partida al primer choque, deja una partida más larga y jugable.
- **Sí:** niveles explícitos (+1 cada 50 puntos = cada 5 frutas), con el tick bajando 10ms por nivel desde 150ms hasta un piso de 60ms — progresión perceptible sin volverse injugable.
- **Sí:** las 21 frutas del atlas valen lo mismo (10 pts), elegidas al azar solo por variedad visual — evita una tabla de rareza/puntaje que el usuario no pidió.
- **Sí:** el motor no dibuja HUD dentro del canvas — solo tablero, serpiente y fruta; todo el HUD (score/vidas/nivel) vive en React, mismo criterio que Tetris (más simple sin un original que ya lo dibuje).
- **Sí:** `sprites.js` se porta a `components/games/snake/sprites.ts` como módulo ES tipado, en vez de mantenerlo como script global con `window.SPRITE_ATLAS` — consistente con cómo arkanoid portó `assets/spritesheet.js` a `spritesheet.ts`.
- **Sí:** assets movidos a `public/games/snake/` con rutas absolutas, siguiendo la convención ya usada por arkanoid.
- **Sí:** sin `restart()` en el handle del motor — "JUGAR DE NUEVO" remonta el componente vía `key` (mismo patrón que asteroides, tetris y arkanoid).
- **Sí:** `revalidatePath` y el guard de podio de `SalonClient.tsx` quedan fuera de este spec porque ya están implementados de forma genérica desde los specs 07 y 08 — cubren `"snake"` sin cambios adicionales.
- **No:** sonido — no hay assets de audio en `snake-assets/`.
- **No:** power-ups, obstáculos o múltiples frutas simultáneas — snake clásico puro.
- **No:** recalcular `best`/`plays` desde `MAX(scores.score)`, autenticación, moderación o rate limiting — mismos límites que specs anteriores.
- **No:** cambios a `"serpentina"`, su simulación falsa, o a `.cover-snake` más allá de reusarla tal cual.

## Identified risks

- **Cover compartida entre `"serpentina"` y `"snake"`:** al reusar `.cover-snake` sin modificarla, ambas tarjetas se ven visualmente idénticas en `/biblioteca` — mismo problema que tuvo tetris con `.cover-tetro`/`"caida"` antes de revertirlo. Aquí es una decisión explícita y aceptada del usuario, no un descuido; si en el futuro resulta confuso, la corrección sería crear `.cover-snake-real` en un spec posterior.
- **Loop de `requestAnimationFrame` o listeners no limpiados al desmontar:** mismo riesgo que los specs 05, 07 y 08; mitigado por la pasada de QA que verifica explícitamente este caso.
- **Letterboxing dentro de `.crt-screen`:** el canvas cuadrado 600×600 no llena el marco 4:3 completo, dejando espacio vacío a los lados — riesgo estético aceptado, mismo criterio que Tetris.
- **Loop basado en tick con acumulador de tiempo:** a diferencia de asteroides/arkanoid/tetris (que actualizan cada frame), snake avanza un paso de grilla solo cuando se cumple el intervalo del tick — un `dt` mal acumulado tras pausar/reanudar podría producir un salto de varias celdas en un solo frame; mitigado reseteando el acumulador al reanudar (mismo criterio que el `lastTime = null` de la receta de `engine-porting.md`).
- **Policy de insert abierta en `scores` (heredada del spec 06):** cualquiera con la publishable key puede insertar puntajes de `"snake"` sin pasar por una partida real; mismo riesgo aceptado que los otros tres juegos reales, ahora extendido a un cuarto `game_id`.
