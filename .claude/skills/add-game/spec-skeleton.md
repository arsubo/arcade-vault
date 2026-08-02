# Forma del spec de un juego nuevo

Esta es la plantilla que `/add-game` sigue en su Fase 4. Respeta la forma general de `.claude/skills/spec/template.md` (header en blockquote, `Scope` con sus dos sub-bloques, plan numerado, criterios booleanos, decisiones con razón). Lo específico de un spec de juego está en el plan de implementación: es casi el mismo para cualquier juego, salvo dos pasos condicionales.

**No es texto para copiar literal** — es la forma que el spec generado debe respetar, con los nombres de archivo reales de este repo.

---

## Header

```markdown
# SPEC NN — Juego <Título> (motor real embebido)

> **Status:** Draft
> **Depends on:** 05-asteroides, 06-games-leaderboard
> **Date:** YYYY-MM-DD
> **Objective:** Agregar "<TÍTULO>" como juego jugable del catálogo, portando/implementando su motor a `/games/<slug>/jugar` con leaderboard real en Supabase.
```

## Scope

**In** debe cubrir, como mínimo:

- La fila nueva en `games` (migración SQL vía `mcp__supabase__apply_migration`).
- El motor (`components/games/<slug>/engine.ts`) y su wrapper de React (`components/games/<slug>/<Nombre>Game.tsx`).
- El registro en `components/games/registry.tsx`.
- El allowlist de puntajes reales (`lib/real-games.ts`) — nuevo si es el primer juego después de asteroides, o solo una línea añadida si ya existe.
- Cualquier clase `.cover-<slug>` nueva en `app/globals.css`, si no se reusa una existente.
- Las respuestas confirmadas en la Fase 3 sobre HUD, assets, proporción de canvas, `revalidatePath` y el bug de podio — cada una entra en Scope como "sí" o queda explícitamente en "Out of scope".

**Out of scope** — arrastra por defecto (salvo que el usuario decida incluirlos en este spec):

- `revalidatePath` en `submitScore`, si no se confirmó incluirlo.
- El fix del podio con menos de 3 filas en `SalonClient.tsx`, si no se confirmó incluirlo.
- Recalcular `best`/`plays` desde `MAX(scores.score)` — sigue fuera de alcance como en el spec 06.
- Autenticación, moderación de puntajes, rate limiting — mismos límites que el spec 06.
- Motores reales para el resto de juegos del catálogo que no sean este.

## Data model

Reusa el `insert into public.games (...)` del spec 06 como forma, con los valores confirmados en Fase 3. Si `lib/real-games.ts` no existe todavía, este es el único lugar del spec donde se define su forma completa:

```ts
// lib/real-games.ts
export const REAL_GAME_IDS = ["asteroides", "<slug>"] as const;

export function isRealGame(id: string): boolean {
  return (REAL_GAME_IDS as readonly string[]).includes(id);
}
```

Si ya existe, el spec solo dice: _"`lib/real-games.ts` ya existe; este spec agrega `'<slug>'` a `REAL_GAME_IDS`, sin cambiar su forma."_

El contrato del motor sigue `GameEngineProps` de `components/games/registry.tsx` sin modificarlo — si el juego no tiene vidas o niveles, el spec debe decir explícitamente qué valor constante o derivado se pasa a esos callbacks (no se cambia el contrato para acomodarlo).

## Implementation plan

Numeración de referencia — el spec generado ajusta los pasos condicionales según lo que ya exista en el repo:

