# SPEC 11 — Rendimiento de los motores de juego

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09, SPEC 10, `specs/game-jam/frogger/01-frogger-core.md`
> **Date:** 2026-08-07
> **Objective:** Recuperar 60 fps estables en los 5 motores sin cambiar su aspecto, eliminando el trabajo de dibujo desperdiciado por frame, la animación CSS no compositable que repinta el viewport entero, y los re-renders de React que nadie observa.

## Why this spec exists

El diagnóstico se hizo leyendo los 5 motores, `JugarClient.tsx` y `app/globals.css`. El costo se reparte en tres capas independientes, y conviene dejar escrito el peso relativo de cada una porque es contraintuitivo:

1. **Dibujo en canvas.** Frogger hace ~280 operaciones con `shadowBlur` por frame (~17.000/seg). `shadowBlur` obliga al rasterizador a renderizar cada dibujo en una superficie aparte, aplicarle un desenfoque gaussiano y componerlo. Es, por lejos, el costo individual más grande del repo.
2. **CSS y compositor.** `.av-bg::before` anima `background-position` de forma infinita sobre una capa a viewport completo con `mask-image` y `perspective`. Es una animación de _paint_: se re-rasteriza cada frame en todas las páginas del sitio. Ninguna optimización del motor la recupera.
3. **Re-renders de React.** Ningún motor llama a sus callbacks por frame — esto se verificó, y el patrón de `callbacksRef` + deps `[inputRef]` de los 5 wrappers ya es correcto. El costo real es que cada cambio de puntaje recorre el árbol entero de `JugarClient` sin memoización. Es desperdicio, no es el cuello de botella.

El spec ataca las tres, en ese orden de prioridad, y agrega un medidor para que la próxima discusión de performance empiece con números.

## Scope

**In:**

- **Tres módulos nuevos en `lib/`**, consumidos por los 5 motores:
  - `lib/game-loop.ts` — `createGameLoop()`: encapsula `requestAnimationFrame`, corte **real** del loop en pausa y en game-over (hoy los 5 motores reprograman el frame y recién ahí hacen `return`), y reanudación limpia.
  - `lib/game-canvas.ts` — `createLayer()`: canvas fuera de pantalla para cachear capas estáticas, y helper para pedir el contexto con `{ alpha: false }` (los 5 motores pintan un fondo opaco primero y ninguno lo declara).
  - `lib/fps-meter.ts` — overlay de medición: fps, ms/frame (p50 y p95) y **contador de renders de React** de `JugarClient`. Se activa con el query param `?fps=1` en cualquier build.
- **Frogger** (`components/games/frogger/engine.ts`), el más afectado:
  - Fondo estático (zonas, bocas de meta, líneas divisorias — `engine.ts:441-483`) cacheado en una capa y bliteado con un solo `drawImage`; se repinta solo en `setSkin`, `completeRound` y captura de meta.
  - El veteado de los troncos (`engine.ts:511-516`) sale de dentro de `glow()`: el contorno conserva su blur, las vetas se dibujan planas. Es el cambio de mayor impacto individual (~150 ops con blur menos por frame) y es imperceptible.
  - Culling de entidades fuera del viewport en `draw()` (`engine.ts:609-611`).
  - Menos garbage por frame: hoistear `[10, 10]` y el array combinado `[...ROAD_ROWS, ...RIVER_ROWS]` (`engine.ts:474-475`), precomputar los dos `rgba` de tortuga en `setSkin` (`engine.ts:421-424`), cachear los strings del HUD (`engine.ts:574`, `:581`), hoistear `ctx.font` (`engine.ts:568`), y convertir `glow(color, blur, closure)` en un par `beginGlow()/endGlow()` que no aloque una closure por dibujo (~85/frame).
- **Asteroids** (`components/games/asteroids/engine.ts`), el de mayor presión de GC:
  - Reemplazar los `.filter()` por compactación in-place sobre los arrays existentes (`engine.ts:494-496`, `:527-528`) y los `.forEach(closure)` por bucles `for` (`engine.ts:489-492`, `:598-601`).
  - Eliminar la construcción de strings `rgba()` por partícula y por frame (`engine.ts:320-321`, hasta ~140 strings/frame): tabla de alphas precomputada.
  - Reducir el `save()/restore()` por entidad (`engine.ts:116`, `:163`, `:257`, `:546`).
