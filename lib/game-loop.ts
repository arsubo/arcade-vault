// Bucle de rAF compartido por los 5 motores. Corta el frame de verdad al
// pausar o terminar la partida, en vez de reprogramarse y recién ahí hacer
// `return` (el patrón que hoy repiten los 5 y que mantiene al compositor
// despierto a 60 Hz después de "FIN DEL JUEGO").

export interface GameLoop {
  /** Arranca el loop. Idempotente. */
  start: () => void;
  /** Cancela el rAF de verdad — no reprograma para hacer `return` adentro. */
  stop: () => void;
  /** `false` cancela el frame pendiente; `true` reanuda sin salto de delta. */
  setRunning: (running: boolean) => void;
}

export function createGameLoop(options: {
  /** Avance de simulación. No se llama si el loop está detenido. */
  update: (dtMs: number) => void;
  /** Dibujo. Se llama una vez más al detenerse, para dejar el frame final. */
  draw: () => void;
}): GameLoop {
  const { update, draw } = options;

  let rafId: number | null = null;
  let running = false;
  let lastTime: number | null = null;

  function cancelPending() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function frame(time: number) {
    rafId = null;
    if (!running) return;

    const dtMs = lastTime === null ? 0 : time - lastTime;
    lastTime = time;

    update(dtMs);
    draw();

    if (running) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function resume() {
    if (running) return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    resume();
  }

  function stop() {
    running = false;
    cancelPending();
    draw();
  }

  function setRunning(next: boolean) {
    if (next) {
      resume();
    } else if (running) {
      running = false;
      cancelPending();
    }
  }

  return { start, stop, setRunning };
}
