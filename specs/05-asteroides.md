# SPEC 05 — Juego Asteroides (motor real embebido)

> **Status:** Aprobado
> **Depends on:** 02-home-landing
> **Date:** 2026-08-01
> **Objective:** Agregar "ASTEROIDES" como nuevo juego jugable del catálogo, portando el motor de canvas existente (`references/started-games/02-asteroids`) a un componente cliente que se enchufa en `/games/asteroides/jugar` mediante un registro genérico por id, manteniendo su HUD y controles originales dentro del canvas mientras notifica su estado (puntaje, vidas, nivel, pausa, fin) al HUD externo de React.

## Scope

**In:**

- Nueva entrada `"asteroides"` en `lib/games.ts` (`GAMES`): `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "yellow"`, `cover: "cover-rocas"` (reutiliza el estilo visual ya existente), `short`/`long` describiendo el juego portado, `best`/`plays` con valores placeholder consistentes con el resto del catálogo. La entrada `"rocas"` existente **no se modifica**.
- Motor del juego portado 1:1 desde `references/started-games/02-asteroids/game.js` a un módulo framework-agnostic (`components/games/asteroids/engine.ts`): mismas mecánicas (nave, asteroides, balas, partículas, power-up de disparo triple, niveles, vidas, invencibilidad temporal, wrap-around toroidal), mismo HUD y pantalla de "GAME OVER" dibujados dentro del canvas, sin cambios de balance ni de gameplay.
- El motor expone una API mínima para ser controlado desde React: función de creación que recibe el `canvas` y callbacks (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`), un método para pausar externamente el loop (`setPaused`), y una función de limpieza (`destroy`, cancela `requestAnimationFrame` y remueve listeners de teclado) para desmontar sin fugas.
- Nuevo componente cliente `components/games/asteroids/AsteroidsGame.tsx`: monta el `<canvas>` (resolución interna 800×600, escalado por CSS al contenedor `.crt-screen` existente, que ya es `aspect-ratio: 4/3`), instancia el motor en `useEffect`, reenvía la prop `paused` al motor, propaga los callbacks del motor hacia las props que le pasa la página, y limpia el motor al desmontar.
- Nuevo registro `components/games/registry.tsx`: mapa `id → componente de motor real` (por ahora solo `{ asteroides: AsteroidsGame }`), que mantiene cada juego aislado en su propio módulo.
- `app/games/[id]/jugar/page.tsx` consulta el registro: si el `id` está registrado, renderiza ese componente dentro del `.crt`/`.crt-screen` existente, alimenta la barra `player-hud` (puntaje, vidas, nivel) con los valores reales recibidos por callback, pasa el estado `paused` (botón "PAUSA" existente) como prop al motor, y dispara el modal de fin ("FIN DEL JUEGO") existente —con el puntaje real— cuando el motor notifica `onGameOver`, igual que hoy hace el botón "FIN" manual. El HUD y la pantalla de "GAME OVER" dibujados dentro del canvas **se mantienen visibles**; conviven con el HUD externo de React, ambos reflejando el mismo estado real.
- Si el `id` **no** está en el registro, la página conserva exactamente la simulación falsa actual (sin ningún cambio para los demás 7 juegos).

**Out of scope (para specs futuros):**

- Ocultar o quitar el HUD/"GAME OVER" que el canvas dibuja internamente — se decidió explícitamente mantener ambos HUD.
- Cualquier cambio a la entrada `"rocas"` o a su simulación falsa.
- Motores reales para los demás juegos del catálogo (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) — siguen con la simulación falsa vía el fallback del registro.
- Persistencia del puntaje en Supabase (guardar partidas, actualizar `best`, alimentar el Salón de la Fama con datos reales) — sigue con `seededScores` hardcodeado.
- Controles táctiles — el juego se controla solo con teclado (flechas + espacio), como el original.
- Hacer dinámicos por juego los tags de la página de detalle (`1 JUGADOR`, `TECLADO / TÁCTIL`, `RETRO 1985`) — siguen estáticos.
- Cualquier cambio de balance, niveles, power-ups o mecánicas respecto al `game.js` original.

## Data model

```ts
// components/games/registry.tsx
export interface GameEngineProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export const GAME_REGISTRY: Record<
  string,
  React.ComponentType<GameEngineProps>
> = {
  asteroides: AsteroidsGame,
};
```

```ts
// components/games/asteroids/engine.ts
export interface AsteroidsCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface AsteroidsEngineHandle {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks
): AsteroidsEngineHandle {
  /* ... */
}
```

`components/games/asteroids/AsteroidsGame.tsx` implementa `GameEngineProps` (mismas props que el registro) montando el `<canvas>` y delegando en `createAsteroidsEngine`.

No se agrega ningún store, contexto ni tabla en Supabase. El único dato nuevo en `lib/games.ts` es la entrada `"asteroides"` dentro del array `GAMES` existente (mismo tipo `Game`, sin cambios de esquema).

## Implementation plan

1. Portar `game.js` a `components/games/asteroids/engine.ts`: envolver la lógica actual (clases `Bullet`/`Asteroid`/`PowerUp`/`Ship`/`Particle`, loop, estado) en `createAsteroidsEngine(canvas, callbacks)`, reemplazando el `document.getElementById('canvas')` global por el `canvas` recibido, agregando llamadas a los callbacks donde cambian `score`, `lives`, `level` y cuando `state` pasa a `'gameover'`, y exponiendo `setPaused`/`destroy`. Mismo comportamiento visual y de gameplay que el original. El sistema sigue funcional: el módulo existe pero nada lo importa todavía.
2. Crear `components/games/asteroids/AsteroidsGame.tsx`: monta `<canvas width={800} height={600}>` con CSS para llenar `.crt-screen`, llama a `createAsteroidsEngine` en un `useEffect` (con cleanup que llama `destroy()`), y sincroniza la prop `paused` con `setPaused()` en otro `useEffect`. El sistema sigue funcional: el componente existe, sin consumidores todavía.
3. Crear `components/games/registry.tsx` con el mapa `GAME_REGISTRY` y el tipo `GameEngineProps`, registrando `asteroides: AsteroidsGame`. El sistema sigue funcional: el registro existe, `jugar/page.tsx` todavía no lo consulta.
4. Actualizar `app/games/[id]/jugar/page.tsx`: si `GAME_REGISTRY[id]` existe, renderizar ese componente en vez del `.game-arena` falso, pasándole `paused` y callbacks que actualizan el `score`/`lives`/`level` en el estado de la página y que, en `onGameOver`, invocan el mismo `endGame` que hoy dispara el botón "FIN". Si `GAME_REGISTRY[id]` no existe, se conserva el bloque actual sin cambios. El sistema queda funcional: `/games/asteroides/jugar` corre el juego real de punta a punta (aunque `asteroides` todavía no aparece en el catálogo hasta el paso 5), y el resto de `/games/<otro-id>/jugar` sigue igual que antes.
5. Agregar la entrada `"asteroides"` a `GAMES` en `lib/games.ts` (con los campos definidos en Scope), sin tocar la entrada `"rocas"`. El sistema queda funcional y este es el último paso ejecutable del spec: `asteroides` aparece en la Home, en `/games/asteroides` (detalle) y en el Salón de la Fama, y "JUGAR AHORA" lleva al motor real.
6. Pasada de QA: abrir `/games/asteroides/jugar`, confirmar que el juego corre con sus controles (flechas + espacio), que el HUD externo (puntaje/vidas/nivel) se actualiza en tiempo real junto con el HUD interno del canvas, que "PAUSA" detiene el loop del motor y "REANUDAR" lo reactiva, que perder la última vida dispara el modal "FIN DEL JUEGO" con el puntaje real (además del "GAME OVER" que ya dibuja el canvas), que "JUGAR DE NUEVO" reinicia una partida limpia, y que cualquier otro juego (p. ej. `/games/rocas/jugar`) sigue mostrando la simulación falsa sin cambios. Confirmar `npm run build` sin errores.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni ESLint.
- [ ] `GAMES` en `lib/games.ts` incluye una entrada `id: "asteroides"`, y la entrada `"rocas"` permanece sin cambios.
- [ ] `/games/asteroides` (detalle) muestra la ficha del juego usando los datos de la nueva entrada, con el botón "JUGAR AHORA" apuntando a `/games/asteroides/jugar`.
- [ ] `/games/asteroides/jugar` renderiza el motor real dentro del `.crt-screen`: nave, asteroides, balas, partículas y power-up de disparo triple, controlables con flechas (rotar/propulsar) y espacio (disparar).
- [ ] El HUD dibujado dentro del canvas (puntaje, nivel, vidas, "3x" del power-up) sigue visible, sin cambios respecto al original.
- [ ] El HUD externo (`player-hud`) refleja en tiempo real el puntaje, vidas y nivel reales del motor (no valores aleatorios).
- [ ] El botón "PAUSA"/"REANUDAR" del HUD externo detiene y reactiva el loop del motor.
- [ ] Al perder la última vida, el motor notifica el fin de partida y aparece el modal "FIN DEL JUEGO" del HUD externo con el puntaje final real, sin reemplazar el "GAME OVER" que el canvas dibuja internamente.
- [ ] "JUGAR DE NUEVO" en el modal reinicia una partida nueva del motor (puntaje, vidas y nivel vuelven a su estado inicial).
- [ ] Cualquier otro `id` de `GAMES` (p. ej. `/games/rocas/jugar`, `/games/gloton/jugar`) sigue mostrando exactamente la simulación falsa actual, sin cambios de comportamiento.
- [ ] Desmontar la página de juego (navegar a "SALIR" o "VOLVER AL VAULT") no deja el loop del motor corriendo en segundo plano ni listeners de teclado activos.
- [ ] No hay errores ni warnings en la consola del navegador al jugar una partida completa de `/games/asteroides/jugar`.

## Decisions

- **Sí:** portar el motor como módulo framework-agnostic (`engine.ts`) + wrapper de React (`AsteroidsGame.tsx`), en vez de usar un `<iframe>` o `next/script` cargando `game.js` tal cual. Permite que el motor notifique cambios de estado a React con callbacks tipados y que la pausa se controle desde afuera, algo que un iframe aislado no permite sin `postMessage`.
- **Sí:** mantener el HUD y la pantalla de "GAME OVER" dibujados dentro del canvas, en vez de suprimirlos a favor del HUD externo. Decisión explícita del usuario: "no vamos a borrar el hub del juego. Vamos a usar los dos" — ambos HUD coexisten y reflejan el mismo estado real.
- **Sí:** la pausa la controla el contenedor de React (el botón "PAUSA" del HUD externo), no un control interno del motor. El motor expone `setPaused()` para que la página decida cuándo pausar.
- **Sí:** registro por id (`components/games/registry.tsx`) en vez de una rama `if (id === "asteroides")` embebida en la página. Mantiene cada motor de juego aislado en su propio módulo y deja `jugar/page.tsx` genérica para futuros juegos.
- **Sí:** `"asteroides"` es una entrada nueva e independiente en `GAMES`, no una reutilización ni renombrado de `"rocas"`. Ambas conviven en el catálogo; `"rocas"` sigue con su simulación falsa.
- **Sí:** reutilizar la clase CSS `.cover-rocas` para el cover de `"asteroides"` en vez de crear una nueva, ya que el estilo visual (roca + nave) ya representa el tema del juego y evita CSS duplicado.
- **No:** persistencia del puntaje en Supabase. El proyecto sigue sin tablas (spec 04); guardar partidas reales requeriría esquema y probablemente autenticación, fuera de alcance.
- **No:** controles táctiles. Se mantiene el control original (solo teclado); no había pedido explícito de soporte móvil para este juego.
- **Definición rápida en las secciones finales** (Data model, Implementation plan, Acceptance criteria, Decisions, Risks), sin una ronda adicional de confirmación sección por sección — a pedido explícito del usuario ("sí continúa, crea y acepta el spec").

## Identified risks

- **Loop de `requestAnimationFrame` no limpiado correctamente:** si `destroy()` no cancela el frame pendiente o no remueve los listeners de `keydown`/`keyup` de `window` al desmontar, el motor podría seguir corriendo o interceptando teclas después de salir de `/games/asteroides/jugar`. Mitigado por la pasada de QA (paso 6) que valida específicamente este caso.
- **Conflicto de foco de teclado:** el motor original escucha `keydown` en `window` globalmente; si el usuario interactúa con los botones "PAUSA"/"FIN"/"SALIR" del HUD externo mientras juega, la tecla `Espacio` podría también activar el botón enfocado (comportamiento nativo del navegador) además de disparar. Riesgo aceptado; a revisar si se reporta como molesto.
- **Escalado del canvas 800×600 dentro de `.crt-screen` (`aspect-ratio: 4/3`):** al ser la misma proporción (800/600 = 4/3) no debería haber distorsión, pero el escalado CSS podría verse borroso en pantallas de alta densidad. Riesgo menor, aceptado para este spec.