1. _(Solo si `lib/real-games.ts` no existe)_ Crear `lib/real-games.ts` con `REAL_GAME_IDS` y `isRealGame()`, y migrar los 4 sitios hoy hardcodeados a `"asteroides"` (`app/games/[id]/jugar/actions.ts`, `app/games/[id]/page.tsx`, `app/salon/page.tsx`, `components/SalonClient.tsx`) para que lean del allowlist. Sistema sigue funcional: comportamiento idéntico para asteroides, cero cambios visuales.
2. Migración SQL que inserta la fila del juego nuevo en `games`, vía `mcp__supabase__apply_migration`. Sistema sigue funcional: el juego aparece en Home/biblioteca con la simulación falsa, como cualquier juego sin motor registrado.
3. _(Solo si hace falta cover nueva)_ Agregar `.cover-<slug>` en `app/globals.css`, junto a las demás clases `.cover-*`. Sistema sigue funcional.
4. Portar o implementar el motor en `components/games/<slug>/engine.ts`, siguiendo la receta de `references/engine-porting.md` de esta skill. Expone `create<Nombre>Engine(canvas, callbacks): { setPaused, destroy }`. Sistema sigue funcional: el módulo existe, sin consumidores todavía.
5. Crear `components/games/<slug>/<Nombre>Game.tsx`, copiando el patrón de `components/games/asteroids/AsteroidsGame.tsx` (canvas con las dimensiones confirmadas, `callbacksRef` para no recrear el motor en cada render, `useEffect` con cleanup que llama `destroy()`, segundo `useEffect` que sincroniza `paused`). Sistema sigue funcional.
6. Registrar `<slug>: <Nombre>Game` en `components/games/registry.tsx`. Sistema queda funcional: `/games/<slug>/jugar` corre el motor real (aunque el juego todavía no puede guardar puntaje).
7. Agregar `"<slug>"` a `REAL_GAME_IDS` en `lib/real-games.ts`. Último paso ejecutable del spec: se puede jugar de punta a punta, guardar un puntaje real, y verlo reflejado en `/salon` y en `/games/<slug>` tras recargar.
8. Pasada de QA (ver Acceptance criteria).

## Acceptance criteria

Base reutilizable — el spec generado la ajusta a la mecánica real del juego:

- [ ] `npm run build` compila sin errores de TypeScript ni ESLint.
- [ ] La tabla `games` contiene la fila del juego nuevo tras la migración.
- [ ] `/games/<slug>/jugar` renderiza el motor real dentro de `.crt-screen`, controlable con sus controles definidos.
- [ ] El HUD externo (`player-hud`) refleja en tiempo real el puntaje (y vidas/nivel si aplican) del motor, no valores simulados.
- [ ] El HUD dibujado dentro del canvas, si se decidió conservar, sigue visible sin cambios respecto al original.
- [ ] "PAUSA"/"REANUDAR" del HUD externo detiene y reactiva el loop del motor.
- [ ] Al terminar la partida, el motor notifica el fin y aparece el modal "FIN DEL JUEGO" con el puntaje real, con campo de nombre y botón "GUARDAR PUNTAJE".
- [ ] Un puntaje guardado aparece en `/salon` (tab del juego nuevo) y en `/games/<slug>` (ficha) tras recargar.
- [ ] `submitScore` sigue rechazando nombres vacíos y puntajes no positivos para este juego.
- [ ] Cualquier otro juego del catálogo (incluido asteroides) sigue funcionando sin regresión visual ni de comportamiento.
- [ ] Desmontar `/games/<slug>/jugar` no deja el loop del motor corriendo ni listeners de teclado activos.
- [ ] No hay errores ni warnings en la consola del navegador al jugar una partida completa.
- [ ] `mcp__supabase__get_advisors` no reporta alertas nuevas de seguridad.

## Decisions

Registra aquí, con razón, cada respuesta de la Fase 3: metadata de catálogo, cover reusada o nueva, forma del HUD externo cuando faltan vidas/niveles, si se conserva el HUD del canvas, destino de los assets, proporción del canvas y si acepta letterboxing, y si este spec incluye o no `revalidatePath` y el fix del podio.

## Risks

Arrastra siempre, ajustados al juego:

- Loop de `requestAnimationFrame` o listeners no limpiados correctamente al desmontar (mismo riesgo que el spec 05, mitigado por la pasada de QA).
- Si el canvas de origen no es 4:3: distorsión o letterboxing dentro de `.crt-screen`, según lo decidido en Fase 3.
- Si `revalidatePath` queda fuera de scope: los puntajes solo se reflejan tras recargar, igual que hoy.
- Si el fix de podio queda fuera de scope: el podio de `/salon` puede mostrar slots vacíos hasta que el juego nuevo acumule 3 puntajes.
