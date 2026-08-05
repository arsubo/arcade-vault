# SPEC 10 — Juego Anfibio (motor real embebido)

> **Status:** Draft
> **Depends on:** 09-snake
> **Date:** 2026-08-04
> **Objective:** Agregar "ANFIBIO" como juego jugable del catálogo, implementando desde cero un motor de cruce de carriles al estilo Frogger — carretera con coches, río con troncos, cinco nenúfares de meta — con HUD 100% externo de React y puntajes reales en Supabase.

## Scope

**In:**

- Fila nueva `"anfibio"` en `games` (migración SQL vía `mcp__supabase__apply_migration`): `title: "ANFIBIO"`, `cat: "ARCADE"`, `color: "green"`, `cover: "cover-anfibio"` (clase CSS nueva), `best: 15600`, `plays: "8.9K"`, `short: "Cruza la carretera y el río sin convertirte en papilla."`, `long: "Motor real de cruce de carriles: salta con las flechas entre los carriles de la carretera esquivando coches y camiones, sube a troncos para atravesar el río sin caer al agua, ocupa los cinco nenúfares de la orilla para completar cada nivel, y evita perder tus tres vidas en el intento."`. La entrada `"ranaria"` existente (fake, `cover-rana`) **no se modifica**.
- Nueva clase `.cover-anfibio` en `app/globals.css`: franja de carretera gris con líneas discontinuas amarillas en la mitad superior, franja de río azul con troncos marrones en la mitad inferior, y un punto verde de nenúfar como acento — visualmente distinta de `.cover-rana` (la que usa `"ranaria"`) para que ambas tarjetas no se vean idénticas en `/biblioteca`. Misma técnica que el resto de `.cover-*` (gradientes CSS puros vía `::before`/`::after`, sin imágenes).
- Motor implementado desde cero en `components/games/anfibio/engine.ts`: grilla de 12 columnas × 13 filas de 50px (canvas interno 600×650), 13 filas ordenadas de arriba hacia abajo: fila 0 = meta (5 nenúfares en las columnas 1, 3, 5, 7, 9), filas 1–5 = río (5 carriles con troncos), fila 6 = mediana segura (césped, sin obstáculos), filas 7–11 = carretera (5 carriles con coches/camiones), fila 12 = inicio (césped, posición de partida en columna 5). La rana se mueve por saltos discretos de una celda con las 4 flechas, con un cooldown de ~120ms entre saltos para ignorar repeticiones de tecla del sistema operativo.
- Carriles de carretera (filas 7–11): entidades de 1 celda (coche) o 2 celdas (camión) que se desplazan horizontalmente a velocidad y dirección propias del carril (dirección alternada por paridad de fila), reaparecen del lado opuesto al salir del tablero. Colisión rana-entidad en fila de carretera = muerte.
- Carriles de río (filas 1–5): troncos de 2 a 4 celdas que se desplazan horizontalmente igual que los carriles de carretera. Si la rana está en una fila de río y no está sobre un tronco, muere ahogada. Si está sobre un tronco, su posición horizontal se arrastra con la velocidad del tronco entre saltos; si el arrastre la saca de los límites del tablero, muere.
- Meta (fila 0): aterrizar en una columna con nenúfar vacío suma 50 puntos, marca ese nenúfar como ocupado y respawnea la rana en la posición de inicio (misma vida, conserva puntaje/nivel/nenúfares ya ocupados). Aterrizar en una columna sin nenúfar o en un nenúfar ya ocupado cuenta como muerte. Al ocupar los 5 nenúfares, el nivel se completa: `onLevelChange` sube en 1, los 5 nenúfares se vacían, la velocidad de todos los carriles aumenta (multiplicador `1 + 0.15 × (nivel − 1)`), y la rana respawnea en la posición de inicio.
- Puntaje de avance: la primera vez en la vida actual que la rana alcanza una fila estrictamente más cercana a la meta que su mejor fila alcanzada hasta ese momento, suma 10 puntos. Este "mejor fila" se reinicia a la fila de inicio cada vez que la rana pierde una vida o completa un nivel — evita farmear puntos saltando de un lado a otro sin avanzar.
- Muerte (colisión con coche, ahogamiento, arrastre fuera de límites por tronco, o aterrizaje inválido en la fila de meta): resta una vida, respawnea la rana en la posición de inicio, reinicia el rastreador de "mejor fila" a la fila de inicio; puntaje, nivel y nenúfares ya ocupados no se pierden. Al perder la tercera vida, `onGameOver` se dispara una sola vez con el puntaje real acumulado.
- El motor **no dibuja HUD dentro del canvas**: solo tablero (carretera, río, mediana, meta), coches/camiones, troncos y la rana. Score, vidas y nivel viven exclusivamente en el HUD externo de React (mismo criterio que Tetris y Snake).
- `onLivesChange` mapea directo a las vidas restantes (3→0). `onLevelChange` mapea directo al nivel explícito (1→∞, sin techo, mismo criterio que Snake). `onScoreChange` mapea directo al puntaje acumulado.
- Nuevo componente cliente `components/games/anfibio/AnfibioGame.tsx`: canvas 600×650 con letterboxing centrado dentro de `.crt-screen` (mismo criterio que `TetrisGame.tsx`/`SnakeGame.tsx`), siguiendo el patrón de `AsteroidsGame.tsx` (`callbacksRef`, `useEffect` de creación con cleanup que llama `destroy()`, `useEffect` que sincroniza `paused`).
- Registro `anfibio: AnfibioGame` en `components/games/registry.tsx`.
- `lib/real-games.ts` ya existe; este spec agrega `"anfibio"` a `REAL_GAME_IDS`, sin cambiar su forma.
- Controles: `↑`/`↓`/`←`/`→` para saltar una celda en la dirección presionada, sujeto al cooldown de salto.

