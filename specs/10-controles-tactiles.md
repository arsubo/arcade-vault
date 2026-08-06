# SPEC 10 — Controles táctiles y layout móvil en `/jugar`

> **Status:** Aprobado
> **Depends on:** 05-asteroides, 07-tetris, 08-arkanoid, 09-snake
> **Date:** 2026-08-05
> **Objective:** Hacer jugables los 4 juegos reales en pantalla táctil, agregando `setVirtualKey` al contrato de motores, un pad táctil único e idéntico para los 4 juegos debajo del marco CRT, y un HUD compacto de una franja en móvil.

## Scope

**In:**

- Extensión del contrato en `components/games/types.ts`:
  - `GameEngineHandle` gana `setVirtualKey(code: string, down: boolean): void`.
  - `GameEngineProps` gana `inputRef: RefObject<VirtualInput | null>` — canal por el que cada wrapper publica el `setVirtualKey` de su motor hacia `JugarClient`, sin provocar re-renders (mismo espíritu que el `engineRef` que ya usan los wrappers).
  - Nuevo tipo `VirtualInput { setVirtualKey(code: string, down: boolean): void }`.
- `setVirtualKey` implementado en los 4 motores, ruteando al **mismo estado** que ya alimenta su listener de teclado (no se duplica lógica de juego):
  - `asteroids/engine.ts` → escribe `keys[code]` / `justPressed[code]` exactamente como `onKeyDown`/`onKeyUp`.
  - `arkanoid/engine.ts` → escribe `keys[key]` (nota: arkanoid indexa por `e.key`, no por `e.code`; el motor traduce `"ArrowLeft"`/`"ArrowRight"`, que coinciden en ambos).
  - `tetris/engine.ts` → en `down === true` ejecuta la misma rama del `switch` de `onKeyDown`; ignora `down === false`.
  - `snake/engine.ts` → en `down === true` aplica la misma lógica de `KEY_TO_DIRECTION` + guard de 180°; ignora `down === false`.
- Nuevo módulo `lib/touch-controls.ts`: mapa `GAME_TOUCH_CONTROLS` con el binding de los 6 controles para cada uno de los 4 `REAL_GAME_IDS`. Es la fuente única de qué código dispara cada botón y de si el control se mantiene, se toca o se repite.
- Nuevo componente cliente `components/games/TouchControls.tsx`: pinta el pad (d-pad de 4 direcciones + botones A y B) a partir del binding del juego, maneja `pointerdown`/`pointerup`/`pointercancel`/`pointerleave` con **multi-touch real** (varios punteros simultáneos: girar + propulsar + disparar a la vez en asteroides), auto-repeat para los controles marcados `repeat`, y llama a `inputRef.current?.setVirtualKey(...)`.
- `JugarClient.tsx`:
  - crea el `inputRef` y lo pasa a `<EngineComponent>`;
  - renderiza `<TouchControls>` debajo del `.crt` solo cuando el juego está registrado (`GAME_REGISTRY[game.id]`);
  - agrega el menú `⋮` del HUD compacto (estado local, cierra al elegir opción o al tocar fuera), que contiene `SKIN`, `PAUSA`, `FIN` y `SALIR`.
- CSS en `app/globals.css`:
  - `.touch-pad` y sus partes, ocultas por defecto y visibles solo bajo `@media (pointer: coarse)`;
  - HUD compacto de una franja bajo `@media (max-width: 720px)`;
  - el `.crt-screen` acotado en alto para que HUD + CRT + pad entren sin scroll en portrait y en landscape (unidades `dvh`);
  - `touch-action: none`, `user-select: none`, `-webkit-tap-highlight-color: transparent` y `overscroll-behavior: contain` sobre el pad, para que arrastrar el dedo no scrollee ni haga zoom la página.
- Los 4 wrappers (`AsteroidsGame.tsx`, `TetrisGame.tsx`, `ArkanoidGame.tsx`, `SnakeGame.tsx`) publican `inputRef.current = { setVirtualKey: engine.setVirtualKey }` en su `useEffect` de montaje y lo limpian a `null` en el cleanup.
- Actualización de `references/implemented-games.md` con una columna o nota de qué controles táctiles expone cada juego.

**Out of scope (para specs futuros):**

