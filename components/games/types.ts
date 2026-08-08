// Contrato canónico de los motores de juego.
// Es la única declaración de estas interfaces en todo el repo: `registry.tsx`
// la reexporta y cada wrapper `*/[Nombre]Game.tsx` la importa desde acá.

import type { RefObject } from "react";
import type { SkinId } from "@/lib/skins";

/** Canal por el que un wrapper publica el `setVirtualKey` de su motor. */
export interface VirtualInput {
  /** Mismo `KeyboardEvent.code` que usan los listeners de teclado del motor. */
  setVirtualKey: (code: string, down: boolean) => void;
}

export interface GameEngineProps {
  paused: boolean;
  /**
   * Skin visual activa. Entra SIEMPRE como dato explícito hasta el motor
   * (prop → `create<X>Engine(canvas, callbacks, skin)` → `setSkin`); un motor
   * nunca lee `getComputedStyle` para averiguar su color.
   */
  skin: SkinId;
  /** El wrapper publica acá el `setVirtualKey` de su motor; `null` al desmontar. */
  inputRef: RefObject<VirtualInput | null>;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  /**
   * Diagnóstico de rendimiento (`?fps=1`, ver `lib/fps-meter.ts`): el motor
   * la llama una vez por frame de rAF, pausado o no. `undefined` en uso
   * normal — ningún motor debe suponer que existe.
   */
  onEngineFrame?: () => void;
}

/** Handle imperativo que devuelve todo `create<X>Engine(...)`. */
export interface GameEngineHandle {
  setPaused: (paused: boolean) => void;
  /** Repinta en vivo con la skin nueva. Nunca reinicia la partida. */
  setSkin: (skin: SkinId) => void;
  /**
   * Input virtual del pad táctil. Rutea al MISMO estado que el listener de
   * teclado del motor — nunca duplica lógica de juego.
   */
  setVirtualKey: (code: string, down: boolean) => void;
  destroy: () => void;
}
