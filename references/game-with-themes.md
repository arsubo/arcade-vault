# Juegos con skins

Lo mantiene el subagente `skin-designer` (`.claude/agents/skin-designer.md`). Un juego entra en
la tabla solo cuando sus 3 skins pasan `npm run check:skins <game-id>` y `npm run build`. Trabaja
un juego por corrida — nunca asumas que "sin skins todavía" significa que faltan todos a la vez si
la corrida se detuvo a mitad de camino; confía en las sondas de la Fase 0 del agente, no en esta
lista, para saber qué falta técnicamente.

| ID  | Carpeta | Skins | Fecha | Notas |
| --- | ------- | ----- | ----- | ----- |

## Sin skins todavía

- `asteroides` (`asteroids`)
- `tetris` (`tetris`)
- `arkanoid` (`arkanoid`)
- `snake` (`snake`)
