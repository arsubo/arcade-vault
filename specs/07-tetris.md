# SPEC 07 — Juego Tetris (motor real embebido)

> **Status:** Aprobado
> **Depends on:** 05-asteroides, 06-games-leaderboard
> **Date:** 2026-08-02
> **Objective:** Agregar "TETRIS" como nuevo juego jugable del catálogo, portando el motor de canvas de `references/started-games/03-tetris` a un componente cliente registrado en `/games/tetris/jugar`, con HUD externo de React (sin HUD ni overlay dibujados en el canvas, a diferencia de asteroides) y puntajes reales en Supabase.

## Scope

**In:**

- Fila nueva `"tetris"` en `games` (migración SQL vía `mcp__supabase__apply_migration`): `title: "TETRIS"`, `cat: "PUZZLE"`, `color: "magenta"`, `cover: "cover-tetro"` (reutiliza el estilo visual existente), `best: 32100`, `plays: "3.4K"`, `short`/`long` describiendo el juego portado. La entrada `"caida"` existente **no se modifica**.
- Crear `lib/real-games.ts` con `REAL_GAME_IDS` e `isRealGame()`, y migrar los 4 sitios hoy hardcodeados a `"asteroides"` (`app/games/[id]/jugar/actions.ts`, `app/games/[id]/page.tsx`, `app/salon/page.tsx`, `components/SalonClient.tsx`) para que lean del allowlist; luego agregar `"tetris"` junto a `"asteroides"`.
- Motor portado 1:1 desde `references/started-games/03-tetris/game.js` a `components/games/tetris/engine.ts`: tablero de 10×20, las 8 piezas del original (7 estándar + la pieza "N" en forma de tuerca), rotación con wall kicks, soft drop y hard drop, pieza fantasma (ghost piece), vista previa de la siguiente pieza, sistema de puntaje y niveles idénticos al original (nivel sube cada 10 líneas, velocidad de caída `max(100, 1000 − (nivel−1)×90)` ms). La pausa se migra al patrón de flag consultado en cada frame (ya no cancela `requestAnimationFrame` en cada toggle). El color de la grilla queda fijo en el módulo (ya no se lee `--grid-line` vía `getComputedStyle(document.body)`). El motor no dibuja HUD ni overlay de pausa/game-over dentro del canvas: el panel de `score`/`lines`/`level` y el overlay de pausa/game-over del original (ambos `<div>` del DOM) se descartan por completo, reemplazados por el HUD externo de React y el modal "FIN DEL JUEGO" existente. El selector de tema claro/oscuro y su persistencia en `localStorage` del original se descartan enteros — el tema visual lo controla la app, no el motor.
- El motor recibe **dos canvases** en su factory (tablero y next-piece); expone `setPaused`/`destroy` (sin `restart()` propio — "JUGAR DE NUEVO" remonta el componente vía `key`, igual que asteroides).
- `onLivesChange` se llama una sola vez al iniciar con el valor fijo `1` (Tetris no tiene vidas). `onLevelChange`, `onScoreChange` y `onGameOver` mapean directo a `level`, `score` y el fin de partida del original (una pieza nueva que colisiona al aparecer).
- Nuevo componente cliente `components/games/tetris/TetrisGame.tsx`: monta el canvas del tablero (300×600) con letterboxing dentro de `.crt-screen` (mantiene su proporción real 1:2, sin distorsión, con espacio vacío a los lados) y el canvas del next-piece (120×120) superpuesto en una esquina del mismo `.crt-screen`. Sigue el patrón de `AsteroidsGame.tsx` (`callbacksRef` para no recrear el motor en cada render, `useEffect` con cleanup que llama `destroy()`, segundo `useEffect` que sincroniza `paused`).
- Registro `tetris: TetrisGame` en `components/games/registry.tsx`.
- Controles: flechas izquierda/derecha (mover), flecha arriba o `X` (rotar), flecha abajo (soft drop), Espacio (hard drop). Sin tecla de pausa interna (`P` del original se descarta; la pausa la controla solo el botón externo "PAUSA", igual que asteroides).
- Fix del guard en `SalonClient.tsx` para `rows[1]`/`rows[2]` cuando hay menos de 3 puntajes.

