# SPEC 08 — Juego Arkanoid (motor real embebido)

> **Status:** Aprobado
> **Depends on:** 05-asteroides, 06-games-leaderboard, 07-tetris
> **Date:** 2026-08-03
> **Objective:** Agregar "ARKANOID" como nuevo juego jugable del catálogo, portando el motor de canvas de `references/started-games/04-arkanoid` a un componente cliente registrado en `/games/arkanoid/jugar` (con control dual de mouse y teclado, y HUD/overlays dibujados en el canvas conviviendo con el HUD externo de React, igual que asteroides), puntajes reales en Supabase para ambos finales de partida (perder o completar los 5 niveles), y `revalidatePath` en `submitScore` extendido a los tres juegos reales.

## Scope

**In:**

- Fila nueva `"arkanoid"` en `games` (migración SQL vía `mcp__supabase__apply_migration`): `title: "ARKANOID"`, `cat: "ARCADE"`, `color: "cyan"`, `cover: "cover-arkanoid"` (clase CSS nueva), `best: 45800`, `plays: '5.7K'`, `short: "Rompe los bloques con tu paleta antes de perder las tres vidas."`, `long: "Motor real de arkanoid clásico: controla la paleta con mouse o teclado, rebota la pelota para destruir los bloques de cada patrón, sube de nivel con velocidad creciente a través de 5 tableros distintos, y evita que la pelota se te escape las tres vidas disponibles."`. La entrada `"bloque-buster"` existente **no se modifica**.
- Nueva clase `.cover-arkanoid` en `app/globals.css`: inspirada en la paleta real de bloques del spritesheet portado (`red`/`yellow`/`cyan`/`magenta`/`hotpink`/`green`), visualmente distinta de `.cover-bricks` (la que usa `"bloque-buster"`) para que ambas tarjetas no se vean idénticas en `/biblioteca`. Misma técnica CSS pura que el resto de `.cover-*` (gradientes vía `::before`/`::after`, sin imágenes).
- Motor portado desde `references/started-games/04-arkanoid/{game.js,levels.js,assets/spritesheet.js}` a `components/games/arkanoid/engine.ts` (más `levels.ts` y `spritesheet.ts` como módulos ES separados, siguiendo la receta de `engine-porting.md` para los tres archivos que hoy comparten globals sin módulos): tablero de bloques 10×6, 5 niveles con patrones y velocidad de pelota crecientes (×1.00 a ×1.46), paleta controlable con mouse (coordenadas escaladas vía `getBoundingClientRect()`, igual que el original) y con `←`/`→`, 3 vidas, colisiones AABB pelota-bloque/paleta/paredes, animación de explosión de 4 frames por bloque destruido, y los dos finales de partida del original (`gameover` al perder la última vida, `win` al limpiar los 5 niveles).
- El motor conserva 1:1 su HUD y overlays dibujados dentro del canvas: score/nivel/vidas (sprites de pelota) en la esquina superior, overlay de "GAME OVER", overlay de "¡Completaste el juego!", y el overlay de pausa con los 5 botones clicables para saltar a cualquier nivel — todo convive con el HUD externo de React, mismo precedente que asteroides.
- Pausa **dual**: el motor sigue respondiendo a `P`/`Escape` internos (como el original) además del `setPaused` que dispara el botón externo "PAUSA" del HUD — a diferencia de asteroides y tetris, que descartaron su tecla interna.
- Sonido: `bounceSound`/`breakSound` (`new Audio(...).cloneNode().play()`, igual que el original) movidos a `public/games/arkanoid/sounds/`, cargados con rutas absolutas; se detienen y no vuelven a sonar tras `destroy()`.
- Spritesheet `spritesheet-breakout.png` movido a `public/games/arkanoid/`, cargado con ruta absoluta. Arranque asíncrono (`loadSpritesheet(callback)`) protegido con un flag `disposed` consultado dentro del callback, para que `destroy()` llamado antes de que cargue la imagen evite arrancar el loop igual (gotcha ya documentado en `engine-porting.md`).
- Nuevo componente cliente `components/games/arkanoid/ArkanoidGame.tsx`: canvas único de 800×600 (proporción 4:3 nativa, sin letterboxing) dentro de `.crt-screen`, siguiendo el patrón de `AsteroidsGame.tsx` (`callbacksRef`, `useEffect` de creación con cleanup que llama `destroy()`, `useEffect` que sincroniza `paused`).
- `onLivesChange` y `onLevelChange` mapean directo a `lives` (3→0) y `currentLevel` (1→5) del motor. `onGameOver` se dispara en **ambos** finales de partida (`gameover` por 0 vidas y `win` por completar el nivel 5), siempre con el `score` real acumulado.
- Registro `arkanoid: ArkanoidGame` en `components/games/registry.tsx`.
- `lib/real-games.ts` ya existe; este spec agrega `"arkanoid"` a `REAL_GAME_IDS`, sin cambiar su forma.
- `revalidatePath("/salon")` y `revalidatePath(\`/games/${gameId}\`)`en`submitScore` (`app/games/[id]/jugar/actions.ts`) tras un insert exitoso — afecta a los tres juegos reales (`asteroides`, `tetris`, `arkanoid`): un puntaje guardado se refleja sin recargar la página.
- Controles: mouse (mover paleta) o `←`/`→` (mover paleta), `P`/`Escape` (pausa interna, además del botón externo), click sobre los botones 1–5 del overlay de pausa (saltar de nivel).

