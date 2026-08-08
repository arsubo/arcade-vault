// Overlay de diagnóstico de rendimiento: fps, ms/frame (p50 y p95) del motor
// activo, y renders de React por segundo de `JugarClient`. Se activa solo
// con `?fps=1` en la URL — sin ese parámetro, `attachFpsMeter` devuelve
// `null` y no se instala ningún listener ni contador (coste cero en uso
// normal).

export interface FpsMeter {
  /** Llamar una vez por frame desde el loop del motor. */
  tick: () => void;
  /**
   * Llamar desde el cuerpo de JugarClient en cada render (no desde un
   * efecto). Incrementa un contador que vive en el closure del meter, fuera
   * de React — nunca dispara un `setState`, así que no genera el render que
   * cuenta.
   */
  countReactRender: () => void;
  destroy: () => void;
}

const UPDATE_INTERVAL_MS = 250;
const FRAME_WINDOW_MS = 1000;

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(p * sortedAsc.length));
  return sortedAsc[idx];
}

export function attachFpsMeter(container: HTMLElement): FpsMeter | null {
  if (typeof window === "undefined") return null;
  if (new URLSearchParams(window.location.search).get("fps") !== "1") {
    return null;
  }

  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:absolute",
    "top:4px",
    "left:4px",
    "z-index:999",
    "padding:6px 8px",
    "background:rgba(0,0,0,0.75)",
    "color:#0f0",
    "font:11px/1.4 monospace",
    "white-space:pre",
    "pointer-events:none",
  ].join(";");
  overlay.textContent = "fps: --";
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }
  container.appendChild(overlay);

  const frameTimes: number[] = [];
  let renderCount = 0;
  let lastRenderCount = 0;
  let lastUpdate = performance.now();
  let destroyed = false;
  let rafId: number | null = null;

  function tick() {
    const now = performance.now();
    frameTimes.push(now);
    const cutoff = now - FRAME_WINDOW_MS;
    while (frameTimes.length > 0 && frameTimes[0] < cutoff) {
      frameTimes.shift();
    }
  }

  function countReactRender() {
    renderCount += 1;
  }

  function render(now: number) {
    if (destroyed) return;
    rafId = requestAnimationFrame(render);

    const elapsedMs = now - lastUpdate;
    if (elapsedMs < UPDATE_INTERVAL_MS) return;
    lastUpdate = now;

    const deltas: number[] = [];
    for (let i = 1; i < frameTimes.length; i++) {
      deltas.push(frameTimes[i] - frameTimes[i - 1]);
    }
    deltas.sort((a, b) => a - b);
    const p50 = percentile(deltas, 0.5);
    const p95 = percentile(deltas, 0.95);

    const rendersPerSec = Math.round(
      ((renderCount - lastRenderCount) * 1000) / elapsedMs
    );
    lastRenderCount = renderCount;

    overlay.textContent =
      `fps: ${frameTimes.length}\n` +
      `frame p50/p95: ${p50.toFixed(1)}/${p95.toFixed(1)} ms\n` +
      `react renders/s: ${rendersPerSec}`;
  }
  rafId = requestAnimationFrame(render);

  function destroy() {
    destroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    overlay.remove();
  }

  return { tick, countReactRender, destroy };
}
