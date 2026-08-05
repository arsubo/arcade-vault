# Juegos con skins

Lo mantiene el subagente `skin-designer` (`.claude/agents/skin-designer.md`). Un juego entra en
la tabla solo cuando sus 3 skins pasan `npm run check:skins <game-id>` y `npm run build`. Trabaja
un juego por corrida — nunca asumas que "sin skins todavía" significa que faltan todos a la vez si
la corrida se detuvo a mitad de camino; confía en las sondas de la Fase 0 del agente, no en esta
lista, para saber qué falta técnicamente.

| ID           | Carpeta     | Skins                      | Fecha      | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------ | ----------- | -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asteroides` | `asteroids` | `clásico`, `neon`, `retro` | 2026-08-05 | Primera corrida: además del juego se levantó toda la fundación (Fases 1, 2 y 4). Decisiones no obvias: (1) `particle` viaja como tripleta `[r,g,b]` y no como string, porque su alpha es dinámico. (2) Las 5 clases del motor (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`) están a nivel de módulo: reciben `pal` como argumento en cada `draw`, no por clausura. (3) `setSkin` llama a `draw()` directo — el loop hace `return` antes de dibujar si está en pausa. (4) **Sin reglas `sibling`**: el Asteroides original es monocromo (nave, roca y bala son las tres `"#fff"`), así que exigir que se distingan entre sí haría fallar a `clasico`, que es intocable. (5) `useSkin` usa `useSyncExternalStore` en vez de `useState`+`useEffect`: la regla `react-hooks/set-state-in-effect` del repo prohíbe la variante con efecto, y `getServerSnapshot` resuelve el mismatch de hidratación igual de bien. |

## Nota sobre el verificador (vale para las próximas corridas)

`scripts/check-skin-contrast.mjs` **no** barre los 8 escalones de una `scale` entre sí con la
clase `sibling`: es matemáticamente incompatible con `play`. Si los 8 tienen que dar ≥ 3.0:1
contra el fondo, su luminancia mínima queda fijada y el rango total disponible cae a ~6.7x,
mientras que 7 saltos consecutivos de 1.5:1 exigen 17x. La clase `sibling` se aplica solo a los
pares que el jugador compara lado a lado, y esos se declaran a mano en `GAME_CONTRAST_RULES`
(`lib/skins.ts`) por juego. Cuando le toque a Tetris o Snake, declará ahí los pares que
importen (piezas que se tocan, cabeza vs. cuerpo) en vez de tocar el script.

## Sin skins todavía

- `tetris` (`tetris`)
- `arkanoid` (`arkanoid`)
- `snake` (`snake`)
