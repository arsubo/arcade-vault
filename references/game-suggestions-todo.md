# TODO del game-planner

Backlog de juegos propuestos y aún no implementados, en orden de prioridad. Lo mantiene el
subagente `game-planner`. Cuando un juego llega a `implemented-games.md`, su entrada se
marca `[x]` y baja a "Implementados".

## Pendientes

Orden de prioridad establecido en la corrida ampliada del 2026-08-04 (20 candidatos, a
pedido explícito del usuario). El recomendado va primero; el resto queda ordenado como
respaldo sucesivo.

1. - [ ] **Duelo Pixel** (`duelo-pixel`) — VERSUS / cyan — _recomendado 2026-08-04_
         Duelo de reflejos (quick-draw) contra la CPU: espera la señal y dispara antes que el
         rival. Ya existe fila fake en la tabla `games` con cover `cover-duelo` predefinido.
         Única categoría VERSUS del catálogo hoy (0 juegos reales) — máximo impacto de
         balance. Costo: bajo (sin física ni pathfinding). Pendiente definir: cómo mapea
         `onLivesChange`/`onLevelChange` (p. ej. rondas restantes / velocidad de reacción de
         la CPU).

2. - [ ] **Invasores** (`invasores`) — SHOOTER / green — _respaldo directo de Duelo Pixel,
         2026-08-04_
         Space Invaders clásico: oleadas de enemigos en formación, disparo del jugador. Ya
         existe fila fake en `games` con cover `cover-invaders` predefinido. Reusa el patrón
         vectorial de `asteroides`. Costo: bajo-medio. `onLivesChange`=naves restantes,
         `onLevelChange`=número de oleada.

3. - [ ] **Rebote** (`rebote`) — VERSUS / magenta — _2026-08-04_
         Pong contra la CPU con power-ups ocasionales. Segunda opción para VERSUS si Duelo
         Pixel no convence. Reusa física de paleta de `arkanoid`. Costo: bajo. Pendiente
         definir cover (sin fila fake previa) y mapeo de `onLivesChange`/`onLevelChange`
         (p. ej. sets ganados / velocidad de la pelota).

4. - [ ] **Ranaria** (`ranaria`) — ARCADE / green — _2026-08-04_
         Frogger-like: cruza carriles de tráfico y troncos hasta la orilla. Ya existe fila
         fake en `games` con cover `cover-rana` predefinido. Reusa el patrón de grid de
         `snake`. Costo: bajo. `onLivesChange`=ranas restantes, `onLevelChange`=velocidad de
         carriles. Nota: ARCADE ya es la categoría más poblada del catálogo real.

5. - [ ] **Diana** (`diana`) — SHOOTER / cyan — _2026-08-04_
         Galería de tiro: blancos a distintas profundidades/velocidades, dispara antes del
         límite de tiempo, combos por precisión. Costo: bajo (temporizador + hit detection,
         sin física continua). Pendiente definir `onLivesChange`/`onLevelChange` (p. ej.
         disparos fallidos permitidos / ronda de dificultad).

6. - [ ] **Runner Neón** (`runner-neon`) — ARCADE / yellow — _2026-08-04_
         Endless runner de un carril (tipo Chrome Dino): salta/agacha esquivando obstáculos
         con velocidad creciente. Costo: bajo. Contra: concepto muy trillado y se solapa en
         sensación con Esquiva/Saltos; ARCADE saturado.

7. - [ ] **Esquiva** (`esquiva`) — ARCADE / yellow — _2026-08-04_
         Esquiva objetos que caen desde arriba con velocidad creciente, sin fin. Costo: bajo
         (colisión simple tipo `arkanoid` sin rebote). Contra: ARCADE saturado y concepto
         genérico; evaluar si conviene frente a Runner Neón en vez de sumar ambos.

8. - [ ] **Caída** (`caida`) — PUZZLE / magenta — _2026-08-04_
         Puzzle de piezas/gemas cayendo tipo Columns, para diferenciarse de `tetris`. Ya
         existe fila fake en `games`. Costo: medio (lógica de detección de matches).
         Pendiente definir la mecánica exacta y el mapeo de
         `onLivesChange`/`onLevelChange`.

