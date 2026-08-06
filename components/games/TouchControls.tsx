"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent, RefObject } from "react";
import type { RealGameId } from "@/lib/real-games";
import {
  GAME_TOUCH_CONTROLS,
  TOUCH_REPEAT_DELAY_MS,
  TOUCH_REPEAT_INTERVAL_MS,
  type TouchControlBinding,
  type TouchControlId,
} from "@/lib/touch-controls";
import type { VirtualInput } from "@/components/games/types";

interface TouchControlsProps {
  gameId: RealGameId;
  inputRef: RefObject<VirtualInput | null>;
  /** Al pasar a `true` se sueltan todas las teclas virtuales sostenidas. */
  paused: boolean;
}

interface ActivePointer {
  code: string;
  repeatTimeout: ReturnType<typeof setTimeout> | null;
  repeatInterval: ReturnType<typeof setInterval> | null;
}

const GLYPH: Record<TouchControlId, string> = {
  up: "▲",
  down: "▼",
  left: "◀",
  right: "▶",
  a: "A",
  b: "B",
};

export default function TouchControls({
  gameId,
  inputRef,
  paused,
}: TouchControlsProps) {
  const bindings = GAME_TOUCH_CONTROLS[gameId];
  const pointersRef = useRef(new Map<number, ActivePointer>());

  const releasePointer = useCallback(
    (pointerId: number) => {
      const active = pointersRef.current.get(pointerId);
      if (!active) return;
      pointersRef.current.delete(pointerId);
      if (active.repeatTimeout) clearTimeout(active.repeatTimeout);
      if (active.repeatInterval) clearInterval(active.repeatInterval);
      inputRef.current?.setVirtualKey(active.code, false);
    },
    [inputRef]
  );

  const releaseAll = useCallback(() => {
    for (const pointerId of Array.from(pointersRef.current.keys())) {
      releasePointer(pointerId);
    }
  }, [releasePointer]);

  // Soltar todo al pausar: un `hold` sostenido no puede quedar trabado
  // mientras el jugador abre el menú o el motor deja de consultar el estado.
  useEffect(() => {
    if (paused) releaseAll();
  }, [paused, releaseAll]);

  // Soltar todo al desmontar: ningún timer de repeat ni tecla virtual debe
  // sobrevivir a `/jugar`.
  useEffect(() => releaseAll, [releaseAll]);

  const handlePointerDown = useCallback(
    (binding: TouchControlBinding) => (e: PointerEvent<HTMLButtonElement>) => {
      const code = binding.code;
      if (!code) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      inputRef.current?.setVirtualKey(code, true);

      let repeatTimeout: ReturnType<typeof setTimeout> | null = null;
      let repeatInterval: ReturnType<typeof setInterval> | null = null;

      if (binding.mode === "tap" && binding.repeat) {
        repeatTimeout = setTimeout(() => {
          repeatInterval = setInterval(() => {
            inputRef.current?.setVirtualKey(code, true);
          }, TOUCH_REPEAT_INTERVAL_MS);
          const active = pointersRef.current.get(e.pointerId);
          if (active) active.repeatInterval = repeatInterval;
        }, TOUCH_REPEAT_DELAY_MS);
      }

      pointersRef.current.set(e.pointerId, {
        code,
        repeatTimeout,
        repeatInterval,
      });
    },
    [inputRef]
  );

  const handlePointerRelease = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      releasePointer(e.pointerId);
    },
    [releasePointer]
  );

  function renderButton(controlId: TouchControlId, extraClassName: string) {
    const binding = bindings[controlId];
    const inert = binding.code === null;
    const className = `touch-btn ${extraClassName}${
      inert ? " touch-btn--inert" : ""
    }`;

    return (
      <button
        key={controlId}
        type="button"
        className={className}
        aria-label={binding.label}
        aria-disabled={inert ? true : undefined}
        onPointerDown={inert ? undefined : handlePointerDown(binding)}
        onPointerUp={inert ? undefined : handlePointerRelease}
        onPointerCancel={inert ? undefined : handlePointerRelease}
        onPointerLeave={inert ? undefined : handlePointerRelease}
      >
        {GLYPH[controlId]}
      </button>
    );
  }

  return (
    <div className="touch-pad">
      <div className="touch-dpad">
        {renderButton("up", "touch-dpad-up")}
        {renderButton("left", "touch-dpad-left")}
        {renderButton("right", "touch-dpad-right")}
        {renderButton("down", "touch-dpad-down")}
      </div>
      <div className="touch-actions">
        {renderButton("b", "touch-action-b")}
        {renderButton("a", "touch-action-a")}
      </div>
    </div>
  );
}
