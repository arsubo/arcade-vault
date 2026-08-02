# Receta de porteo: `game.js` global → motor con `setPaused`/`destroy`

Derivada de comparar `references/started-games/02-asteroids/game.js` (510 líneas, `document.getElementById('canvas')`, globals de módulo, sin pausa ni limpieza) contra `components/games/asteroids/engine.ts` (621 líneas), el motor ya portado y en producción. La mecánica, el balance y el HUD dibujado en canvas quedaron **1:1** — todo lo que cambió es plomería de integración con React. Esta es esa plomería, generalizada, más las notas específicas de las dos carpetas de referencia que todavía no se han portado.

## Los 8 pasos

1. **Deja en scope de módulo lo que es puro.** Constantes de tuning, helpers sin estado (`wrap`, `dist`, `rand`, `randInt`), tablas indexadas (colores, tamaños, puntajes) y las clases de entidades del juego (`Bullet`, `Asteroid`, `Ship`, …) se quedan al nivel superior del archivo, fuera de la factory. No tienen por qué recrearse por partida.

2. **Las clases dejan de cerrar sobre globals.** Si un método `draw()` usaba el `ctx` global, pasa a recibirlo como parámetro: `draw(ctx: CanvasRenderingContext2D)`. Si `update()` leía el objeto `keys` global, pasa a recibirlo como parámetro: `update(dt: number, keys: Keys)`. Esto es lo único que toca el cuerpo interno de las clases — su lógica de simulación no cambia.

3. **Envuelve todo lo con estado en la factory exportada.**

   ```ts
   export function create<Nombre>Engine(
     canvas: HTMLCanvasElement,
     callbacks: <Nombre>Callbacks
   ): <Nombre>EngineHandle {
     const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
     if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");
     // ...
   }
   ```

   Elimina cualquier `document.getElementById(...)` — el `canvas` llega como parámetro. Si el juego original usa **más de un canvas** (ver Tetris abajo), la factory recibe los que necesite, o un segundo parámetro con referencias adicionales.

4. **Los `let` de estado del juego se mueven al closure de la factory**, con los mismos nombres del original y tipados (`let score: number; let lives: number; let state: GameState;`, etc.). No se agrupan en un objeto salvo que el original ya lo hiciera — mantener los nombres facilita comparar contra el `game.js` de origen si hay dudas.

5. **Listeners inline → funciones nombradas, agregadas en la factory, removidas en `destroy()`.**

   ```ts
   const GAME_KEYS = new Set([
     "ArrowUp",
     "ArrowDown",
     "ArrowLeft",
     "ArrowRight",
     "Space",
   ]);

   function onKeyDown(e: KeyboardEvent) {
     if (GAME_KEYS.has(e.code)) e.preventDefault();
     keys[e.code] = true;
   }
   function onKeyUp(e: KeyboardEvent) {
     keys[e.code] = false;
   }
   window.addEventListener("keydown", onKeyDown);
   window.addEventListener("keyup", onKeyUp);
   ```

   `preventDefault` en las teclas de juego evita que flechas/espacio scrolleen la página anfitriona — el original standalone no lo necesitaba porque no compartía la página con nada más. Si el juego usa mouse (arkanoid), esos listeners van sobre `canvas`, no sobre `document`/`window`, y deben tener en cuenta que el canvas se estira por CSS (usar `getBoundingClientRect()` para escalar coordenadas, como ya hace el original de arkanoid).

6. **Llama a `callbacks.on*` solo en los sitios donde el estado realmente muta** — inicialización, subida de nivel, vida perdida, puntaje ganado, fin de partida. Nunca dentro de `draw()`. En asteroides, por ejemplo, `onScoreChange` se llama dentro del doble loop de colisión bala-asteroide, en el mismo punto donde `score += POINTS[a.size]` — no hace falta acumular y emitir una vez por frame, React ya agrupa las actualizaciones.

7. **El loop respeta este orden exacto:**

   ```ts
   let lastTime: number | null = null;
   let rafId: number | null = null;

   function loop(ts: number) {
     rafId = requestAnimationFrame(loop); // agendar primero, así la pausa no mata el loop
     if (paused) {
       lastTime = null; // al reanudar, evita un salto de dt gigante
       return;
     }
     const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
     lastTime = ts;
     update(dt);
     draw();
   }
   ```

   La pausa es un **flag** consultado en cada frame, no un `cancelAnimationFrame`. Es más simple e idempotente que cancelar y reprogramar, y dejar el último frame dibujado en pantalla mientras está en pausa es el comportamiento correcto (no hay que limpiar el canvas al pausar).