- **Tetris** (`components/games/tetris/engine.ts`), el de peor ratio de desperdicio:
  - La grilla estática (`engine.ts:289-304`, 27 `stroke()` por frame) pasa a una capa cacheada.
  - Repintado por _dirty flag_: el tablero cambia como mucho una vez por `dropInterval`; hoy se repintan ~400 `fillRect` 60 veces por segundo.
  - `ghostY()` (`engine.ts:315`) se calcula al mover o rotar la pieza, no en cada frame.
- **Arkanoid** (`components/games/arkanoid/engine.ts`):
  - Cachear el `getBoundingClientRect()` del `onMouseMove` (`engine.ts:248-253`), que hoy fuerza un layout sincrónico por cada evento de puntero.
  - Resolver el `Frame` del sprite una vez en `loadLevel` en vez de reconstruir `"block_" + block.color` por ladrillo y por frame (`engine.ts:413`).
  - Campo de ladrillos en capa cacheada, repintado al romperse uno.
  - Evitar el `explosions.filter()` cuando el array está vacío (`engine.ts:342-343`).
- **Snake** (`components/games/snake/engine.ts`):
  - Tablero y grilla (`engine.ts:208-225`, 42 `stroke()` por frame) a capa cacheada.
  - Repintado solo cuando avanza un tick, no en cada frame.
- **CSS** (`app/globals.css`):
  - `gridscroll` (`globals.css:95`, `:1602`) deja de animar `background-position` y pasa a animar `transform: translateY` sobre una capa interna. El movimiento se ve idéntico y pasa a ser compositable.
  - `contain: paint` / aislamiento en `.crt-screen` para que el `mix-blend-mode: multiply` de `::after` (`globals.css:1201-1212`) no fuerce una recomposición a pantalla completa sobre un canvas que cambia cada frame.
- **React** (`JugarClient.tsx`, `TouchControls.tsx`, los 5 wrappers):
  - `React.memo` en los 5 componentes de motor y en `TouchControls`.
  - `useCallback` sobre el `onGameOver` inline (`JugarClient.tsx:182-185`), hoy recreado en cada render.
  - `handlePointerDown` de `TouchControls` deja de ser una factory currificada: el binding se resuelve desde un `data-control` en el evento, de modo que los 6 handlers sean estables.
  - **Principio para todo estado nuevo que este spec introduzca:** `useState` solo para lo que tiene que reflejarse en el DOM. Todo lo demás —contadores, flags internos, acumuladores del medidor— va en `useRef`. En particular, el contador de renders del punto anterior se implementa con un `useRef` incrementado en el cuerpo del componente (nunca con `setState`): si fuera `useState`, cada incremento dispararía un nuevo render que se incrementa a sí mismo. El overlay lee ese ref por su propio `requestAnimationFrame`, no por una suscripción de React.
  - `score`, `lives`, `engineLevel`, `paused`, `over`, `gameKey`, `menuOpen`, `playerName`, `saveState` y `saveError` en `JugarClient.tsx` se quedan en `useState`: los diez se pintan en el DOM (HUD, modal, overlay de pausa) y no hay forma de evitarles un render. Lo que sí se limita es el alcance de ese render: con `React.memo` en los componentes de motor y en `TouchControls` (punto anterior), un cambio de `score` sigue re-renderizando `JugarClient`, pero dejar de re-renderizar el `<canvas>` y el pad táctil, que es el gasto real.
- Actualización de `references/implemented-games.md` con una nota del trabajo de rendimiento por juego.

**Out of scope (para specs futuros):**

