// Contrato canónico de los motores de juego.
// Es la única declaración de estas interfaces en todo el repo: `registry.tsx`
// la reexporta y cada wrapper `*/[Nombre]Game.tsx` la importa desde acá.

import type { SkinId } from "@/lib/skins";

export interface GameEngineProps {
  paused: boolean;
  /**
   * Skin visual activa. Entra SIEMPRE como dato explícito hasta el motor
   * (prop → `create<X>Engine(canvas, callbacks, skin)` → `setSkin`); un motor
   * nunca lee `getComputedStyle` para averiguar su color.
   */
  skin: SkinId;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

/** Handle imperativo que devuelve todo `create<X>Engine(...)`. */
export interface GameEngineHandle {
  setPaused: (paused: boolean) => void;
  /** Repinta en vivo con la skin nueva. Nunca reinicia la partida. */
  setSkin: (skin: SkinId) => void;
  destroy: () => void;
}
