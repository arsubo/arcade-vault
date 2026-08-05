// Tipo de la paleta de "Arkanoid".
// Solo el TIPO vive acá — los valores de las 3 skins viven en `lib/skins.ts`
// (`GAME_PALETTES.arkanoid`), que es la fuente única de color.
//
// Particularidad de este juego: la paleta, la pelota y los ladrillos NO son
// colores planos, son regiones de un atlas PNG
// (`/games/arkanoid/spritesheet-breakout.png`). Los tokens de sprite son por
// eso `string | null`:
//   · `null`  → el atlas se dibuja tal cual, sin teñir (es el caso de
//               `clasico`, que tiene que verse exactamente como antes).
//   · string  → color con el que se tiñe esa región del atlas
//               (`buildTintedSheet` en `./spritesheet`).

export interface ArkanoidPalette {
  /** Fondo de la superficie de juego. */
  bg: string;
  /** Texto del HUD dibujado en canvas (score, nivel). */
  hudText: string;
  /** Velo sobre el campo de juego en GAME OVER / victoria. */
  scrim: string;
  /** Título del overlay de GAME OVER / victoria. */
  overlayText: string;
  /** Velo sobre el campo de juego durante la pausa. */
  scrimPause: string;
  /** "PAUSA" y "Saltar al nivel:" del overlay de pausa. */
  pauseText: string;
  /** Relleno del botón del nivel en curso. */
  btnFillActive: string;
  /** Relleno de los botones de los otros niveles. */
  btnFillIdle: string;
  /** Borde de los botones de nivel (su afordancia real cuando están inactivos). */
  btnStroke: string;
  /** Número dentro del botón activo. Se mide contra `btnFillActive`. */
  btnTextActive: string;
  /** Número dentro de un botón inactivo. Se mide contra `btnFillIdle`. */
  btnTextIdle: string;

  // ── Tinte de las regiones del atlas ───────────────────────────────────────
  /** Paleta del jugador. `null` = atlas sin teñir. */
  paddle: string | null;
  /** Pelota (y los íconos de vidas del HUD, que usan el mismo sprite). */
  ball: string | null;
  /** Ladrillo rojo y su explosión. */
  brickRed: string | null;
  /** Ladrillo amarillo y su explosión. */
  brickYellow: string | null;
  /** Ladrillo cian y su explosión. */
  brickCyan: string | null;
  /** Ladrillo magenta y su explosión. */
  brickMagenta: string | null;
  /** Ladrillo rosa y su explosión. */
  brickHotpink: string | null;
  /** Ladrillo verde y su explosión. */
  brickGreen: string | null;
  /** Ladrillo gris y su explosión. */
  brickGray: string | null;
}

/** Nombres de color de ladrillo que usa `levels.ts` / el atlas. */
export type ArkanoidBrickColor =
  | "red"
  | "yellow"
  | "cyan"
  | "magenta"
  | "hotpink"
  | "green"
  | "gray";

/** Mapa nombre-de-ladrillo → token plano de la paleta. */
export const BRICK_TOKEN: Record<ArkanoidBrickColor, keyof ArkanoidPalette> = {
  red: "brickRed",
  yellow: "brickYellow",
  cyan: "brickCyan",
  magenta: "brickMagenta",
  hotpink: "brickHotpink",
  green: "brickGreen",
  gray: "brickGray",
};