- **Clamp de `dt` y manejo de `visibilitychange`.** Frogger (`engine.ts:627`) y Arkanoid (`engine.ts:467`) no acotan el delta: volver a una pestaña que estuvo en segundo plano mata a la rana al instante y hace que la pelota atraviese el paddle. Es un bug real y confirmado, pero es corrección de comportamiento, no de rendimiento.
- **Clumping de entidades en Frogger.** `trackEnd = CANVAS_W * 2` (`engine.ts:88`, `:111`) combinado con el wrap de `dir === 1` (`engine.ts:355-357`) apila todas las entidades de la mitad derecha en un solo punto en el primer frame. El culling de este spec elimina el costo de dibujarlas, pero **no** corrige el artefacto de gameplay.
- **Fuga de `Audio` en Arkanoid.** `playSound` (`engine.ts:144-150`) clona un `HTMLAudioElement` por rebote y solo lo libera en el evento `ended`; si `play()` es rechazado por la política de autoplay, el `Set` crece sin límite.
- **`devicePixelRatio`.** Ningún canvas del repo lo maneja: se ven suaves en pantallas HiDPI. Agregarlo cuadruplica el fill rate, así que no se toca hasta que el costo de dibujo esté resuelto y medido.
- **Proporción del marco CRT en desktop para Frogger.** `.crt-screen` es `4/3` (`globals.css:1191-1193`) y el canvas de Frogger es `8/7`; el override existe solo bajo `@media (pointer: coarse)` (`globals.css:1281-1284`), así que en desktop el tablero se estira.
- **Migración a WebGL, a `OffscreenCanvas` en worker, o a un motor de terceros.**
- **Los juegos no registrados en `GAME_REGISTRY`**, que siguen con la simulación falsa.
- **Cambios de balance, dificultad o velocidad** en cualquier motor.

## Data model

Este spec no introduce estructuras de datos de dominio. Introduce tres contratos internos en `lib/`:

```ts
// lib/game-loop.ts
export interface GameLoop {
  /** Arranca el loop. Idempotente. */
  start: () => void;
  /** Cancela el rAF de verdad — no reprograma para hacer `return` adentro. */
  stop: () => void;
  /** `false` cancela el frame pendiente; `true` reanuda sin salto de delta. */
  setRunning: (running: boolean) => void;
}

export function createGameLoop(options: {
  /** Avance de simulación. No se llama si el loop está detenido. */
  update: (dtMs: number) => void;
  /** Dibujo. Se llama una vez más al detenerse, para dejar el frame final. */
  draw: () => void;
}): GameLoop;
```

```ts
// lib/game-canvas.ts
export interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Marca la capa como sucia; se repinta en el próximo `draw`. */
  invalidate: () => void;
  /** `true` si hay que repintar. Se limpia al leerla. */
  consumeDirty: () => boolean;
}

export function createLayer(width: number, height: number): Layer;
```

```ts
// lib/fps-meter.ts
export interface FpsMeter {
  /** Llamar una vez por frame desde el loop del motor. */
  tick: () => void;
  /**
   * Llamar desde el cuerpo de JugarClient en cada render (no desde un
   * efecto). Internamente incrementa un contador en un `useRef` — nunca
   * `setState` — para no generar el render que cuenta.
   */
  countReactRender: () => void;
  destroy: () => void;
}

/** Devuelve `null` si `?fps=1` no está presente: coste cero en uso normal. */
export function attachFpsMeter(container: HTMLElement): FpsMeter | null;
```

Convenciones que se mantienen del código existente: deltas en milisegundos en Frogger, Tetris y Snake; en segundos en Asteroids y Arkanoid. Este spec **no** unifica las unidades.

## Implementation plan

Cada paso deja el juego funcionando y es commiteable por separado.

1. Crear `lib/game-canvas.ts` con `createLayer()` y el helper de contexto opaco. Sin consumidores todavía.
2. Crear `lib/game-loop.ts` con `createGameLoop()`. Sin consumidores todavía.
3. Crear `lib/fps-meter.ts` con `attachFpsMeter()`, activado por `?fps=1`. Cablearlo en `JugarClient.tsx` (contador de renders) y en el loop de Frogger. **Verificación manual: abrir `/games/frogger/jugar?fps=1` y anotar la línea base de fps, ms/frame y renders/seg antes de optimizar nada.**
4. CSS: `gridscroll` pasa de `background-position` a `transform: translateY` en `app/globals.css`. Medir de nuevo con el overlay. Este paso solo por sí mismo debería mover la aguja en los 5 juegos.
5. CSS: aislamiento de `.crt-screen` frente al `mix-blend-mode` de su `::after`. Medir. **Si el blend sigue siendo caro, es una decisión visual y vuelve al usuario — no se quita el efecto por cuenta propia.**
6. Frogger: fondo estático a capa cacheada, invalidada en `setSkin`, `completeRound` y captura de meta.
7. Frogger: sacar el veteado de troncos de dentro de `glow()` y agregar culling de entidades fuera de pantalla.
8. Frogger: adoptar `createGameLoop` (corte real en pausa y game-over) y eliminar el garbage por frame (`beginGlow/endGlow`, arrays hoisteados, `rgba` de tortuga precomputados, strings de HUD cacheados, `ctx.font` hoisteado).
9. Asteroids: compactación in-place, bucles `for` en vez de `.forEach`, tabla de alphas para las partículas, menos `save()/restore()`, adoptar `createGameLoop`.
10. Tetris: grilla a capa cacheada, repintado por dirty flag, `ghostY()` calculado al mover o rotar, adoptar `createGameLoop`.
11. Arkanoid: cachear el rect del puntero, resolver los frames de sprite en `loadLevel`, campo de ladrillos a capa cacheada, adoptar `createGameLoop`.
12. Snake: tablero y grilla a capa cacheada, repintado por tick, adoptar `createGameLoop`.
13. React: `React.memo` en los 5 motores y en `TouchControls`, `useCallback` sobre `onGameOver`, handlers estables en `TouchControls` vía `data-control`.
14. Actualizar `references/implemented-games.md`.

