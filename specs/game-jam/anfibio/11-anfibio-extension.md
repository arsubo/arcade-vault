# SPEC 11 — Anfibio: tortugas que se sumergen y mosca dorada (extensión)

> **Status:** Draft
> **Depends on:** 10-anfibio
> **Date:** 2026-08-04
> **Objective:** Sumar dos variantes opcionales al motor de Anfibio — tortugas que se sumergen periódicamente en el río a partir del nivel 3, y una mosca dorada de bonus que aparece brevemente en la mediana — sin tocar el contrato, el registro, la fila de `games` ni la cover.

## Scope

**In:**

- A partir del nivel 3, una fracción de las entidades de los carriles de río son grupos de tortugas (2–3 tortugas apiladas, mismo ancho aproximado que un tronco corto) en vez de troncos. Se comportan igual que un tronco (la rana puede montarse y se arrastra con su velocidad), pero siguen un ciclo de sumersión: permanecen a flote un tramo del ciclo, parpadean brevemente como aviso, y luego se sumergen (dejan de ser sólidas) por el resto del ciclo, antes de volver a salir a flote.
- Si la rana está montada sobre un grupo de tortugas en el instante en que se sumerge, muere ahogada — mismo camino de muerte que caer al río sin tronco (resta una vida, respawnea en el inicio, conserva puntaje/nivel/nenúfares, igual que cualquier otra muerte del spec base).
- Bonus de mosca dorada: cada cierto intervalo (con variación aleatoria), aparece en un punto fijo de la fila de mediana (fila 6, columna central) durante una ventana breve. Si la rana la toca mientras está activa, suma 200 puntos instantáneos y desaparece; no cuenta como avance de fila, no respawnea a la rana, no interactúa con nenúfares. Si la ventana expira sin contacto, desaparece sin penalización.
- Todo el estado nuevo (ciclo de sumersión por grupo de tortugas, temporizador de aparición de la mosca) vive dentro de `components/games/anfibio/engine.ts`, como estado interno del closure existente — sin nuevos callbacks, sin cambios a `GameEngineProps`, sin cambios a `GAME_REGISTRY`, sin migración SQL, sin cover nueva.

**Out of scope (para specs futuros):**

- Temporizador visible por vida (el "sin HUD en canvas" del spec base sigue vigente; un timer necesitaría o dibujar en el canvas o un callback nuevo, ninguno de los dos entra aquí).
- Cocodrilos disfrazados de nenúfar, modo difícil separado, modo dos jugadores, o cualquier otra variante de dificultad no descrita arriba.
- Sonido.
- Cualquier cambio al puntaje de avance (+10), al puntaje de nenúfar (+50), a la fórmula de aceleración por nivel, o a cualquier otra regla del spec base 10-anfibio.
- Cualquier cambio a `games`, `REAL_GAME_IDS`, `GAME_REGISTRY`, `.cover-anfibio` o al componente `AnfibioGame.tsx` (salvo que surja una constante visual menor durante la implementación, nunca una prop o firma nueva).

## Data model

Este spec no agrega tablas ni cambia el contrato `GameEngineProps`. Extiende únicamente el estado interno de `components/games/anfibio/engine.ts`:

```ts
// components/games/anfibio/engine.ts (estado interno adicional, no exportado)
interface TurtleGroupState {
  laneRow: number;
  x: number; // posición continua, igual que un tronco
  width: number; // celdas ocupadas
  vx: number;
  submerged: boolean;
  cycleElapsedMs: number; // reinicia al completar un ciclo flote+aviso+sumersión
}

interface FlyBonusState {
  active: boolean;
  spawnAtMs: number; // próximo instante de aparición
  expiresAtMs: number; // instante en que desaparece si no se toca
}
```

`AnfibioCallbacks`, `AnfibioEngineHandle` y `createAnfibioEngine` mantienen exactamente la misma firma que en el spec 10 — esta extensión no agrega parámetros ni callbacks nuevos.

## Implementation plan

