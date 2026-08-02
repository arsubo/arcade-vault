---
name: add-game
description: Diseña el spec para agregar un juego jugable con leaderboard real a Arcade Vault. Portea un motor desde references/started-games o planifica uno nuevo, y cubre la fila en la tabla games, el registro de motores, el allowlist de puntajes y el cableado del leaderboard en /salon y en la ficha de detalle. Úsala antes de /spec-impl al sumar un juego al catálogo.
disable-model-invocation: true
argument-hint: "<slug-del-juego> [carpeta en references/started-games]"
---

# /add-game — Generador de specs para juegos con leaderboard

Esta skill produce el spec para agregar un nuevo juego jugable al catálogo de Arcade Vault, con motor real y puntajes reales en Supabase. **No escribes código aquí.** Tu trabajo es entender el juego de origen (o su diseño desde cero), hacer las preguntas de integración que el resto de la plataforma exige, y dejar `specs/NN-<slug>.md` listo para que `/spec-impl` lo ejecute.

## Filosofía

Agregar "asteroides" (spec 05) fue una exploración desde cero: portar un `game.js` global a un motor controlable, engancharlo a un registro, guardar puntajes reales, cablear `/salon` y la ficha de detalle. Ese camino ya está resuelto y documentado — no hace falta redescubrirlo por cada juego nuevo. Esta skill lo convierte en un flujo de preguntas + un plan de implementación casi determinista.

Antes de escribir una sola sección del spec, lee `references/platform-integration.md` (los puntos exactos de la plataforma que cualquier juego nuevo toca) y, si vas a portar un juego existente, `references/engine-porting.md` (la receta de porteo y los gotchas ya identificados de `03-tetris` y `04-arkanoid`). `spec-skeleton.md`, en el mismo directorio que este archivo, adapta el formato de spec del repo a un spec de juego — dale una lectura para tener la plantilla en mente. Y justo antes de escribir, en Fase 4, vuelve a leer `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` — son la fuente de verdad del formato; `spec-skeleton.md` no los reemplaza.

## Flujo

Sigue las 4 fases en orden. No saltes fases. Responde siempre en el idioma del prompt inicial (el contenido de este proyecto está en español, así que por defecto responde en español).

### Fase 1 — Contexto

Antes de preguntar nada sobre el juego, reúne el estado actual del repo:

1. Lee `CLAUDE.md` y `AGENTS.md` en la raíz — confirman el stack (Next.js 16, React 19, Tailwind v4) y que hay que consultar `node_modules/next/dist/docs/` antes de asumir APIs.
2. Lista `specs/` para determinar el siguiente número secuencial y lee los dos specs más recientes para heredar sus convenciones.
3. Lee `components/games/registry.tsx` para ver qué motores ya están registrados (hoy solo `asteroides`).
4. Comprueba si existe `lib/real-games.ts`. Si **no existe**, el spec debe incluir como primer paso el refactor que lo crea (ver "El refactor del allowlist" en `references/platform-integration.md`). Si **ya existe**, ese paso se omite — el plan arranca directo en la migración de Supabase.
5. Lista `references/started-games/` para saber qué carpetas de origen hay disponibles (`02-asteroids` ya portado, más las que existan).

### Fase 2 — Origen del juego

Determina cuál de los dos caminos aplica:

**Camino A — Porteo desde `references/started-games/<carpeta>`.** Si el usuario indicó una carpeta (por el argumento o porque la nombra en la conversación), léela completa: `game.js`, `index.html`, y cualquier `.css` o archivo adicional. Levanta un inventario explícito antes de seguir:

- Dimensiones del canvas y si su proporción es 4:3 o no.
- Constantes y globals de módulo (tuning, tablas, colores).
- Referencias DOM del HUD (`getElementById` de spans/overlays) — indican qué debe convertirse en callback.
- Todos los listeners y su target (`window`, `document`, o el propio `canvas`).
- Forma del loop: si guarda el id de `requestAnimationFrame`, cómo pausa hoy (flag vs `cancelAnimationFrame`), si arranca sincrónico o dentro de un callback de carga de assets.
- Assets externos (imágenes, audio) y sus rutas relativas.
- Archivos adicionales que comparten globals con `game.js` (como `levels.js` en arkanoid).

Usa `references/engine-porting.md` para traducir ese inventario a los pasos concretos del plan — ahí está la receta general y las notas específicas de `03-tetris` y `04-arkanoid` si son la carpeta en cuestión.

**Camino B — Juego nuevo, sin código de origen.** Pregunta: mecánica central en una frase, controles, cómo sube el puntaje, si hay vidas, si hay niveles, y la condición de fin de partida. El resto del flujo es igual; en el plan de implementación el paso del motor se describe como "implementar" en vez de "portar".

### Fase 3 — Preguntas de clarificación

