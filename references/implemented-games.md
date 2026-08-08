# Juegos implementados

| ID           | Título     | Categoría | Color   | Descripción breve                                                            | Controles táctiles (móvil)                                                                 |
| ------------ | ---------- | --------- | ------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `arkanoid`   | ARKANOID   | ARCADE    | cyan    | Rompe los bloques con tu paleta antes de perder las tres vidas.              | `◀`/`▶` mueven la paleta (mantener presionado). `▲`/`▼`/`A`/`B` inertes.                   |
| `asteroides` | ASTEROIDES | SHOOTER   | yellow  | Pulveriza asteroides reales en gravedad cero.                                | `▲` propulsa y `◀`/`▶` giran (mantener presionado); `A` dispara (repite). `▼`/`B` inertes. |
| `frogger`    | FROGGER    | ARCADE    | green   | Cruza la carretera y el río sin convertirte en papilla.                      | `▲`/`▼`/`◀`/`▶` saltan una celda (repiten al mantener). `A`/`B` inertes.                   |
| `snake`      | SNAKE      | ARCADE    | green   | Guía a la serpiente por la grilla y devora frutas antes de morderte la cola. | `▲`/`▼`/`◀`/`▶` cambian de dirección. `A`/`B` inertes.                                     |
| `tetris`     | TETRIS     | PUZZLE    | magenta | Encaja las piezas reales antes de que el tablero te desborde.                | `▲` rota, `▼`/`◀`/`▶` mueven (repiten al mantener), `A` caída rápida, `B` rota.            |

Los 5 juegos reales (los únicos registrados en `GAME_REGISTRY`) comparten un mismo layout de pad táctil — cruz de 4 direcciones + botones `A`/`B` — visible solo en pantallas de puntero grueso (`@media (pointer: coarse)`) debajo del marco CRT en `/jugar`. Los controles que un juego no usa quedan visibles pero atenuados e inertes, para mantener la misma posición de botones en los 5 juegos. El binding control → tecla vive en `lib/touch-controls.ts` (`GAME_TOUCH_CONTROLS`); ver `specs/10-controles-tactiles.md`.

## Rendimiento (spec 11)

`specs/11-rendimiento-motores.md` ataca el costo de dibujo en canvas, la animación CSS no compositable del fondo global y los re-renders de React que nadie observa. Estado por motor:

- **Frogger** (pasos 6-8, terminados): fondo estático (zonas, bocas de meta, líneas divisorias) en una capa cacheada (`lib/game-canvas.ts`), invalidada solo en `setSkin`, `completeRound` y captura de meta; veteado de troncos sacado de dentro del `shadowBlur`; culling de entidades fuera de viewport; adopta `lib/game-loop.ts` (corta el rAF de verdad en pausa y game over); colores de tortuga y strings de HUD precomputados en vez de reconstruirse cada frame.
- **Asteroids** (paso 9, terminado): compactación in-place de los arrays de entidades muertas en vez de `.filter()`, bucles `for` en vez de `.forEach`, tabla de alphas precomputada para las partículas, `save()/restore()` por entidad reemplazado por reset de `setTransform`, adopta `createGameLoop` (corta en pausa y en game over; el estado transitorio `dead` — explosión + respawn — sigue corriendo).
- **Tetris, Arkanoid, Snake** (pasos 10-12, pendientes): todavía sin optimizar — siguen con el loop de `requestAnimationFrame` manual (no cortan en pausa) y sin capa cacheada para su grilla/tablero estático.
- **Compartido, los 5 juegos** (pasos 1-5 y 13): `lib/game-canvas.ts` (capas cacheadas + contexto `{ alpha: false }`) y `lib/fps-meter.ts` (overlay `?fps=1`) son módulos ya disponibles para los 5 motores, pero por ahora solo Frogger y Asteroids los consumen — Tetris, Arkanoid y Snake los adoptan recién en sus pasos pendientes. El `gridscroll` del fondo global pasó de animar `background-position` a `transform` (compositable) y `.crt-screen` tiene `isolation`/`contain` frente al blend de sus scanlines — esto sí corre ya en los 5. Los 5 componentes de motor y `TouchControls` están en `React.memo`.