**Out of scope (para specs futuros):**

- `revalidatePath` en `submitScore` — ya implementado de forma genérica desde el spec 08; cubre `"anfibio"` automáticamente, sin cambios en este spec.
- El guard de `rows[1]`/`rows[2]` en `SalonClient.tsx` para podios con menos de 3 puntajes — ya arreglado en el spec 07; cubre `"anfibio"` automáticamente, sin cambios en este spec.
- Recalcular `best`/`plays` en `games` a partir de `MAX(scores.score)`.
- Autenticación real, moderación de puntajes o rate limiting más allá de la validación mínima ya existente en `submitScore`.
- Motores reales para los demás juegos del catálogo (`bloque-buster`, `gloton`, `invasores`, `rocas`, `serpentina`, `duelo-pixel`, `caida`) — siguen con la simulación falsa vía el fallback del registro.
- Cualquier cambio a la entrada `"ranaria"`, a su simulación falsa, o a `.cover-rana`.
- Tortugas que se sumergen, power-ups (mosca dorada), cocodrilos disfrazados de nenúfar, temporizador por vida, o cualquier otra variante de dificultad — cubierto (si acaso) por el spec de extensión 11-anfibio-extension, nunca requerido por este spec.
- HUD u overlay dibujado dentro del canvas (temporizador visual, contador de nenúfares, etc.) — todo vive en el HUD externo de React.
- Sonido — no hay assets de audio para este juego.

## Data model

```sql
-- migración: fila nueva en public.games
insert into public.games (id, title, short, long, cat, cover, color, best, plays) values
  ('anfibio', 'ANFIBIO',
   'Cruza la carretera y el río sin convertirte en papilla.',
   'Motor real de cruce de carriles: salta con las flechas entre los carriles de la carretera esquivando coches y camiones, sube a troncos para atravesar el río sin caer al agua, ocupa los cinco nenúfares de la orilla para completar cada nivel, y evita perder tus tres vidas en el intento.',
   'ARCADE', 'cover-anfibio', 'green', 15600, '8.9K');
```

```ts
// lib/real-games.ts (ya existe; este spec agrega la línea de anfibio)
export const REAL_GAME_IDS = [
  "asteroides",
  "tetris",
  "arkanoid",
  "snake",
  "anfibio",
] as const;
```

```ts
// components/games/anfibio/engine.ts
export interface AnfibioCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface AnfibioEngineHandle {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

export function createAnfibioEngine(
  canvas: HTMLCanvasElement,
  callbacks: AnfibioCallbacks
): AnfibioEngineHandle {
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
  anfibio: AnfibioGame,
};
```