Bloques de 3 a 5 preguntas, con recomendación explícita cuando ofrezcas opciones. Directo, sin rodeos — quien invocó esta skill quiere que preguntes. Cubre siempre:

1. **Metadata de catálogo.** `title`, `cat` (`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`), `color` (`cyan`/`magenta`/`yellow`/`green`), y valores iniciales de `plays`/`best` (placeholders consistentes con el resto de `games`, no ceros).
2. **Cover.** ¿Reusa una clase `.cover-*` existente (como `asteroides` reusa `.cover-rocas` por temática) o hace falta una `.cover-<slug>` nueva? Si es nueva, en qué se inspira visualmente (los ejemplos en `references/platform-integration.md` muestran la técnica: gradientes puros, sin imágenes).
3. **Forma del HUD externo.** El contrato `GameEngineProps` trae `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`. Si el juego no tiene vidas o no tiene niveles (ej. Tetris no tiene "vidas"), pregunta explícitamente qué muestra el HUD externo en ese hueco — no lo asumas.
4. **HUD dibujado en canvas.** El precedente (spec 05) es conservar el HUD y el "GAME OVER" que el propio canvas dibuja, conviviendo con el HUD externo de React. Confirma si aplica igual aquí.
5. **Assets.** Si el juego trae sprites o sonido, confirma el traslado a `public/games/<slug>/` y que las rutas se vuelvan absolutas.
6. **Proporción del canvas.** Si el origen no es 4:3 (por ejemplo Tetris a 300×600), `.crt-screen` fuerza `aspect-ratio: 4/3` — pregunta si se acepta el letterboxing resultante, se ajusta el layout, o se decide otra cosa. No lo dejes implícito.
7. **`revalidatePath` en `submitScore`.** Hoy no existe: un puntaje guardado solo aparece en `/salon` y en la ficha tras recargar la página. Pregunta si este spec lo agrega (afecta a todos los juegos reales, no solo al nuevo) o se deja igual.
8. **Podio con pocos puntajes.** `SalonClient.tsx` indexa `rows[1]`/`rows[2]` sin guard cuando hay menos de 3 puntajes — un juego nuevo arranca siempre en ese estado. Pregunta si este spec lo arregla o se documenta como riesgo aceptado.

Detente cuando puedas responder sin asumir nada: qué archivos van a aparecer o cambiar, cuál es el primer paso ejecutable y cuál el último, y cómo se verifica que el juego quedó terminado.

### Fase 4 — Escribir y guardar el spec

Antes de redactar la primera sección, **lee `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` completos** — son la fuente de verdad del formato de spec de este repo (estados válidos, regla del objetivo en una frase, las dos sub-secciones obligatorias de Scope, estilo de la sección de Decisiones, reglas globales del documento). `spec-skeleton.md`, en este mismo directorio, ya adapta esa forma a un spec de juego, pero no la reemplaza: úsalo junto con `template.md`, no en vez de él, para que el spec generado sea indistinguible en forma de uno escrito con `/spec`.

Con eso leído, sigue `spec-skeleton.md` como plantilla del contenido y el orden de secciones de `template.md` (Header → Scope → Data model → Implementation plan → Acceptance criteria → Decisions → Risks). Muestra cada sección y espera confirmación antes de seguir a la siguiente — no generes el spec completo de una vez.

Al terminar:

1. Determina el número siguiente mirando `specs/`.
2. Propón un slug corto derivado del id del juego; confirma el nombre de archivo con el usuario.
3. Crea `specs/NN-<slug>.md` con `**Status:** Draft`.
4. Confirma la ruta creada, recuerda que queda en `Draft` hasta que el usuario la revise y la marque `Approved`, y que el siguiente paso es `/spec-impl NN-<slug>`.
5. **Detente ahí.** No propongas implementar, no escribas código, no toques ningún archivo fuera del `.md` del spec.

## Reglas duras

- Nunca escribas código durante esta skill — solo el archivo `.md` del spec al final.
- Nunca marques el spec como `Approved` — esa decisión es del usuario.
- Nunca asumas metadata (título, categoría, color, cover, dimensiones) que el usuario no confirmó explícitamente.
- Nunca generes el spec completo en una sola respuesta — sección por sección, con confirmación.
- Si el usuario quiere saltarse la Fase 3, recuérdale que las preguntas ahora ahorran retrabajo en `/spec-impl`; si insiste, respeta la decisión y anótala en la sección de Decisiones del spec ("Definición rápida sin ronda de clarificación").

## Argumentos

- `$ARGUMENTS` trae opcionalmente `<slug-del-juego>` y, si aplica, la carpeta de `references/started-games` a portar (ej. `/add-game tetris references/started-games/03-tetris`).
- Si no se indica carpeta, pregunta en Fase 2 si es un porteo o un juego nuevo.
- Si `$ARGUMENTS` viene vacío, pide el nombre del juego y si viene de una carpeta de referencias antes de continuar.