1. Agregar el tipo de entidad "grupo de tortugas" al spawner de carriles de río, activo solo para `nivel >= 3`, con su ciclo de flote/aviso/sumersión y la regla de colisión (rideable salvo cuando `submerged === true`, en cuyo caso pisarla mata igual que el agua abierta). El sistema sigue funcional: en niveles 1–2 el comportamiento es idéntico al spec base (solo troncos); desde el nivel 3 conviven troncos y tortugas.
2. Agregar el temporizador y la lógica de aparición/colisión/puntaje de la mosca dorada en la fila de mediana. El sistema sigue funcional: la mosca es puramente opcional, nunca bloquea completar un nivel ni afecta el flujo de fin de partida.
3. Pasada de QA: jugar hasta el nivel 3+ y confirmar que las tortugas parpadean antes de sumergirse, que sumergirse mientras la rana está montada resta una vida igual que ahogarse en agua abierta, y que la rana puede seguir cruzando el río usando solo troncos si prefiere evitarlas; esperar varios ciclos de la mosca dorada y confirmar que tocarla suma exactamente 200 puntos una sola vez por aparición y que dejarla pasar no tiene efecto; confirmar que todos los criterios de aceptación del spec 10 siguen cumpliéndose sin cambios; `npm run build` sin errores; sin errores ni warnings en consola durante una partida completa que incluya al menos un ciclo de tortuga sumergida y una captura de mosca.

## Acceptance criteria

- [ ] En niveles 1 y 2, el comportamiento del río es idéntico al spec base (solo troncos, sin tortugas).
- [ ] A partir del nivel 3, los carriles de río incluyen grupos de tortugas rideables que parpadean antes de sumergirse.
- [ ] Estar montado sobre un grupo de tortugas en el instante de sumersión resta una vida, respawnea a la rana en el inicio y conserva puntaje, nivel y nenúfares — mismo camino que ahogarse en agua abierta.
- [ ] La mosca dorada aparece periódicamente en la fila de mediana, columna central, durante una ventana breve y visible.
- [ ] Tocar la mosca dorada mientras está activa suma exactamente 200 puntos y la hace desaparecer; no respawnea a la rana ni marca avance de fila ni nenúfar.
- [ ] Dejar expirar la ventana de la mosca sin tocarla no penaliza ni altera el estado de la partida.
- [ ] Todos los criterios de aceptación del spec 10-anfibio siguen cumpliéndose sin regresión.
- [ ] `npm run build` compila sin errores de TypeScript ni ESLint.
- [ ] No hay errores ni warnings en la consola del navegador durante una partida completa que incluya al menos un ciclo de tortuga sumergida y una captura de mosca dorada.

## Decisions

- **Sí:** tortugas gatilladas desde el nivel 3, no desde el nivel 1 — mantiene los primeros niveles fieles al spec base (más simples, mejor para un jugador nuevo), progresión de dificultad explícita en vez de aleatoria desde el inicio, mismo espíritu que la aceleración progresiva de snake.
- **Sí:** parpadeo de aviso antes de sumergir — evita una muerte "de sorpresa" sin señal previa, criterio de justicia jugable.
- **Sí:** la mosca dorada vive solo en la fila de mediana (fila 6, ya segura por diseño del spec base) — así el bonus nunca agrega un vector de muerte nuevo ni se superpone con carriles de carretera o río.
- **Sí:** +200 puntos fijos por mosca — bonus significativo pero no dominante frente al +10 de avance y el +50 de nenúfar; valor arbitrario razonable, ajustable como constante si el playtesting lo pide.
- **Sí:** sin nuevos callbacks ni cambios de firma en `AnfibioCallbacks`/`AnfibioEngineHandle`/`createAnfibioEngine` — todo el estado nuevo es interno al motor, mismo criterio de "el contrato no cambia por juego" documentado en `platform-integration.md`.
- **No:** temporizador visible por vida — requeriría romper el criterio de "sin HUD en canvas" o agregar un callback fuera de contrato; queda fuera de alcance de este spec también.
- **No:** cocodrilos, modo difícil separado o modo dos jugadores — fuera de alcance, no descritos en el tema original.
- **No:** cambios al puntaje base, la fórmula de aceleración por nivel, o cualquier regla ya fijada en el spec 10.

## Identified risks

- **Balance del ciclo de sumersión:** la proporción exacta de tiempo a flote / aviso / sumergida es un valor inicial sin playtesting extenso — mismo tipo de riesgo de balance que el spec base, ajustable como constantes en `engine.ts`.
- **Nunca implementado:** este spec es una extensión opcional pura — si nunca se implementa, `10-anfibio.md` deja el juego completo y jugable de punta a punta sin ninguna dependencia de este archivo.
- **Superposición de tortuga y tronco en el spawner:** al convivir dos tipos de entidad rideable en los mismos carriles desde el nivel 3, un spawner mal ajustado podría generar huecos sin nada rideable por un tramo — riesgo de balance, no de arquitectura; a ajustar en la pasada de QA de este spec.