**Out of scope (para specs futuros):**

- Recalcular `best`/`plays` en `games` a partir de `MAX(scores.score)`.
- Autenticación real, moderación de puntajes o rate limiting más allá de la validación mínima ya existente en `submitScore`.
- Motores reales para los demás juegos del catálogo (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`, `caida`) — siguen con la simulación falsa vía el fallback del registro.
- Cualquier cambio a la entrada `"bloque-buster"`, a su simulación falsa o a `.cover-bricks`.
- Cualquier cambio de balance, niveles, velocidades o puntajes respecto al `game.js`/`levels.js` original.
- Cualquier logro, medalla o distinción especial en la UI por terminar el juego (`win`) más allá de poder guardar ese puntaje como uno más — no hay tratamiento visual distinto para un puntaje "de victoria" en `/salon`.

## Data model

```sql
-- migración: fila nueva en public.games
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('arkanoid', 'ARKANOID',
   'Rompe los bloques con tu paleta antes de perder las tres vidas.',
   'Motor real de arkanoid clásico: controla la paleta con mouse o teclado, rebota la pelota para destruir los bloques de cada patrón, sube de nivel con velocidad creciente a través de 5 tableros distintos, y evita que la pelota se te escape las tres vidas disponibles.',
   'ARCADE', 'cover-arkanoid', 'cyan', 45800, '5.7K');
```

```ts
// lib/real-games.ts (ya existe; este spec agrega la línea de arkanoid)
export const REAL_GAME_IDS = ["asteroides", "tetris", "arkanoid"] as const;
```

```ts
// components/games/arkanoid/levels.ts
export interface Level {
  speed: number;
  blocks: { col: number; row: number; color: string }[];
}
export const LEVELS: Level[]; // 5 niveles, mismo contenido que levels.js
```

```ts
// components/games/arkanoid/spritesheet.ts
export const SPRITES: Record<
  string,
  { sx: number; sy: number; sw: number; sh: number }
>;
export const EXPLOSION_FRAMES: Record<
  string,
  { sx: number; sy: number; sw: number; sh: number }[]
>;
export const EXPLOSION_DURATION: number;
export function loadSpritesheet(cb: () => void): void; // src: "/games/arkanoid/spritesheet-breakout.png"
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number
): void;
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: { sx: number; sy: number; sw: number; sh: number },
  x: number,
  y: number,
  w: number,
  h: number
): void;
```

```ts
// components/games/arkanoid/engine.ts
export interface ArkanoidCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void; // dispara en gameover (0 vidas) y en win (nivel 5 limpio)
}

export interface ArkanoidEngineHandle {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks
): ArkanoidEngineHandle {
  /* ... */
}
```

```tsx
// components/games/registry.tsx (se agrega una entrada, sin modificar la interfaz existente)
export const GAME_REGISTRY: Record<string, ComponentType<GameEngineProps>> = {
  asteroides: AsteroidsGame,
  tetris: TetrisGame,
  arkanoid: ArkanoidGame,
};
```

El contrato `GameEngineProps` (`paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) definido en `components/games/registry.tsx` no cambia.