8. **`destroy()` cancela el rAF pendiente y remueve todos los listeners agregados**, sin excepción — es lo único que garantiza que salir de `/games/<slug>/jugar` no deje el loop corriendo en segundo plano ni las teclas interceptadas globalmente.

   ```ts
   return {
     setPaused(p: boolean) {
       paused = p;
     },
     destroy() {
       if (rafId !== null) cancelAnimationFrame(rafId);
       window.removeEventListener("keydown", onKeyDown);
       window.removeEventListener("keyup", onKeyUp);
     },
   };
   ```

## Gotchas ya identificados por juego de referencia

### `references/started-games/03-tetris/game.js` (332 líneas)

- **10 referencias `getElementById`** para el HUD (`score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`, más `theme-toggle`) — todas deben convertirse en llamadas a `callbacks.on*Change` o desaparecer. El `#overlay` de game-over/pausa en particular debe pasar a ser responsabilidad de React (el modal existente) o dibujarse en canvas — no puede seguir siendo un `<div>` externo que el motor manipula directamente.
- **Dos canvases**: el tablero (`#board`, 300×600) y la vista previa de la próxima pieza (`#next-canvas`, 120×120). La factory necesita recibir ambos — extiende la firma a `createTetrisEngine(canvas, nextCanvas, callbacks)` o agrupa en un objeto de opciones.
- **`getComputedStyle(document.body).getPropertyValue('--grid-line')`** dentro de `drawGrid()` lee una CSS var del tema. Debe volverse un color fijo o un parámetro — el motor no debería depender del DOM del documento anfitrión más allá del/los canvas.
- **`localStorage.getItem/setItem('tetris-theme')` y el toggle de `body.classList`** son del theming standalone del juego original — se descartan enteros; el tema visual lo controla la app, no el motor.
- **La pausa hoy cancela el rAF** (`togglePause()` llama `cancelAnimationFrame(animId)` y lo reprograma al reanudar) — hay que migrarla al patrón de flag del paso 7 de esta receta.
- **El reinicio era un botón DOM** (`restartBtn.addEventListener('click', init)`), no una tecla — el handle portado necesita exponer un método `restart()` además de `setPaused`/`destroy`, ya que no hay equivalente táctil/teclado en el original que React pueda simular.
- **Proporción 300×600 no es 4:3** (es 1:2) — este es justo el caso que la Fase 3 de la skill pregunta explícitamente antes de decidir cómo se ve dentro de `.crt-screen`.

### `references/started-games/04-arkanoid/game.js` (268 líneas)

- **Tres archivos con globals cruzados sin módulos**: `game.js` depende de `LEVELS` (definido en `levels.js`) y de `EXPLOSION_FRAMES`/`EXPLOSION_DURATION`/`SPRITES`/`loadSpritesheet()`/`drawSprite()`/`drawFrame()` (definidos en `assets/spritesheet.js`), todo cargado como `<script>` de scope global en el HTML original. El porteo debe convertir los tres en módulos ES (`levels.ts` exportando `LEVELS`, `spritesheet.ts` exportando las funciones/constantes) e importarlos normalmente en `engine.ts`.
- **Assets externos**: `assets/spritesheet-breakout.png` y los `.mp3` de `assets/sounds/` deben moverse a `public/games/arkanoid/` (o el path que se confirme en Fase 3) y cargarse con rutas absolutas — no relativas al módulo.
- **`new Audio(...)` de scope de módulo** en el original — deben crearse dentro de la factory (una instancia por partida, o reutilizada pero reseteada) y detenerse/limpiarse explícitamente en `destroy()`, si no el audio puede seguir sonando tras desmontar.
- **Arranque asíncrono**: el original hace `loadSpritesheet(() => { initPaddle(); loadLevel(1); requestAnimationFrame(loop); })` — la carga de imagen es asíncrona. Si el componente de React se desmonta antes de que el callback dispare, el loop arrancaría después de que `destroy()` ya se llamó. La factory necesita un flag `disposed` seteado por `destroy()` y consultado al inicio del callback de `loadSpritesheet`, para no arrancar el loop en ese caso.
- **Los handlers de canvas ya escalan con `getBoundingClientRect()`** (`click` para los botones de nivel dibujados en la pausa, `mousemove` para seguir la paleta) — esto es obligatorio de conservar, porque el canvas se estira por CSS dentro de `.crt-screen` y las coordenadas del evento vienen en píxeles de pantalla, no del canvas interno.
- **Usa `e.key` en vez de `e.code`** para pausa (`p`/`P`/`Escape`) — a diferencia de asteroides, que usa `e.code`. Mantener consistencia con el resto del motor portado si se homogeniza, o dejarlo así si no afecta el comportamiento.

## Qué no toca esta receta

Ningún paso de esta receta modifica el HUD ni el "GAME OVER" que el juego dibuja dentro del propio canvas — eso se conserva pixel por pixel salvo que la Fase 3 de la skill confirme explícitamente lo contrario (el precedente del spec 05 es conservarlo siempre, conviviendo con el HUD externo de React).