El contrato `GameEngineProps` (`paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) definido en `components/games/registry.tsx` no cambia.

## Implementation plan

1. Migración SQL que inserta la fila `"anfibio"` en `games`, vía `mcp__supabase__apply_migration`. El sistema sigue funcional: anfibio aparece en Home/biblioteca con la simulación falsa, como cualquier juego sin motor registrado.
2. Agregar `.cover-anfibio` en `app/globals.css`, junto a las demás clases `.cover-*`. El sistema sigue funcional, con la nueva cover visible en la tarjeta simulada.
3. Implementar `components/games/anfibio/engine.ts` con `createAnfibioEngine(canvas, callbacks)`: modelo de grilla 12×13 a 50px, definición de los 11 carriles (5 río, 5 carretera, mediana sin carril), spawner y movimiento de entidades (coches/camiones/troncos) con reaparición en el borde opuesto, detección de colisión por tipo de fila (carretera, río con/sin tronco bajo la rana, meta con nenúfar), manejo de input de salto por flechas con cooldown basado en timestamp, arrastre horizontal de la rana mientras está sobre un tronco, lógica de vidas/nivel/puntaje descrita en Scope, `setPaused`/`destroy` con el patrón de `engine-porting.md`. El sistema sigue funcional: el módulo existe, sin consumidores todavía.
4. Crear `components/games/anfibio/AnfibioGame.tsx`: canvas 600×650 con letterboxing centrado dentro de `.crt-screen` (mismo criterio que `TetrisGame.tsx`), instancia el motor en un `useEffect` con `callbacksRef` (patrón de `AsteroidsGame.tsx`), sincroniza `paused` en otro `useEffect`. El sistema sigue funcional: el componente existe, sin consumidores.
5. Registrar `anfibio: AnfibioGame` en `components/games/registry.tsx`. El sistema queda funcional: `/games/anfibio/jugar` corre el motor real (todavía no puede guardar puntaje, `"anfibio"` no está en el allowlist).
6. Agregar `"anfibio"` a `REAL_GAME_IDS` en `lib/real-games.ts`. Último paso ejecutable del spec: se puede jugar Anfibio de punta a punta, guardar un puntaje real, y verlo reflejado sin recargar en `/salon` y en `/games/anfibio` gracias al `revalidatePath` ya existente desde el spec 08.
7. Pasada de QA: `npm run build`; jugar una partida completa saltando con las 4 flechas por la mediana, el río y la carretera; confirmar que subirse a un tronco arrastra a la rana con su velocidad y que caer al río sin tronco resta una vida; confirmar que chocar con un coche o camión resta una vida; ocupar los 5 nenúfares y confirmar que el nivel sube, los nenúfares se vacían y los carriles se aceleran de forma perceptible; confirmar que aterrizar en una columna sin nenúfar o en uno ya ocupado resta una vida; perder una vida y confirmar que la rana respawnea en el inicio sin perder puntaje, nivel ni nenúfares ya ocupados; perder las 3 vidas y confirmar que dispara el modal "FIN DEL JUEGO" con el puntaje real, campo de nombre y "GUARDAR PUNTAJE"; guardar un puntaje y confirmar que aparece en `/salon` (tab "ANFIBIO") y en `/games/anfibio` sin recargar; confirmar que "PAUSA"/"REANUDAR" del HUD externo detiene y reactiva el loop; confirmar que ningún otro juego del catálogo tiene regresión visual ni de comportamiento; confirmar que no hay errores ni warnings en consola durante una partida completa; confirmar con `mcp__supabase__get_advisors` que no hay alertas de seguridad nuevas.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni ESLint.
- [ ] La tabla `games` contiene la fila `"anfibio"` tras la migración; `"ranaria"` permanece sin cambios.
- [ ] `/games/anfibio` (detalle) muestra la ficha usando la nueva entrada, con "JUGAR AHORA" apuntando a `/games/anfibio/jugar`.
- [ ] `/games/anfibio/jugar` renderiza el tablero real dentro de `.crt-screen` con letterboxing (canvas 600×650, sin distorsión), controlable con las 4 flechas mediante saltos discretos de una celda.
- [ ] El motor no dibuja HUD dentro del canvas — solo tablero, entidades de carretera/río y la rana.
- [ ] El HUD externo (`player-hud`) refleja en tiempo real el puntaje, las vidas (3→0) y el nivel reales del motor.
- [ ] Subirse a un tronco arrastra a la rana horizontalmente con la velocidad del tronco; caer al río sin tronco bajo la rana resta una vida.
- [ ] Chocar con un coche o camión en la carretera resta una vida.
- [ ] Aterrizar en un nenúfar vacío suma exactamente 50 puntos y lo marca como ocupado; aterrizar en la fila de meta fuera de un nenúfar vacío resta una vida.
- [ ] Avanzar a una fila nueva más cercana a la meta suma exactamente 10 puntos la primera vez por vida, sin volver a sumar por oscilar entre filas ya visitadas.
- [ ] Ocupar los 5 nenúfares sube el nivel, vacía los nenúfares y acelera de forma perceptible la velocidad de carretera y río.
- [ ] Perder una vida respawnea la rana en el inicio sin perder puntaje, nivel ni nenúfares ya ocupados.
- [ ] "PAUSA"/"REANUDAR" del HUD externo detiene y reactiva el loop del motor.
- [ ] Al perder la tercera vida, el motor notifica el fin de partida y aparece el modal "FIN DEL JUEGO" con el puntaje real, campo de nombre y "GUARDAR PUNTAJE".
- [ ] Un puntaje guardado en Anfibio aparece en `/salon` (tab "ANFIBIO") y en `/games/anfibio` **sin necesidad de recargar** la página.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva (tablero, puntaje, vidas, nivel y nenúfares vuelven a su estado inicial).
- [ ] Cualquier otro juego del catálogo sigue funcionando exactamente igual, sin regresión visual ni de comportamiento.
- [ ] Desmontar `/games/anfibio/jugar` no deja el loop del motor corriendo ni listeners de teclado activos.
- [ ] No hay errores ni warnings en la consola del navegador al jugar una partida completa.
- [ ] `mcp__supabase__get_advisors` no reporta alertas nuevas de seguridad.

## Decisions

- **Sí:** `id`/título = `anfibio`/`ANFIBIO`, distinto de `"ranaria"` (que permanece sin cambios) — mismo criterio que tetris/caida, arkanoid/bloque-buster y snake/serpentina: el juego real recibe un id nuevo, el sibling falso no se toca.
- **Sí:** `cat` = `ARCADE`, igual que `"ranaria"` (su sibling falso más cercano temáticamente), pese a que `ARCADE` ya es la categoría más poblada entre los juegos reales (arkanoid, snake) — la honestidad temática pesa más que el balance de catálogo, mismo criterio que asteroides reusando `SHOOTER` de rocas pese a ya tener otros shooters falsos.
- **Sí:** `color` = `green`, igual que `"ranaria"` — los cuatro colores (`cyan`, `yellow`, `magenta`, `green`) ya están usados exactamente una vez cada uno entre los juegos reales existentes, así que no hay uno "menos representado"; ante ese empate, se sigue el criterio de reusar el color del sibling falso más cercano (mismo patrón que los tres juegos reales anteriores).
- **Sí:** `.cover-anfibio` nueva en vez de reusar `.cover-rana` — evita el problema ya documentado con tetris/caida (tarjetas visualmente idénticas en `/biblioteca`) y sigue el criterio final de tetris y arkanoid (crear cover nueva), en vez del riesgo aceptado explícitamente por snake.
- **Sí:** grilla de 12×13 celdas de 50px (canvas interno 600×650, proporción ≈0.92) con letterboxing centrado dentro de `.crt-screen` — evita distorsionar la grilla estirándola a 4:3, mismo criterio que tetris (1:2) y snake (1:1).
- **Sí:** movimiento por salto discreto de una celda por pulsación de flecha, con cooldown de ~120ms basado en timestamp — a diferencia de snake (movimiento continuo por tick), Frogger es un juego de saltos puntuales; el cooldown evita saltos dobles por repetición de tecla del sistema operativo sin depender del framerate.
- **Sí:** la rana se arrastra horizontalmente con la velocidad del tronco mientras lo monta, en vez de quedar fija a la grilla horizontal mientras está en el río — fiel a la mecánica clásica de Frogger, y es lo que hace que "no ahogarse" sea un reto real.
- **Sí:** puntaje de avance (+10 la primera vez por vida que se alcanza una fila nueva más cercana a la meta) en vez de sumar en cada salto — evita que el jugador "farmee" puntos saltando de un lado a otro sin arriesgarse a cruzar.
- **Sí:** perder una vida conserva puntaje, nivel y nenúfares ya ocupados (solo reinicia posición y el rastreador de "mejor fila") — más indulgente que reiniciar el nivel entero, deja una partida más larga y jugable, mismo espíritu que la decisión de vidas de snake.
- **Sí:** completar un nivel acelera todos los carriles con el multiplicador `1 + 0.15 × (nivel − 1)` — progresión perceptible sin fórmula compleja, mismo espíritu que la aceleración por nivel de snake.
- **Sí:** niveles explícitos sin techo (`onLevelChange` 1→∞), igual criterio que snake.
- **Sí:** el motor no dibuja HUD dentro del canvas — solo tablero, entidades y rana; todo el HUD vive en React, mismo criterio que tetris y snake.
- **Sí:** sin temporizador por vida (a diferencia del Frogger clásico) — un temporizador visible requeriría dibujar algo dentro del canvas (rompiendo el criterio de "sin HUD en canvas" de tetris/snake) o inventar un quinto callback fuera del contrato `GameEngineProps`, que no se toca por juego. Queda como candidato explícito para el spec de extensión.
- **Sí:** sin tortugas que se sumergen, power-ups, ni cocodrilos disfrazados de nenúfar en este spec — mantienen el motor base simple y jugable de punta a punta; quedan en el spec de extensión 11-anfibio-extension como variante opcional, nunca requerida.
- **Sí:** sin `restart()` en el handle del motor — "JUGAR DE NUEVO" remonta el componente vía `key` (mismo patrón que asteroides, tetris, arkanoid y snake).
- **Sí:** `revalidatePath` y el guard de podio de `SalonClient.tsx` quedan fuera de este spec porque ya están implementados de forma genérica desde los specs 07 y 08 — cubren `"anfibio"` sin cambios adicionales.
- **No:** sonido — no hay assets de audio para este juego.
- **No:** recalcular `best`/`plays` desde `MAX(scores.score)`, autenticación, moderación o rate limiting — mismos límites que specs anteriores.
- **No:** cambios a `"ranaria"`, su simulación falsa, o a `.cover-rana`.

## Identified risks

- **Cover nueva sin colisión visual:** al crear `.cover-anfibio` distinta de `.cover-rana`, se evita el riesgo ya documentado en tetris — sin riesgo pendiente aquí, mencionado solo como contraste con la decisión de snake.
- **Loop de `requestAnimationFrame` o listeners no limpiados al desmontar:** mismo riesgo que los specs 05, 07, 08 y 09; mitigado por la pasada de QA que verifica explícitamente este caso.
- **Letterboxing dentro de `.crt-screen`:** el canvas 600×650 (≈0.92) no llena el marco 4:3 completo, dejando un margen menor a los lados — riesgo estético aceptado, más leve que el de tetris (1:2).
- **Balance de velocidad y cooldown de salto:** la fórmula de aceleración por nivel y el cooldown de ~120ms entre saltos son valores iniciales sin playtesting extenso — si el juego resulta injugable o demasiado permisivo, es un ajuste de constantes en `engine.ts`, no un cambio de arquitectura; a revisar en la pasada de QA.
- **Colisión aproximada por celdas en los bordes del tablero:** coches/camiones/troncos que reaparecen en el borde opuesto pueden solaparse visualmente por un frame con el límite del canvas antes de reposicionarse — riesgo estético menor, mismo tipo de gotcha que las colisiones AABB de arkanoid.
- **Policy de insert abierta en `scores` (heredada del spec 06):** cualquiera con la publishable key puede insertar puntajes de `"anfibio"` sin pasar por una partida real; mismo riesgo aceptado que los otros cuatro juegos reales, ahora extendido a un quinto `game_id`.