## Acceptance criteria

- [x] `/games/<id>/jugar?fps=1` muestra un overlay con fps, ms/frame p50 y p95, y renders de React por segundo, en los 5 juegos.
- [x] Sin `?fps=1` el overlay no se monta y no se instala ningún contador (verificable: `attachFpsMeter` devuelve `null`).
- [x] Frogger sostiene 60 fps en desktop durante una ronda completa, medido con el overlay.
- [x] El p95 de ms/frame de Frogger baja al menos 50 % respecto de la línea base anotada en el paso 3.
- [x] En Frogger, el fondo (zonas, bocas de meta, líneas divisorias) se dibuja con un único `drawImage` por frame.
- [x] En Frogger, ninguna entidad con `col + width < 0` o `col > CANVAS_W` genera llamadas de dibujo.
- [x] Al pausar cualquiera de los 5 juegos no se programan nuevos frames (verificable: un `console.count` en el loop deja de subir).
- [x] Tras "FIN DEL JUEGO", ningún motor sigue dibujando detrás del modal.
- [x] Reanudar tras una pausa no produce ningún salto de simulación.
- [x] Los 5 canvas obtienen su contexto con `{ alpha: false }`.
- [x] Tetris no repinta el tablero en frames donde ninguna pieza se movió, rotó ni cayó.
- [x] Snake no repinta en frames donde no avanzó un tick.
- [x] Arkanoid no llama a `getBoundingClientRect()` dentro de `onMouseMove`.
- [x] `gridscroll` no anima ninguna propiedad de paint (verificable: el layer no aparece repintando en la pestaña Layers de DevTools).
- [x] Con el pad táctil visible, mantener ▼ en Tetris no dispara más renders de React que cambios de puntaje reales.
- [x] El contador de renders de `fps-meter` está implementado con `useRef` (grep: ningún `setState`/`useState` en su ruta de incremento).
- [x] Cada uno de los 5 juegos se ve **igual que antes** en las 3 skins: captura antes/después por juego y por skin, comparadas a ojo.
- [x] `npm run build` y `npm run lint` pasan sin errores nuevos.
- [x] `npm run check:skins` sigue pasando.

## Decisions