```ts
// app/games/[id]/jugar/actions.ts (extiende submitScore existente)
// tras el insert exitoso:
revalidatePath("/salon");
revalidatePath(`/games/${gameId}`);
```

## Implementation plan

1. Migración SQL que inserta la fila `"arkanoid"` en `games`, vía `mcp__supabase__apply_migration`. El sistema sigue funcional: arkanoid aparece en Home/biblioteca con la simulación falsa, como cualquier juego sin motor registrado.
2. Agregar `.cover-arkanoid` en `app/globals.css`, junto a las demás clases `.cover-*`. El sistema sigue funcional, con la nueva cover visible en la tarjeta simulada.
3. Mover `spritesheet-breakout.png` y los dos `.mp3` a `public/games/arkanoid/` (`public/games/arkanoid/sounds/` para el audio). El sistema sigue funcional, sin consumidores todavía.
4. Portar `levels.js` a `components/games/arkanoid/levels.ts`, exportando `LEVELS` con el mismo contenido. El sistema sigue funcional.
5. Portar `assets/spritesheet.js` a `components/games/arkanoid/spritesheet.ts`, exportando `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, `loadSpritesheet`, `drawSprite`, `drawFrame`; la ruta de carga de imagen pasa a `/games/arkanoid/spritesheet-breakout.png`. El sistema sigue funcional.
6. Portar `game.js` a `components/games/arkanoid/engine.ts`: encapsular `paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `gameState`, `currentLevel`, `isPaused`, `keys` en el closure de `createArkanoidEngine(canvas, callbacks)`; listeners de `click`/`mousemove` sobre el `canvas` (escalados con `getBoundingClientRect()`) y de `keydown`/`keyup` sobre `document` (incluye el toggle `P`/`Escape` interno); flag `disposed` consultado en el callback de `loadSpritesheet` antes de arrancar el loop; loop con el patrón de pausa por flag; `onGameOver` se llama tanto al entrar en `gameover` como en `win`; `destroy()` cancela el rAF, remueve los listeners de `canvas` y `document`, y detiene cualquier audio en curso. El sistema sigue funcional: el módulo existe, sin consumidores todavía.
7. Crear `components/games/arkanoid/ArkanoidGame.tsx`: canvas 800×600 dentro de `.crt-screen`, instancia el motor en un `useEffect` con `callbacksRef` (patrón de `AsteroidsGame.tsx`), sincroniza `paused` en otro `useEffect`. El sistema sigue funcional: el componente existe, sin consumidores.
8. Registrar `arkanoid: ArkanoidGame` en `components/games/registry.tsx`. El sistema queda funcional: `/games/arkanoid/jugar` corre el motor real (todavía no puede guardar puntaje, `"arkanoid"` no está en el allowlist).
9. Agregar `"arkanoid"` a `REAL_GAME_IDS` en `lib/real-games.ts`. Se puede jugar Arkanoid de punta a punta y guardar un puntaje real.
10. Agregar `revalidatePath("/salon")` y `revalidatePath(\`/games/${gameId}\`)`en`submitScore`, tras el insert exitoso. Último paso ejecutable del spec: un puntaje guardado en cualquiera de los tres juegos reales (`asteroides`, `tetris`, `arkanoid`) se refleja en `/salon` y en la ficha de detalle sin recargar la página.
11. Pasada de QA: `npm run build`; jugar una partida completa moviendo la paleta con mouse y con teclado; romper bloques y subir de nivel; pausar/reanudar con el botón externo y con `P`/`Escape`, confirmando que el overlay de pausa con el selector de nivel sigue funcionando y que saltar de nivel desde ahí actualiza el HUD externo; perder las 3 vidas y confirmar que dispara el modal "FIN DEL JUEGO" con el puntaje real; en otra partida, completar los 5 niveles y confirmar que el final `win` también dispara el modal con el puntaje real; guardar un puntaje en cada uno de los dos finales y confirmar que aparecen en `/salon` (tab "ARKANOID") sin recargar; confirmar que guardar un puntaje en asteroides o tetris también refleja sin recargar tras el cambio de `revalidatePath`; confirmar que los sonidos de rebote/rotura se escuchan y dejan de sonar al salir de `/games/arkanoid/jugar`; confirmar que no hay errores ni warnings en consola durante una partida completa; confirmar con `mcp__supabase__get_advisors` que no hay alertas de seguridad nuevas.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni ESLint.
- [ ] La tabla `games` contiene la fila `"arkanoid"` tras la migración; `"bloque-buster"` permanece sin cambios.
- [ ] `/games/arkanoid` (detalle) muestra la ficha usando la nueva entrada, con "JUGAR AHORA" apuntando a `/games/arkanoid/jugar`.
- [ ] `/games/arkanoid/jugar` renderiza el tablero real dentro de `.crt-screen` sin distorsión (canvas 800×600, 4:3 nativo), controlable con mouse y con `←`/`→`.
- [ ] El motor conserva su HUD y overlays dibujados en el canvas (score/nivel/vidas, overlay de pausa con selector de nivel, overlays de "GAME OVER" y de victoria), sin cambios visuales respecto al original.
- [ ] El HUD externo (`player-hud`) refleja en tiempo real el puntaje, vidas y nivel reales del motor.
- [ ] "PAUSA"/"REANUDAR" del HUD externo detiene y reactiva el loop del motor.
- [ ] `P`/`Escape` también pausan/reanudan el motor internamente, y el overlay de pausa con los botones de salto de nivel sigue siendo clicable y funcional.
- [ ] Al perder la última vida, el motor notifica el fin de partida y aparece el modal "FIN DEL JUEGO" con el puntaje real, campo de nombre y "GUARDAR PUNTAJE".
- [ ] Al completar los 5 niveles, el motor notifica el fin de partida (mismo flujo que perder) y aparece el modal "FIN DEL JUEGO" con el puntaje real.
- [ ] Un puntaje guardado en Arkanoid aparece en `/salon` (tab "ARKANOID") y en `/games/arkanoid` **sin necesidad de recargar** la página.
- [ ] Un puntaje guardado en Asteroides o Tetris también se refleja en `/salon` y en su ficha sin recargar, tras el cambio de `revalidatePath`.
- [ ] Los efectos de sonido de rebote y de rotura de bloques se escuchan durante la partida y no siguen sonando tras salir de `/games/arkanoid/jugar`.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva (tablero, puntaje, vidas, nivel y estado de pausa vuelven a su estado inicial).
- [ ] Cualquier otro juego del catálogo (asteroides y tetris incluidos) sigue funcionando exactamente igual, sin regresión visual ni de comportamiento.
- [ ] Desmontar `/games/arkanoid/jugar` antes de que cargue el spritesheet no arranca el loop del motor ni deja listeners activos.
- [ ] Desmontar `/games/arkanoid/jugar` en cualquier momento no deja el loop del motor corriendo ni listeners de teclado o mouse activos.
- [ ] No hay errores ni warnings en la consola del navegador al jugar una partida completa (incluyendo cualquiera de los dos finales).
- [ ] `mcp__supabase__get_advisors` no reporta alertas nuevas de seguridad.

