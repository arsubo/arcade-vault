# Juegos con controles táctiles

Lo mantiene el subagente `mobile-porter` (`.claude/agents/mobile-porter.md`). Un juego entra en
la tabla solo cuando su motor tiene `setVirtualKey` con cuerpo real, su wrapper publica
`inputRef`, y `GAME_TOUCH_CONTROLS` tiene su entrada — con `npm run build` y `npm run lint` en
verde. Trabaja un juego por corrida — nunca asumas que "sin controles todavía" significa que
falta todo si la corrida anterior se detuvo a mitad de camino; confía en las sondas de la
Fase 0, no en esta lista, para saber qué falta técnicamente.

El layout del pad (cruz de 4 direcciones + `A` + `B`) y su comportamiento general están
definidos por `specs/10-controles-tactiles.md` — nunca reabras esas decisiones desde acá.

| ID           | Carpeta     | ▲                                    | ▼                                     | ◀                                         | ▶                                        | A                             | B                  | Proporción CRT móvil        | Fecha      | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------ | ----------- | ------------------------------------ | ------------------------------------- | ----------------------------------------- | ---------------------------------------- | ----------------------------- | ------------------ | --------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asteroides` | `asteroids` | `ArrowUp` hold — propulsar           | —                                     | `ArrowLeft` hold — girar izq.             | `ArrowRight` hold — girar der.           | `Space` tap+repeat — disparar | —                  | 4:3 (default)               | 2026-08-05 | Disparo sostenido depende del `shootCooldown` propio de `tryShoot()`, no de un flanco repetido por el pad.                                                                                                                                                                                                                                                                                                                                                                                      |
| `tetris`     | `tetris`    | `ArrowUp` tap — rotar                | `ArrowDown` tap+repeat — bajar        | `ArrowLeft` tap+repeat — izquierda        | `ArrowRight` tap+repeat — derecha        | `Space` tap — caída rápida    | `KeyX` tap — rotar | 1:2 (`data-game="tetris"`)  | 2026-08-05 | Motor 100% discreto, sin `keys[]`; el `repeat` del pad sustituye al auto-repeat de teclado del sistema operativo.                                                                                                                                                                                                                                                                                                                                                                               |
| `snake`      | `snake`     | `ArrowUp` tap — arriba               | `ArrowDown` tap — abajo               | `ArrowLeft` tap — izquierda               | `ArrowRight` tap — derecha               | —                             | —                  | 4:3 (default)               | 2026-08-05 | El guard de 180° vive dentro de `applyDirection`, compartido por teclado y pad.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `arkanoid`   | `arkanoid`  | —                                    | —                                     | `ArrowLeft` hold — izquierda              | `ArrowRight` hold — derecha              | —                             | —                  | 4:3 (default)               | 2026-08-05 | Único motor indexado por `e.key`; funciona porque `ArrowLeft`/`ArrowRight` coinciden en `key` y `code`. Pausa y selección de nivel quedan fuera del pad a propósito.                                                                                                                                                                                                                                                                                                                            |
| `frogger`    | `frogger`   | `ArrowUp` tap+repeat — saltar arriba | `ArrowDown` tap+repeat — saltar abajo | `ArrowLeft` tap+repeat — saltar izquierda | `ArrowRight` tap+repeat — saltar derecha | —                             | —                  | 8:7 (`data-game="frogger"`) | 2026-08-07 | Motor 100% discreto, sin `keyup` (igual que tetris): `setVirtualKey` solo reacciona a `down === true` y delega en el mismo `handleDirectionKey` que ya usaba `onKeyDown`. El `repeat` del pad emula el auto-repeat de teclado del sistema operativo que hoy permite saltar sostenido. Sin acciones tipo A/B: el juego no tiene disparo ni acción secundaria, así que quedan inertes a propósito. Tablero 640×560 (16x14 celdas de 40px) = 8:7, no 4:3 → override de `--crt-ratio-w/h` en móvil. |

## Sin controles táctiles todavía

Ninguno: los 5 juegos reales del catálogo (`asteroides`, `tetris`, `arkanoid`, `snake`,
`frogger`) ya tienen su pad táctil.

## Decisiones pendientes del usuario

_(vacío — se llena cuando un juego no encaja en los 6 controles y la corrida se detiene a
consultar)_

## Fuera de alcance permanente

- Gestos (swipe, pinch) y control por acelerómetro.
- Arrastre del dedo sobre el canvas como input de juego.
- Remapeo de controles por el usuario y persistencia de preferencias del pad.
- API de pantalla completa, bloqueo de orientación, PWA/instalable, vibración háptica.
- Todo lo que ya descartó el `## Decisions` de `specs/10-controles-tactiles.md`.