**Out of scope (para specs futuros):**

- `revalidatePath` en `submitScore` — se deja igual que hoy; un puntaje guardado solo se refleja tras recargar la página.
- Recalcular `best`/`plays` en `games` a partir de `MAX(scores.score)`.
- Assets nuevos (sprites, audio) — el original no usa ninguno.
- Autenticación real, moderación de puntajes o rate limiting más allá de la validación mínima ya existente en `submitScore`.
- Motores reales para los demás juegos del catálogo (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`, `caida`) — siguen con la simulación falsa vía el fallback del registro.
- Cualquier cambio a la entrada `"caida"` o a su simulación falsa.
- El selector de tema claro/oscuro del original — se descarta, no se porta a ningún lado de la app.
- Cualquier cambio de balance, piezas, wall kicks o puntajes respecto al `game.js` original.

## Data model

```sql
-- migración: fila nueva en public.games
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('tetris', 'TETRIS',
   'Encaja las piezas reales antes de que el tablero te desborde.',
   'Motor real de bloques que caen: rota y desliza cada tetrominó (incluida la pieza especial en forma de tuerca), usa la pieza fantasma para ver dónde aterrizará, despeja líneas para subir de nivel y evita que la pila llegue al tope.',
   'PUZZLE', 'cover-tetro', 'magenta', 32100, '3.4K');
```

```ts
// lib/real-games.ts (nuevo)
export const REAL_GAME_IDS = ["asteroides", "tetris"] as const;

export function isRealGame(id: string): boolean {
  return (REAL_GAME_IDS as readonly string[]).includes(id);
}
```

```ts
// components/games/tetris/engine.ts
export interface TetrisCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void; // se llama una vez con 1, nunca cambia
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface TetrisEngineHandle {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

export function createTetrisEngine(
  boardCanvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks
): TetrisEngineHandle {
  /* ... */
}
```

```tsx
// components/games/registry.tsx (se agrega una entrada, sin modificar la interfaz existente)
export const GAME_REGISTRY: Record<string, ComponentType<GameEngineProps>> = {
  asteroides: AsteroidsGame,
  tetris: TetrisGame,
};
```

El contrato `GameEngineProps` (`paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) definido en `components/games/registry.tsx` no cambia.

## Implementation plan

1. Crear `lib/real-games.ts` (`REAL_GAME_IDS`, `isRealGame`) y migrar los 4 sitios hoy hardcodeados a `"asteroides"` (`app/games/[id]/jugar/actions.ts`, `app/games/[id]/page.tsx`, `app/salon/page.tsx`, `components/SalonClient.tsx`) para leer del allowlist. El sistema sigue funcional: comportamiento idéntico para asteroides, cero cambios visuales.
2. Migración SQL que inserta la fila `"tetris"` en `games`, vía `mcp__supabase__apply_migration`. El sistema sigue funcional: tetris aparece en Home/biblioteca con la simulación falsa, como cualquier juego sin motor registrado.
3. Agregar el guard en `SalonClient.tsx` para `rows[1]`/`rows[2]` cuando hay menos de 3 puntajes. El sistema sigue funcional, sin regresión visual cuando ya hay 3+ filas.
4. Portar `game.js` a `components/games/tetris/engine.ts`: encapsular el estado en `createTetrisEngine(boardCanvas, nextCanvas, callbacks)`, reemplazar los `getElementById` por los canvases y callbacks recibidos, eliminar el overlay/HUD del DOM y el theming con `localStorage`, fijar el color de grid, migrar la pausa al patrón de flag, exponer `setPaused`/`destroy`. El sistema sigue funcional: el módulo existe, sin consumidores todavía.
5. Crear `components/games/tetris/TetrisGame.tsx`: monta el canvas del tablero (con letterboxing 1:2 dentro de `.crt-screen`) y el canvas del next-piece superpuesto en una esquina, instancia el motor en un `useEffect` con `callbacksRef` (patrón de `AsteroidsGame.tsx`), sincroniza `paused` en otro `useEffect`. El sistema sigue funcional: el componente existe, sin consumidores.
6. Registrar `tetris: TetrisGame` en `components/games/registry.tsx`. El sistema queda funcional: `/games/tetris/jugar` corre el motor real (todavía no puede guardar puntaje, `"tetris"` no está en el allowlist).
7. Agregar `"tetris"` a `REAL_GAME_IDS` en `lib/real-games.ts`. Último paso ejecutable del spec: se puede jugar Tetris de punta a punta, guardar un puntaje real, y verlo reflejado en `/salon` y en `/games/tetris` tras recargar.
8. Pasada de QA: `npm run build`; jugar una partida completa (mover, rotar, soft/hard drop, subir de nivel, perder); confirmar que el HUD externo (`player-hud`) refleja en tiempo real puntaje y nivel reales y muestra `1` fijo en el hueco de vidas; confirmar que "PAUSA"/"REANUDAR" detiene y reactiva el loop sin overlay interno; confirmar que perder dispara el modal "FIN DEL JUEGO" con el puntaje real, campo de nombre y "GUARDAR PUNTAJE"; confirmar que el puntaje guardado aparece en `/salon` (tab "TETRIS") y en `/games/tetris` tras recargar; confirmar que asteroides y el resto del catálogo no tienen regresión visual ni de comportamiento; confirmar que no hay errores ni warnings en consola durante una partida completa; confirmar con `mcp__supabase__get_advisors` que no hay alertas de seguridad nuevas.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni ESLint.
- [ ] `lib/real-games.ts` existe con `REAL_GAME_IDS = ["asteroides", "tetris"]`; los 4 sitios que antes comparaban contra `"asteroides"` a mano ahora usan `isRealGame`.
- [ ] La tabla `games` contiene la fila `"tetris"` tras la migración; `"caida"` permanece sin cambios.
- [ ] `/games/tetris` (detalle) muestra la ficha usando la nueva entrada, con "JUGAR AHORA" apuntando a `/games/tetris/jugar`.
- [ ] `/games/tetris/jugar` renderiza el tablero real dentro de `.crt-screen` con letterboxing (sin distorsión) y el next-piece visible en una esquina, controlable con flechas, `↓` y Espacio.
- [ ] El motor no dibuja HUD ni overlay de pausa/game-over dentro del canvas — solo tablero, pieza actual, ghost piece y next-piece.
- [ ] El HUD externo (`player-hud`) refleja en tiempo real el puntaje y nivel reales del motor, y muestra `1` fijo en el hueco de vidas.
- [ ] "PAUSA"/"REANUDAR" del HUD externo detiene y reactiva el loop sin usar la tecla `P` interna del original.
- [ ] Al perder (pieza nueva colisiona al aparecer), el motor notifica el fin de partida y aparece el modal "FIN DEL JUEGO" con el puntaje real, campo de nombre y "GUARDAR PUNTAJE".
- [ ] Un puntaje guardado en Tetris aparece en `/salon` (tab "TETRIS") y en `/games/tetris` tras recargar.
- [ ] `/salon` no rompe ni muestra `undefined` en el podio cuando un juego (p. ej. tetris recién agregado) tiene menos de 3 puntajes.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva (tablero, puntaje, nivel y next-piece vuelven a su estado inicial).
- [ ] Cualquier otro juego del catálogo (asteroides incluido) sigue funcionando exactamente igual, sin regresión visual ni de comportamiento.
- [ ] Desmontar `/games/tetris/jugar` no deja el loop del motor corriendo ni listeners de teclado activos.
- [ ] No hay errores ni warnings en la consola del navegador al jugar una partida completa.
- [ ] `mcp__supabase__get_advisors` no reporta alertas nuevas de seguridad.

## Decisions

- **Sí:** `id`/`cat`/`color` = `tetris`/`PUZZLE`/`magenta`, igual que `"caida"` (la versión falsa que ya representa este tema) — mismo criterio que asteroides reusando `yellow` de `rocas`. `"caida"` no se toca.
- **Sí:** reusar `.cover-tetro` en vez de crear una clase nueva — mismo razonamiento que asteroides con `.cover-rocas`.
- **Sí:** letterboxing dentro de `.crt-screen` (canvas 300×600 centrado, proporción real 1:2 preservada) en vez de estirar a 4:3 o modificar el layout compartido — evita distorsión sin tocar CSS que usan los demás juegos.
- **Sí:** el canvas del next-piece vive superpuesto dentro del mismo `.crt-screen`, no en el HUD externo de React — evita agregar un elemento de layout nuevo a `/jugar` que solo aplicaría a este juego.
- **Sí:** el motor no dibuja HUD ni overlay de pausa/game-over en el canvas — fiel al original (que tampoco lo hacía, a diferencia de asteroides); el HUD externo y el modal "FIN DEL JUEGO" cubren ambos casos.
- **Sí:** `onLivesChange` fijo en `1`, llamado una sola vez — Tetris no tiene sistema de vidas; valor simple y honesto en el hueco del contrato.
- **Sí:** sin `restart()` en el handle del motor — "JUGAR DE NUEVO" remonta el componente vía `key` (patrón ya existente en `JugarClient.tsx`), igual que asteroides.
- **Sí:** se descarta la tecla `P` de pausa interna del original — la pausa la controla solo el botón externo, igual que asteroides.
- **Sí:** se descarta el selector de tema claro/oscuro y su `localStorage` — el tema visual lo controla la app, no el motor.
- **Sí:** se crea `lib/real-games.ts` en este spec (primera vez que hace falta el allowlist desde asteroides) y se migran los 4 sitios hardcodeados.
- **Sí:** se agrega el guard de `rows[1]`/`rows[2]` en `SalonClient.tsx` en este spec — bug que este spec expone directamente al ser el segundo juego real con pocos puntajes.
- **No:** `revalidatePath` en `submitScore` — fuera de alcance, mismo criterio que el spec 06.
- **No:** assets nuevos (sprites/audio) — el original no usa ninguno.
- **No:** recalcular `best`/`plays` desde `MAX(scores.score)`, autenticación, moderación o rate limiting — mismos límites que specs anteriores.

## Identified risks

- **Loop de `requestAnimationFrame` o listeners no limpiados al desmontar:** mismo riesgo que el spec 05; mitigado por la pasada de QA que verifica explícitamente este caso al salir de `/games/tetris/jugar`.
- **Letterboxing dentro de `.crt-screen`:** al no llenar el marco 4:3 completo, puede leerse como espacio vacío no aprovechado a los lados del tablero; riesgo estético aceptado por decisión explícita de no distorsionar ni tocar el CSS compartido.
- **Doble canvas dentro de un solo `.crt-screen`:** el next-piece superpuesto podría tapar parte del tablero en pantallas muy angostas si el escalado CSS no deja suficiente margen; riesgo menor, a revisar en la pasada de QA visual.
- **Sin `revalidatePath`:** un puntaje guardado en Tetris solo se refleja en `/salon` y en `/games/tetris` tras recargar la página, igual que hoy para asteroides.
- **Policy de insert abierta en `scores` (heredada del spec 06):** cualquiera con la publishable key puede insertar puntajes de `"tetris"` sin pasar por una partida real; mismo riesgo aceptado que asteroides, ahora extendido a un segundo `game_id`.