9. - [ ] **Circuito** (`circuito`) — PUZZLE / cyan — _2026-08-04_
         Rota piezas de tubería/circuito en una grilla para conectar inicio y fin antes de
         que se acabe el tiempo. Costo: bajo-medio (lógica de grilla similar a `tetris` pero
         sin gravedad). Pendiente definir cover y mapeo de `onLivesChange`/`onLevelChange`.

10. - [ ] **Torres** (`torres`) — PUZZLE / yellow — _2026-08-04_
          Apila bloques horizontales en movimiento, recortando lo que sobresale (tipo
          Stack/Tower Bloxx). Costo: bajo-medio (timing + recorte de rectángulos). Contra:
          partidas pueden ser muy cortas si el jugador falla temprano.

11. - [ ] **Defensor** (`defensor`) — SHOOTER / magenta — _2026-08-04_
          Missile Command: intercepta misiles hacia ciudades con click/tap y radio de
          explosión. Costo: medio (colisiones múltiples simultáneas). Contra: input
          principal click/tap, distinto al resto del catálogo (revisar consistencia).

12. - [ ] **Escudo** (`escudo`) — SHOOTER / yellow — _2026-08-04_
          Rota un escudo circular alrededor de un núcleo para bloquear proyectiles desde
          todas direcciones. Costo: medio (matemática de colisión circular/angular). Contra:
          mecánica poco convencional, riesgo de no sentirse "shooter" clásico.

13. - [ ] **Golpe Topo** (`golpe-topo`) — ARCADE / magenta — _2026-08-04_
          Whack-a-mole: topos aparecen en una grilla de agujeros, golpéalos antes de que se
          escondan, combo por racha. Costo: bajo. Contra: mecánica muy casual, poco "arcade
          de acción"; ARCADE saturado.

14. - [ ] **Saltos** (`saltos`) — ARCADE / cyan — _2026-08-04_
          Plataformero vertical infinito (tipo Doodle Jump): rebota entre plataformas, altura
          = score. Costo: medio (física de gravedad/salto + generación procedural). Contra:
          ARCADE saturado; requiere tuning fino de física.

15. - [ ] **Rally Pixel** (`rally-pixel`) — ARCADE / cyan — _2026-08-04_
          Carretera con scroll continuo, esquiva tráfico en carriles con velocidad creciente.
          Costo: medio (scroll procedural + spawn de obstáculos). Contra: se solapa
          parcialmente con Ranaria (cruce de carriles); ARCADE saturado.

16. - [ ] **Trayectoria** (`trayectoria`) — PUZZLE / green — _2026-08-04_
          Apunta ángulo y potencia para golpear un objetivo esquivando obstáculos, tipo
          mini-golf/cañón con niveles. Costo: medio (física de trayectoria + datos de
          nivel). Contra: requiere diseñar varios niveles, más contenido que lógica.

17. - [ ] **Minero** (`minero`) — ARCADE / magenta — _2026-08-04_
          Cava una grilla vertical recolectando gemas mientras esquivas rocas que caen por
          gravedad (tipo Dig Dug/Boulder Dash ligero). Costo: medio (física de gravedad de
          bloques en grilla). Contra: ARCADE saturado; requiere balancear la caída.

18. - [ ] **Equilibrio** (`equilibrio`) — ARCADE / green — _2026-08-04_
          Mantén una bola equilibrada sobre una plataforma que se inclina con el teclado,
          recolectando puntos mientras la inclinación se acelera. Costo: medio (simulación
          física simple). Contra: ARCADE saturado; el "fail state" puede sentirse azaroso.

19. - [ ] **Laberinto Neón** (`laberinto-neon`) — PUZZLE / cyan — _2026-08-04_
          Laberinto procedural contra reloj: encuentra la salida evitando trampas, score =
          tiempo restante. Costo: medio (generación procedural + detección de trampas).
          Contra: sin cover/asset predefinido, hay que crearlo desde cero.

20. - [ ] **Glotón** (`gloton`) — ARCADE / yellow — _2026-08-04_
          Pac-Man-like: laberinto con fantasmas. Ya existe fila fake en `games` con cover
          `cover-glot` predefinido. Costo: alto por la IA/pathfinding de los enemigos — el
          más caro de los 20 candidatos vivos.

## Implementados

- [x] **Asteroides** — spec 05
- [x] **Tetris** — spec 07
- [x] **Arkanoid** — spec 08
- [x] **Snake** — spec 09