## Decisions

- **Sí:** `id`/`cat`/`color` = `arkanoid`/`ARCADE`/`cyan`, mismo color que `"bloque-buster"` (su sibling falso más cercano temáticamente) — mismo criterio que asteroides reusando `yellow` de `rocas` y tetris reusando `magenta` de `caida`. `"bloque-buster"` no se toca.
- **Sí:** título `"ARKANOID"`, distinto de `"BLOQUE BUSTER"`, para no confundir ambas entradas en el catálogo.
- **Sí:** `.cover-arkanoid` nueva en vez de reusar `.cover-bricks` — decisión explícita para evitar el mismo problema que tetris tuvo al reusar `.cover-tetro` (tarjetas visualmente idénticas en `/biblioteca`) y tuvo que revertir.
- **Sí:** canvas interno 800×600 (4:3 nativo) dentro de `.crt-screen`, sin letterboxing ni distorsión — a diferencia de tetris, el original ya es 4:3.
- **Sí:** control dual mouse + teclado (`←`/`→`), fiel al original — el manejo de coordenadas de mouse ya escala correctamente con `getBoundingClientRect()` dentro del canvas estirado por CSS.
- **Sí:** se conserva la pausa interna por teclado (`P`/`Escape`) además del botón externo "PAUSA" del HUD — decisión explícita del usuario, distinta del criterio de asteroides y tetris (que la descartaron). Ver riesgo de desincronización del botón externo en la sección de Riesgos.
- **Sí:** se conserva el selector de nivel clicable (5 botones) dentro del overlay de pausa — parte documentada del diseño original, útil también como atajo de QA.
- **Sí:** ambos finales de partida (`gameover` por 0 vidas, `win` por completar el nivel 5) disparan `onGameOver` con el puntaje real y habilitan el guardado — completar el juego es tan "fin de partida" como perder.
- **Sí:** se agrega `revalidatePath("/salon")` y `revalidatePath(\`/games/${gameId}\`)`en`submitScore` en este spec — decisión explícita del usuario; afecta a los tres juegos reales (`asteroides`, `tetris`, `arkanoid`) de una sola vez, no solo a arkanoid.
- **Sí:** assets (spritesheet + 2 sonidos) se mueven a `public/games/arkanoid/` con rutas absolutas, siguiendo la convención ya usada para juegos con recursos externos.
- **Sí:** `levels.js` y `assets/spritesheet.js` se portan como módulos ES separados (`levels.ts`, `spritesheet.ts`) en vez de inlinear todo en `engine.ts` — preserva la separación de responsabilidades del original y sigue la receta de `engine-porting.md` para archivos con globals compartidos.
- **Sí:** sin `restart()` en el handle del motor — "JUGAR DE NUEVO" remonta el componente vía `key` (mismo patrón que asteroides y tetris).
- **No:** recalcular `best`/`plays` desde `MAX(scores.score)`, autenticación, moderación o rate limiting — mismos límites que specs anteriores.
- **No:** cambios de balance, niveles o velocidades respecto al `game.js`/`levels.js` original.
- **No:** tratamiento visual especial (medalla, distinción) para un puntaje guardado tras el final `win` — se guarda como un puntaje más.
- **Definición rápida en las secciones finales** (Data model en adelante), sin ronda de confirmación sección por sección — a pedido explícito del usuario ("termina el documento y apruébalo").