- Layout móvil del resto del sitio: `Nav` (en la captura "ARCADE VAULT" queda pisado por "Iniciar Sesión" — bug real, confirmado, pero fuera de este spec), home, `/biblioteca`, `/salon`, `/games/[id]`, `/acerca-de`, `/auth`.
- Los juegos **no** registrados en `GAME_REGISTRY` (`bloque-buster`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`, `caida`, `serpentina`): siguen con la simulación falsa y **no** reciben pad táctil.
- Gestos (swipe, pinch) y control por acelerómetro.
- Arrastre del dedo sobre el canvas para mover la paleta de arkanoid — la paleta se mueve con `◀`/`▶` del pad, igual que con teclado.
- Menú de selección de nivel de arkanoid (el `click` sobre el canvas en pausa): sigue dependiendo del `click` sintético que emiten los navegadores móviles al tocar; no se le agrega manejo táctil dedicado.
- API de pantalla completa (`requestFullscreen`), bloqueo de orientación (`screen.orientation.lock`) y PWA/instalable.
- Vibración háptica (`navigator.vibrate`) al pulsar un control.
- Remapeo de controles por el usuario, y cualquier persistencia de preferencias del pad.
- Cambios a los motores más allá de `setVirtualKey`: ni balance, ni velocidad, ni dificultad ajustada a móvil.

## Data model

```ts
// components/games/types.ts — el contrato existente gana dos piezas
export interface VirtualInput {
  /** Mismo `KeyboardEvent.code` que usan los listeners de teclado del motor. */
  setVirtualKey: (code: string, down: boolean) => void;
}

export interface GameEngineHandle {
  setPaused: (paused: boolean) => void;
  setSkin: (skin: SkinId) => void;
  /**
   * Input virtual del pad táctil. Rutea al MISMO estado que el listener de
   * teclado del motor — nunca duplica lógica de juego.
   */
  setVirtualKey: (code: string, down: boolean) => void;
  destroy: () => void;
}

export interface GameEngineProps {
  paused: boolean;
  skin: SkinId;
  /** El wrapper publica acá el `setVirtualKey` de su motor; `null` al desmontar. */
  inputRef: RefObject<VirtualInput | null>;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

```ts
// lib/touch-controls.ts — fuente única del mapeo control → tecla
import type { RealGameId } from "@/lib/real-games";

export type TouchControlId = "up" | "down" | "left" | "right" | "a" | "b";

export const TOUCH_CONTROL_IDS = [
  "up",
  "down",
  "left",
  "right",
  "a",
  "b",
] as const;

export interface TouchControlBinding {
  /** `KeyboardEvent.code` a emitir. `null` = control inerte (visible y atenuado). */
  code: string | null;
  /**
   * `hold` → el motor consulta la tecla por frame: se emite `down` al tocar y
   *          `up` al soltar.
   * `tap`  → acción discreta: se emite un único `down` al tocar (el motor
   *          ignora el `up`).
   */
  mode: "hold" | "tap";
  /** Solo para `tap`: repetir mientras el dedo sigue apoyado. */
  repeat?: boolean;
  /** Etiqueta accesible (`aria-label`). */
  label: string;
}

export type GameTouchControls = Record<TouchControlId, TouchControlBinding>;

export const GAME_TOUCH_CONTROLS: Record<RealGameId, GameTouchControls>;
```

Bindings concretos (el layout es idéntico en los 4 juegos; solo cambia qué hace cada botón):

| Control | `asteroides`                  | `tetris`                          | `snake`                    | `arkanoid`                  |
| ------- | ----------------------------- | --------------------------------- | -------------------------- | --------------------------- |
| `up`    | `ArrowUp` hold, Propulsar     | `ArrowUp` tap, Rotar              | `ArrowUp` tap, Arriba      | — inerte                    |
| `down`  | — inerte                      | `ArrowDown` tap+repeat, Bajar     | `ArrowDown` tap, Abajo     | — inerte                    |
| `left`  | `ArrowLeft` hold, Girar izq.  | `ArrowLeft` tap+repeat, Izquierda | `ArrowLeft` tap, Izquierda | `ArrowLeft` hold, Izquierda |
| `right` | `ArrowRight` hold, Girar der. | `ArrowRight` tap+repeat, Derecha  | `ArrowRight` tap, Derecha  | `ArrowRight` hold, Derecha  |
| `a`     | `Space` tap+repeat, Disparar  | `Space` tap, Caída rápida         | — inerte                   | — inerte                    |
| `b`     | — inerte                      | `KeyX` tap, Rotar                 | — inerte                   | — inerte                    |

Auto-repeat: primer disparo inmediato, luego espera 220 ms y repite cada 90 ms mientras el dedo siga apoyado.

`lib/real-games.ts` gana un tipo exportado, sin cambiar su valor:

```ts
export type RealGameId = (typeof REAL_GAME_IDS)[number];
```

## Implementation plan

1. **Contrato.** En `components/games/types.ts` agregar `VirtualInput`, `setVirtualKey` a `GameEngineHandle` e `inputRef` a `GameEngineProps`. En `lib/real-games.ts` exportar el tipo `RealGameId`. El build rompe a propósito hasta el paso 3 (los 4 motores y wrappers todavía no cumplen el contrato) — es el único punto del plan donde el sistema no queda funcional, y se cierra en dos pasos.
2. **Motores.** Implementar `setVirtualKey` en los 4 `engine.ts`, refactorizando cada `onKeyDown`/`onKeyUp` para que delegue en la misma función interna que usará el input virtual (una sola ruta de código por motor). Ningún comportamiento de teclado cambia.
3. **Wrappers.** Los 4 `*Game.tsx` aceptan `inputRef`, lo pueblan en el `useEffect` de montaje con `{ setVirtualKey: engine.setVirtualKey }` y lo limpian a `null` en el cleanup. `JugarClient` crea el `useRef` y lo pasa. Sistema funcional otra vez: todo compila y se juega igual que hoy con teclado, sin UI nueva.
4. **Mapeo.** Crear `lib/touch-controls.ts` con `GAME_TOUCH_CONTROLS` y sus tipos. Sistema funcional, sin consumidores todavía.
5. **Pad.** Crear `components/games/TouchControls.tsx`: recibe `gameId` e `inputRef`, resuelve el binding, pinta el d-pad y los botones A/B, y maneja `pointerdown`/`pointerup`/`pointercancel`/`pointerleave` con `setPointerCapture` y un `Map<pointerId, TouchControlId>` para soportar varios dedos a la vez. Un control con `code: null` se pinta atenuado, con `aria-disabled` y sin handlers. Al desmontar (o al pasar `paused`), suelta todas las teclas que quedaron en `down` y cancela los timers de repeat.
6. **Montaje del pad.** `JugarClient` renderiza `<TouchControls>` justo debajo del `.crt`, solo si `isRegistered`. Con el CSS del paso 7 aún ausente el pad se ve en cualquier viewport; es un estado intermedio de un solo paso.
7. **CSS del pad.** En `app/globals.css`: `.touch-pad` con `display: none` por defecto y `display: flex` bajo `@media (pointer: coarse)` (el d-pad interno, `.touch-dpad`, es el que usa `display: grid` en una cruz de 3×3); `touch-action: none`, `user-select: none`, `-webkit-tap-highlight-color: transparent`, `overscroll-behavior: contain`; estilo coherente con `.btn` y con las variables `--skin-*` ya existentes, para que el pad cambie de color junto con la skin (`--skin-accent` para el d-pad y el botón `B`, `--skin-accent2` para el botón `A` como acento de la acción principal). Área táctil de `--touch-btn-size: clamp(56px, 15vw, 64px)` — nunca por debajo del mínimo de 56px del criterio de aceptación, pero se achica con el viewport en pantallas angostas en vez de quedar fijo; `padding` y `gap` del pad y sus grupos (`.touch-dpad`, `.touch-actions`) también en `clamp()` por el mismo motivo. `.touch-pad` usa `flex-wrap: wrap; justify-content: center;` como resguardo: si el d-pad y los botones A/B no entran lado a lado (pantallas muy angostas o landscape muy bajo), se apilan centrados en dos filas en vez de desbordar el margen horizontal. Sistema funcional: el juego se controla con el dedo en un teléfono real y sigue igual en escritorio.
8. **HUD compacto.** En `JugarClient` agregar el menú `⋮` (estado local, `aria-expanded`, cierre al elegir opción y al tocar fuera) que agrupa `SKIN`, `PAUSA`, `FIN` y `SALIR`; en `app/globals.css`, bajo `@media (max-width: 720px)`, colapsar `.player-hud` a una sola franja con puntuación, vidas y nivel, y mostrar el `⋮` en vez de los botones sueltos. En ≥721px el HUD queda exactamente como hoy.
9. **Alto de la pantalla.** Acotar el `.crt-screen` en móvil para que HUD + CRT + pad entren sin scroll: en `@media (pointer: coarse)`, `width: min(100%, calc(var(--crt-max-h) * 4 / 3)); margin-inline: auto;` con `--crt-max-h` distinto en portrait y en landscape. El `aspect-ratio: 4/3` y el letterboxing interno de cada juego no se tocan.
10. **Docs.** Actualizar `references/implemented-games.md` con los controles táctiles de cada juego.
11. **QA.** `npm run build`; `npm run check:skins`. En escritorio: jugar los 4 juegos con teclado y confirmar cero regresión y que el pad no aparece. En un teléfono real (`http://<ip-lan>:3000`) y en la emulación táctil de DevTools: jugar los 4 de punta a punta con el pad, en portrait y en landscape; confirmar multi-touch en asteroides (girar + propulsar + disparar simultáneos); confirmar que arrastrar el dedo sobre el pad no scrollea ni hace zoom la página; confirmar que el menú `⋮` abre, pausa, cambia skin y sale; guardar un puntaje desde el móvil y verlo en `/salon`; confirmar que al desmontar `/jugar` no queda ninguna tecla virtual trabada ni timer de repeat corriendo; consola sin errores ni warnings.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni ESLint.
- [ ] `npm run check:skins` sigue pasando sin infractores nuevos.
- [ ] En escritorio (puntero fino) el pad táctil **no** se renderiza visible y los 4 juegos se controlan con teclado exactamente como antes de este spec.
- [ ] En un dispositivo táctil, `/games/asteroides/jugar`, `/games/tetris/jugar`, `/games/arkanoid/jugar` y `/games/snake/jugar` muestran el pad debajo del marco CRT, con el **mismo layout** (d-pad + A + B) en los cuatro.
- [ ] Los controles que un juego no usa se ven atenuados, no responden al toque y no emiten ninguna tecla.
- [ ] Cada control emite el `code` declarado en `GAME_TOUCH_CONTROLS` y produce en el juego el mismo efecto que su tecla equivalente.
- [ ] En asteroides se puede girar, propulsar y disparar **al mismo tiempo** con tres dedos.
- [ ] Mantener apoyado `◀`/`▶`/`▼` en tetris repite el movimiento; mantener `A` en asteroides dispara de forma sostenida sin superar la cadencia de `tryShoot()`.
- [ ] Soltar el dedo, sacarlo del botón, o que el navegador cancele el puntero, libera la tecla: ningún control queda trabado en `down`.
- [ ] Arrastrar el dedo sobre el pad no scrollea la página, no hace zoom ni selecciona texto.
- [ ] En un viewport de 720px o menos el HUD ocupa una sola franja con puntuación, vidas y nivel, y `SKIN`/`PAUSA`/`FIN`/`SALIR` viven detrás del menú `⋮`.
- [ ] Desde el menú `⋮` se puede pausar, reanudar, cambiar de skin, terminar la partida y salir del juego.
- [ ] En un teléfono en portrait, HUD + pantalla del juego + pad entran en la ventana **sin scroll vertical**; en landscape tampoco hay scroll.
- [ ] En viewports de 721px o más el HUD se ve exactamente igual que antes de este spec.
- [ ] Se puede jugar una partida completa desde el móvil, perder las vidas, guardar el puntaje con nombre y verlo en `/salon` y en `/games/<id>`.
- [ ] Desmontar `/jugar` no deja teclas virtuales activas, timers de auto-repeat corriendo ni listeners sin remover.
- [ ] No hay errores ni warnings en consola durante una partida completa en móvil.

## Decisions

- **Sí:** input virtual como **contrato explícito** (`setVirtualKey` en `GameEngineHandle` + `inputRef` en `GameEngineProps`), en vez de sintetizar `KeyboardEvent` sobre `document` — mismo criterio que la skin: el dato baja tipado hasta el motor, nunca implícito por el DOM.
- **Sí:** `setVirtualKey` habla el mismo vocabulario que el teclado (`KeyboardEvent.code`) y rutea al mismo estado interno, para que no existan dos caminos de código con reglas distintas.
- **Sí:** `inputRef` (ref mutable) en vez de un callback `onInputReady` — no dispara re-renders y calca el patrón `engineRef` que los wrappers ya usan.
- **Sí:** **un único layout de pad idéntico en los 4 juegos** (d-pad + A + B), con los controles no usados visibles pero atenuados e inertes — decisión explícita del usuario: memoria muscular constante entre juegos por encima de la prolijidad de ocultarlos.
- **Sí:** el pad va **debajo del marco CRT**, en franja sólida — decisión explícita del usuario: no tapa el juego, a cambio de una pantalla más chica en portrait.
- **Sí:** visibilidad automática por `@media (pointer: coarse)` en CSS puro, sin detección por JS — evita cualquier desajuste de hidratación y no agrega una decisión más para el usuario.
- **Sí:** sin bloquear ni sugerir orientación: portrait y landscape se soportan los dos.
- **Sí:** HUD compacto en una sola franja con `SKIN`/`PAUSA`/`FIN`/`SALIR` detrás de `⋮` bajo 720px — decisión explícita del usuario a partir de su captura, donde el HUD actual empuja el CRT fuera de la primera pantalla.
- **Sí:** `Pointer Events` (no `Touch Events`) con `setPointerCapture` y un `Map` por `pointerId` — es la única forma limpia de tener varios controles apretados a la vez, y cubre mouse, dedo y lápiz con un solo camino de código.
- **Sí:** auto-repeat solo en los controles declarados `repeat` (movimiento de tetris y disparo de asteroides), 220 ms de espera + 90 ms de intervalo. En asteroides es seguro porque `tryShoot()` ya limita la cadencia con `shootCooldown = 0.2`.
- **Sí:** arkanoid mueve la paleta con `◀`/`▶` del pad y **no** con arrastre sobre el canvas — mantiene el layout idéntico entre juegos y evita tocar el input por `mousemove` del motor.
- **Sí:** tamaño de botón, `padding` y `gap` del pad en `clamp()` (piso de 56px) en vez de px fijos, con `flex-wrap: wrap; justify-content: center;` como resguardo — decisión explícita del usuario tras ver que el d-pad y los botones A/B, con tamaños fijos, se salían del margen horizontal en pantallas angostas. El pad se achica de forma continua con el viewport y, si aun así no entra todo en una fila, el d-pad y el grupo A/B se apilan centrados en dos filas en vez de desbordar.
- **Sí:** botón `A` en `--skin-accent2` (magenta/segundo acento de la skin) para diferenciarlo como la acción principal; `B` y el d-pad quedan en `--skin-accent` — puramente estético, no cambia el binding de ningún control.
- **No:** gestos (swipe/pinch) ni acelerómetro — el usuario eligió botones.
- **No:** fullscreen, bloqueo de orientación, PWA ni vibración háptica — cada uno merece su propio spec si hace falta.
- **No:** pad para los juegos sin motor real — la simulación falsa no tiene input que controlar.
- **No:** arreglar el `Nav` pisado en móvil ni el resto del sitio — el usuario acotó el alcance a `/jugar`; queda anotado como bug conocido para otro spec.
- **No:** remapeo de controles ni persistencia de preferencias del pad.

## Identified risks

- **El paso 1 rompe el build a propósito.** Agregar `setVirtualKey` e `inputRef` al contrato invalida los 4 motores y los 4 wrappers hasta el paso 3. Es el único tramo no funcional del plan; mitigado porque son dos pasos mecánicos y consecutivos, y porque el orden inverso (motores primero) obligaría a tipos temporales.
- **Teclas trabadas en `down`.** Si el navegador cancela un puntero (llamada entrante, gesto del sistema, `pointercancel`) sin emitir `pointerup`, un control `hold` podría quedar presionado para siempre — en asteroides eso es la nave girando sola. Mitigado escuchando `pointercancel`/`pointerleave` y soltando todas las teclas al desmontar, al pausar y al perder visibilidad la página; verificado en QA.
- **Alto disponible en landscape.** En un teléfono en horizontal quedan ~360 px de alto para HUD + CRT 4:3 + pad; el criterio de "sin scroll" puede dejar la pantalla del juego muy chica. Riesgo estético aceptado; el spec acota el alto con `dvh` y deja el ajuste fino de `--crt-max-h` a la pasada de QA.
- **`100vh` vs barras del navegador móvil.** En iOS Safari y Chrome Android la barra de direcciones cambia el alto visible; por eso el spec usa `dvh` y no `vh`. Si algún navegador objetivo no lo soporta, el fallback es scroll — degradación aceptable, no rotura.
- **Doble camino de input en tetris y snake.** Ambos motores procesan acciones discretas dentro del listener de teclado; el refactor a una función interna compartida es donde más fácil se cuela una regresión de teclado. Mitigado por el criterio de "una sola ruta de código por motor" y por el QA de escritorio con los 4 juegos.
- **`(pointer: coarse)` en híbridos.** Una laptop táctil o un tablet con teclado puede reportar puntero grueso y mostrar el pad sin que haga falta, o al revés. Riesgo aceptado: el teclado sigue funcionando siempre, así que el peor caso es un pad de más o de menos, nunca un juego injugable.
- **Menú `⋮` y pausa.** Al mandar `PAUSA` detrás del menú, pausar pasa de un toque a dos. Es la elección explícita del usuario para ganar espacio vertical; si en la práctica molesta, la corrección barata es sacar `PAUSA` del menú a la franja.
