// Fuente única del mapeo control táctil → tecla para los 4 juegos reales.
// El layout del pad (d-pad + A + B) es idéntico en los cuatro; lo único que
// cambia es qué `code` dispara cada botón y su modo (`hold`/`tap`/`repeat`).

import type { RealGameId } from "@/lib/real-games";

export type TouchControlId = "up" | "down" | "left" | "right" | "a" | "b";

export const TOUCH_CONTROL_IDS = [
  "up",
  "down",
  "left",
  "right",
  "a",
  "b",
] as const;

export interface TouchControlBinding {
  /** `KeyboardEvent.code` a emitir. `null` = control inerte (visible y atenuado). */
  code: string | null;
  /**
   * `hold` → el motor consulta la tecla por frame: se emite `down` al tocar y
   *          `up` al soltar.
   * `tap`  → acción discreta: se emite un único `down` al tocar (el motor
   *          ignora el `up`).
   */
  mode: "hold" | "tap";
  /** Solo para `tap`: repetir mientras el dedo sigue apoyado. */
  repeat?: boolean;
  /** Etiqueta accesible (`aria-label`). */
  label: string;
}

export type GameTouchControls = Record<TouchControlId, TouchControlBinding>;

const INERT: TouchControlBinding = {
  code: null,
  mode: "tap",
  label: "Sin uso",
};

export const GAME_TOUCH_CONTROLS: Record<RealGameId, GameTouchControls> = {
  asteroides: {
    up: { code: "ArrowUp", mode: "hold", label: "Propulsar" },
    down: INERT,
    left: { code: "ArrowLeft", mode: "hold", label: "Girar izquierda" },
    right: { code: "ArrowRight", mode: "hold", label: "Girar derecha" },
    a: { code: "Space", mode: "tap", repeat: true, label: "Disparar" },
    b: INERT,
  },
  tetris: {
    up: { code: "ArrowUp", mode: "tap", label: "Rotar" },
    down: { code: "ArrowDown", mode: "tap", repeat: true, label: "Bajar" },
    left: {
      code: "ArrowLeft",
      mode: "tap",
      repeat: true,
      label: "Izquierda",
    },
    right: {
      code: "ArrowRight",
      mode: "tap",
      repeat: true,
      label: "Derecha",
    },
    a: { code: "Space", mode: "tap", label: "Caída rápida" },
    b: { code: "KeyX", mode: "tap", label: "Rotar" },
  },
  snake: {
    up: { code: "ArrowUp", mode: "tap", label: "Arriba" },
    down: { code: "ArrowDown", mode: "tap", label: "Abajo" },
    left: { code: "ArrowLeft", mode: "tap", label: "Izquierda" },
    right: { code: "ArrowRight", mode: "tap", label: "Derecha" },
    a: INERT,
    b: INERT,
  },
  arkanoid: {
    up: INERT,
    down: INERT,
    left: { code: "ArrowLeft", mode: "hold", label: "Izquierda" },
    right: { code: "ArrowRight", mode: "hold", label: "Derecha" },
    a: INERT,
    b: INERT,
  },
  // Stub sin cablear: mobile-porter reemplaza estos INERT por el binding real.
  frogger: {
    up: INERT,
    down: INERT,
    left: INERT,
    right: INERT,
    a: INERT,
    b: INERT,
  },
};

export const TOUCH_REPEAT_DELAY_MS = 220;
export const TOUCH_REPEAT_INTERVAL_MS = 90;