## Identified risks

- **Desincronización de la pausa dual:** al conservar `P`/`Escape` interno además del botón externo "PAUSA", el motor puede quedar pausado (o reanudado) sin que el estado `paused` de React se entere — el botón externo puede mostrar "PAUSA" mientras el motor ya está en pausa por teclado, o viceversa. El overlay interno del canvas (con el selector de nivel) sigue siendo la fuente visual de verdad en ese caso, pero el HUD externo puede mostrar una etiqueta desincronizada hasta el próximo toggle desde React. Riesgo aceptado explícitamente al conservar la tecla interna; no se agrega un callback `onPauseChange` al contrato `GameEngineProps` para resolverlo, por ser un cambio de contrato que afectaría a los demás motores ya implementados.
- **Loop de `requestAnimationFrame` o listeners no limpiados al desmontar:** mismo riesgo que los specs 05 y 07; mitigado por la pasada de QA que verifica explícitamente este caso, incluyendo el caso de desmontar antes de que cargue el spritesheet.
- **Arranque asíncrono del spritesheet:** si el componente se desmonta antes de que `loadSpritesheet` complete, el loop podría arrancar después de `destroy()`. Mitigado con el flag `disposed` consultado en el callback antes de llamar `requestAnimationFrame`.
- **`revalidatePath` extendido a los tres juegos reales:** invalida el caché de `/salon` y de `/games/[id]` en cada guardado, no solo para arkanoid — aceptado explícitamente como parte de este spec; sin impacto funcional negativo esperado, solo más invalidaciones de caché que antes.
- **Policy de insert abierta en `scores` (heredada del spec 06):** cualquiera con la publishable key puede insertar puntajes de `"arkanoid"` sin pasar por una partida real; mismo riesgo aceptado que asteroides y tetris, ahora extendido a un tercer `game_id`.
- **Doble control (mouse + teclado) simultáneo:** si el jugador usa ambos a la vez, el último input que se procesa en el frame gana — mismo comportamiento que el original, sin lógica de prioridad adicional; riesgo estético menor, no funcional.