- **Sí:** helpers compartidos en `lib/` (`game-loop`, `game-canvas`, `fps-meter`). Los 5 motores repiten hoy el mismo esqueleto de rAF y el mismo error de no cancelarlo; con un solo módulo el próximo arreglo se hace una vez y no cinco.
- **No:** que cada motor resuelva lo suyo localmente. Se evaluó por legibilidad —cada `engine.ts` autocontenido— pero perpetúa cinco copias del mismo bug.
- **Sí:** cancelar el `rAF` de verdad en pausa y game-over. Hoy los 5 motores reprograman el frame y recién adentro hacen `return`, así que una partida terminada sigue despertando al compositor a 60 Hz hasta que se desmonta.
- **Sí:** sacar el veteado de los troncos de dentro de `glow()`. Es ~60 % de todas las operaciones con `shadowBlur` de Frogger y el cambio visual es imperceptible: el contorno del tronco conserva su brillo.
- **No:** bajar `shadowBlur` o quitar el glow de elementos secundarios. El usuario pidió explícitamente cambios imperceptibles; el glow es la identidad visual del juego. Si tras medir todavía falta, es una decisión suya, no de la implementación.
- **Sí:** overlay activable con `?fps=1` en cualquier build. Restringirlo a `NODE_ENV === "development"` impediría medir en un teléfono real contra el sitio desplegado, que es donde el problema más se nota.
- **Sí:** el overlay cuenta renders de React junto a los fps. La sospecha inicial fue que React era el problema principal; el contador la vuelve verificable en vez de opinable.
- **Sí:** animar `transform` en vez de `background-position` en `gridscroll`. Movimiento idéntico, pero pasa de repintar el viewport cada frame a ser una animación compositable.
- **No:** quitar los `mix-blend-mode` del fondo y del CRT. Son parte del look. Se intenta primero aislarlos; si no alcanza, se consulta.
- **No:** manejar `devicePixelRatio` en este spec. Cuadruplica el fill rate y sería contraproducente antes de bajar el costo de dibujo. Es candidato natural para el spec siguiente.
- **No:** arreglar acá el clamp de `dt`, el clumping de entidades y la fuga de `Audio`. Son bugs de comportamiento, no de rendimiento; el usuario los dejó explícitamente fuera. Quedan anotados con sus líneas exactas para que el spec que los tome no tenga que re-diagnosticarlos.
- **Sí:** conservar tal cual el patrón `callbacksRef` + deps `[inputRef]` de los 5 wrappers. Se auditó y es correcto: ningún loop se reinicia por cambios de estado. Este spec no lo toca.
- **Sí:** todo el estado nuevo de este spec (contador de renders, acumuladores de fps/ms-por-frame, dirty flags de las capas cacheadas) va en `useRef` o en closures de motor, nunca en `useState`. Pedido explícito del usuario: minimizar `useState` y usar `useRef` para evitar re-renders donde sea posible. Los dirty flags en particular viven dentro de `engine.ts` (fuera de React) y ya seguían este principio antes de que se pidiera.
- **No:** mover `score`/`lives`/`engineLevel` de `JugarClient.tsx` a un ref con escritura directa al DOM. Se consideró como forma más estricta de aplicar el mismo pedido, pero esos tres valores se muestran como texto en el HUD — sin `useState` no hay forma idiomática de que React los pinte. La mitigación real es contener el radio del render con `React.memo` (ya en el scope), no eliminar el `useState`.

## Risks

| Riesgo                                                                                                         | Mitigación                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un spec que toca 5 motores + CSS + React es difícil de revisar y de revertir en bloque.                        | Los 14 pasos son commiteables por separado y agrupados por juego. Cualquiera se revierte solo. El usuario aceptó el tamaño sabiendo esto.               |
| El repintado por dirty flag en Tetris y Snake puede dejar frames sin actualizar ante un cambio no contemplado. | La capa cacheada se invalida explícitamente en cada mutación de estado, y hay criterio de aceptación por juego. Ante la duda, invalidar de más.         |
| Cachear el fondo de Frogger puede desincronizarse al cambiar de skin.                                          | `setSkin` invalida la capa y fuerza repintado inmediato, igual que hoy llama a `draw()` directo (`engine.ts:643-649`).                                  |
| El aislamiento de `.crt-screen` podría alterar sutilmente cómo se ve el `multiply` de las scanlines.           | Comparación de capturas antes/después por juego y por skin, ya presente en los criterios de aceptación. Si cambia, se revierte el paso 5 y se consulta. |
| Sacar las vetas del tronco de `glow()` cambia el aspecto más de lo previsto.                                   | Es el único cambio visual deliberado del spec y está aislado en su propio paso (7). Se valida con captura antes/después en las 3 skins antes de seguir. |
| Medir sin línea base vuelve inverificables los criterios porcentuales.                                         | El paso 3 es explícitamente "medir y anotar" antes de tocar nada. El criterio del p95 depende de ese número.                                            |

## What is **not** in this spec

- Clamp de `dt` y manejo de `visibilitychange` (Frogger y Arkanoid mueren o tunelean al volver de una pestaña en segundo plano).
- Clumping de entidades en Frogger (`trackEnd` y el wrap de `dir === 1`).
- Fuga de `Audio` en Arkanoid.
- Soporte de `devicePixelRatio` en cualquier canvas.
- Proporción del marco CRT de Frogger en desktop.
- WebGL, `OffscreenCanvas` en worker, o motores de terceros.
- Juegos no registrados en `GAME_REGISTRY`.
- Cambios de balance, dificultad o velocidad.

Cada uno de esos, si se hace, va en su propio spec.
