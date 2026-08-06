# Juegos implementados

| ID           | Título     | Categoría | Color   | Descripción breve                                                            | Controles táctiles (móvil)                                                                 |
| ------------ | ---------- | --------- | ------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `arkanoid`   | ARKANOID   | ARCADE    | cyan    | Rompe los bloques con tu paleta antes de perder las tres vidas.              | `◀`/`▶` mueven la paleta (mantener presionado). `▲`/`▼`/`A`/`B` inertes.                   |
| `asteroides` | ASTEROIDES | SHOOTER   | yellow  | Pulveriza asteroides reales en gravedad cero.                                | `▲` propulsa y `◀`/`▶` giran (mantener presionado); `A` dispara (repite). `▼`/`B` inertes. |
| `snake`      | SNAKE      | ARCADE    | green   | Guía a la serpiente por la grilla y devora frutas antes de morderte la cola. | `▲`/`▼`/`◀`/`▶` cambian de dirección. `A`/`B` inertes.                                     |
| `tetris`     | TETRIS     | PUZZLE    | magenta | Encaja las piezas reales antes de que el tablero te desborde.                | `▲` rota, `▼`/`◀`/`▶` mueven (repiten al mantener), `A` caída rápida, `B` rota.            |

Los 4 juegos reales (los únicos registrados en `GAME_REGISTRY`) comparten un mismo layout de pad táctil — cruz de 4 direcciones + botones `A`/`B` — visible solo en pantallas de puntero grueso (`@media (pointer: coarse)`) debajo del marco CRT en `/jugar`. Los controles que un juego no usa quedan visibles pero atenuados e inertes, para mantener la misma posición de botones en los 4 juegos. El binding control → tecla vive en `lib/touch-controls.ts` (`GAME_TOUCH_CONTROLS`); ver `specs/10-controles-tactiles.md`.
