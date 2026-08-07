// ============================================================================
// Arcade Vault — sistema de skins visuales
// ============================================================================
// Fuente ÚNICA de todo el color de los skins de los juegos.
//
// Reglas duras de este archivo (no las rompas):
//   1. Solo sintaxis borrable en tiempo de compilación: nada de `enum`, nada de
//      `namespace`. `scripts/check-skin-contrast.mjs` importa este archivo tal
//      cual con el type-stripping nativo de Node — sin transpilar.
//   2. Únicamente `import type` desde los `palette.ts` de cada juego. Los tipos
//      viven en el juego; los VALORES viven acá.
//   3. La paleta `clasico` de cada juego es copia literal, carácter por
//      carácter, de los colores que ya tenía su motor. Nunca se ajusta.
//   4. Las paletas `neon` y `retro` NUNCA contienen un literal propio: cada
//      campo es una referencia a `SKIN_RAMP[skin].<slot>` o
//      `SKIN_RAMP[skin].scale[n]`. Si el verificador de contraste marca un
//      infractor, se corrige el slot en `SKIN_RAMP`, no la paleta del juego.
//
// ---------------------------------------------------------------------------
// Estéticas fijas (valen para CUALQUIER juego — no se inventa una identidad
// distinta por juego):
//
//   · clasico → el look original del motor tal cual se portó. Referencia
//               histórica; la rampa `clasico` replica la paleta del catálogo
//               (cian/magenta/amarillo sobre negro) para el chrome del CRT.
//   · neon    → luz emisiva sobre cristal casi negro. Pocos píxeles encendidos,
//               muy saturados, trazo fino, acentos cian/magenta.
//   · retro   → fósforo monocromo ámbar. TODA la distinción viene de escalones
//               de luminancia, nunca de matiz: todos los tokens comparten el
//               mismo hue (~41°) y solo cambian de brillo.
//
// ---------------------------------------------------------------------------
// TABLA DE MAPEO concepto → slot
// ---------------------------------------------------------------------------
// Molde para las próximas corridas. Cuando le toque a otro juego, buscá el
// concepto equivalente acá antes de decidir libremente.
//
//   CONCEPTO GENÉRICO                       SLOT
//   ─────────────────────────────────────── ──────────────────────────────────
//   fondo de la pantalla de juego           bg
//   grilla / scanlines / adorno de fondo    grid          (decorativo: banda
//                                                          1.10–2.20:1 vs bg)
//   texto principal dibujado en canvas      ink
//   texto secundario / subtítulo de overlay inkDim
//   avatar del jugador (nave, paleta,       accent
//     cabeza de la serpiente…)
//   proyectil / elemento de acción rápida   accent2
//   propulsor, estela, energía              warn
//   peligro explícito (enemigo letal)       danger
//   bonus / power-up / objetivo positivo    ok
//   obstáculo neutro (asteroide, muro,      neutral
//     ladrillo sin premio)
//   familias de piezas u objetos que deben  scale[0..7]   (vecinos ≥ 1.5:1
//     distinguirse entre sí                                entre sí)
//
//   POR JUEGO (se va llenando de a un juego por corrida):
//   · asteroides → bg=bg · nave=accent · propulsor=warn · asteroide=neutral ·
//     bala=accent2 · partícula=rgb(ink|scale[6]) · power-up=ok/warn ·
//     HUD=ink · overlay título=accent/accent2 · overlay sub=inkDim ·
//     ícono de vida=accent/scale[6]
//   · tetris     → piezas I,J,L,O,S,T,Z + extra → scale[0..7] ·
//     tablero=bg · grilla=grid · fantasma=inkDim · HUD=ink
//   · snake      → cuerpo=scale[2] · cabeza=scale[6] · ojo=bg ·
//     comida=ok · muro=neutral · grilla=grid
//   · arkanoid   → paleta=accent · bola=accent2 · ladrillos=scale[0..7] ·
//     power-ups=ok · HUD=ink
//   · frogger    → rana=accent · ojo=ink/pupila=bg · tortuga=rgb(ok) ·
//     tronco=scale[2] · autos=scale[3,1,7,5]+danger · franja segura=scale[0] ·
//     fondos de zona=bg · borde de meta=warn · meta conquistada=ok ·
//     divisorias=grid · HUD=ink/accent2 · barra de tiempo=ok/warn/danger
//
//   EXCEPCIÓN de Frogger sobre la tabla: la "franja segura" es un FONDO de
//   fila, no un objeto, y no hay slot de fondo secundario en la rampa. Usa
//   `scale[0]` (el escalón más oscuro de las dos rampas) porque es el único
//   valor que se despega del fondo sin competir con la rana que se para
//   encima.
// ============================================================================

// Ruta relativa a propósito (no el alias `@/`): `scripts/check-skin-contrast.mjs`
// importa este archivo con el type-stripping nativo de Node, que no conoce los
// alias de `tsconfig.json`.
import type { ArkanoidPalette } from "../components/games/arkanoid/palette";
import type { AsteroidsPalette } from "../components/games/asteroids/palette";
import type { FroggerPalette } from "../components/games/frogger/palette";
import type { SnakePalette } from "../components/games/snake/palette";
import type { TetrisPalette } from "../components/games/tetris/palette";

// ── Identidad de los skins ──────────────────────────────────────────────────

export const SKIN_IDS = ["clasico", "neon", "retro"] as const;

export type SkinId = (typeof SKIN_IDS)[number];

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_STORAGE_KEY = "av:skin";

export function isSkinId(value: unknown): value is SkinId {
  return (
    typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value)
  );
}

// ── Rampa compartida ────────────────────────────────────────────────────────

export interface SkinRamp {
  /** Fondo de la superficie de juego. */
  bg: string;
  /** Adorno de fondo (grilla, scanlines). Decorativo, nunca protagonista. */
  grid: string;
  /** Texto principal dibujado en canvas. */
  ink: string;
  /** Texto secundario, subtítulos, estados atenuados. */
  inkDim: string;
  /** Avatar del jugador / color de identidad del skin. */
  accent: string;
  /** Acción rápida: proyectiles, impactos, segundo acento. */
  accent2: string;
  /** Energía, propulsión, advertencia suave. */
  warn: string;
  /** Peligro explícito. */
  danger: string;
  /** Bonus, objetivo positivo, power-up. */
  ok: string;
  /** Obstáculo neutro sin carga emocional. */
  neutral: string;
  /** Familia de 8 escalones para objetos que deben distinguirse entre sí. */
  scale: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
}

export const SKIN_RAMP: Record<SkinId, SkinRamp> = {
  clasico: {
    bg: "#000",
    grid: "rgba(0, 245, 255, 0.10)",
    ink: "#e6e9ff",
    inkDim: "#8a8fb5",
    accent: "#00f5ff",
    accent2: "#ff006e",
    warn: "#f5ff00",
    danger: "#ff3b3b",
    ok: "#00ff88",
    neutral: "#c7d0e0",
    scale: [
      "#7c3aff",
      "#ff006e",
      "#ff8a00",
      "#3aa0ff",
      "#00ff88",
      "#00f5ff",
      "#f5ff00",
      "#e6e9ff",
    ],
  },
  neon: {
    bg: "#04070c",
    grid: "rgba(0, 245, 255, 0.09)",
    ink: "#eafcff",
    inkDim: "#8fb8c4",
    accent: "#00f5ff",
    accent2: "#ff2fd0",
    warn: "#ffc247",
    danger: "#ff4d6d",
    ok: "#39ffb0",
    neutral: "#a9c2cf",
    scale: [
      "#5b2bff",
      "#ff2fd0",
      "#ff6a1a",
      "#00a6ff",
      "#00f5ff",
      "#39ffb0",
      "#ffc247",
      "#eafcff",
    ],
  },
  retro: {
    bg: "#0d0800",
    grid: "rgba(255, 176, 0, 0.09)",
    ink: "#ffd694",
    inkDim: "#c98a1e",
    accent: "#ffb000",
    accent2: "#ffe3b0",
    warn: "#ffc63d",
    danger: "#8a5200",
    ok: "#ffdf9e",
    neutral: "#cf8600",
    // Un único matiz (~41°), solo escalones de luminancia. El piso lo fija la
    // regla `play` del verificador: todo escalón es un objeto dibujable y debe
    // dar ≥ 3.0:1 contra `bg`, así que no puede haber ámbares casi negros.
    scale: [
      "#8a5a00",
      "#9a6600",
      "#ab7300",
      "#bd8100",
      "#cf8f00",
      "#e29d00",
      "#ffb000",
      "#ffc63d",
    ],
  },
};

// ── Metadatos para el selector de la UI ─────────────────────────────────────

export interface SkinMeta {
  id: SkinId;
  label: string;
  dot: string;
}

export const SKIN_META: Record<SkinId, SkinMeta> = {
  clasico: { id: "clasico", label: "CLÁSICO", dot: SKIN_RAMP.clasico.accent },
  neon: { id: "neon", label: "NEÓN", dot: SKIN_RAMP.neon.accent2 },
  retro: { id: "retro", label: "RETRO", dot: SKIN_RAMP.retro.accent },
};

// ── Utilidades de color ─────────────────────────────────────────────────────

/**
 * Convierte "#rgb" o "#rrggbb" en la tripleta [r, g, b].
 *
 * Existe para los colores con alpha DINÁMICO (partículas, desvanecidos): el
 * motor guarda la base como tripleta y compone `rgba(...)` en el momento de
 * dibujar. Interpolar strings de hex rompe en silencio — canvas conserva el
 * `fillStyle` anterior ante una cadena inválida y el bug solo se ve en
 * movimiento.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
      : h.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * Devuelve `rgba(...)` a partir de un slot de la rampa y un alpha.
 *
 * NO es una puerta trasera para meter color nuevo en `neon`/`retro`: el matiz
 * SIEMPRE sale de `SKIN_RAMP`. Lo único local es el alpha, que es geometría del
 * motor (la opacidad del velo del overlay), no una decisión de color, y ya
 * existía tal cual en la paleta `clasico` del juego.
 */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Paletas por juego ───────────────────────────────────────────────────────
// Se llena de a UN juego por corrida del subagente `skin-designer`. Que un
// juego no esté acá no es un error: es que todavía no le tocó.

export interface GamePalettes {
  asteroids: Record<SkinId, AsteroidsPalette>;
  tetris: Record<SkinId, TetrisPalette>;
  arkanoid: Record<SkinId, ArkanoidPalette>;
  snake: Record<SkinId, SnakePalette>;
  frogger: Record<SkinId, FroggerPalette>;
}

// Mapeo intercalado I O T S Z J L N → scale[0 4 1 5 2 6 3 7]: alterna entre las
// dos "mitades" de la rampa para que piezas consecutivas del generador nunca
// caigan en escalones vecinos.
function tetrisPieces(skin: SkinId): TetrisPalette["pieces"] {
  const s = SKIN_RAMP[skin].scale;
  return [s[0], s[4], s[1], s[5], s[2], s[6], s[3], s[7]];
}

// Los 5 vehículos evitan a propósito los escalones que ya ocupan la rana
// (`accent`, que es `scale[4]` en neon y `scale[6]` en retro), el tronco
// (`scale[2]`) y la franja segura (`scale[0]`): si un auto compartiera color
// con la rana, la carretera dejaría de leerse de un vistazo. El quinto usa
// `danger` — es el heredero del auto rojo del original.
function froggerCars(skin: SkinId): FroggerPalette["cars"] {
  const r = SKIN_RAMP[skin];
  return [r.scale[3], r.scale[1], r.scale[7], r.scale[5], r.danger];
}

export const GAME_PALETTES: GamePalettes = {
  asteroids: {
    // Copia literal, carácter por carácter, de components/games/asteroids/engine.ts
    // antes del refactor de skins. No tocar.
    clasico: {
      bg: "#000",
      ship: "#fff",
      thrust: "rgba(255, 130, 0, 0.85)",
      asteroid: "#fff",
      bullet: "#fff",
      particle: [255, 255, 255],
      powerUp: "#0ff",
      powerUpText: "#0ff",
      hudText: "#fff",
      hudPowerUp: "#0ff",
      lifeIcon: "#fff",
      overlayTitle: "#fff",
      overlaySub: "rgba(255,255,255,0.65)",
    },
    neon: {
      bg: SKIN_RAMP.neon.bg,
      ship: SKIN_RAMP.neon.accent,
      thrust: SKIN_RAMP.neon.warn,
      asteroid: SKIN_RAMP.neon.neutral,
      bullet: SKIN_RAMP.neon.accent2,
      particle: hexToRgb(SKIN_RAMP.neon.ink),
      powerUp: SKIN_RAMP.neon.ok,
      powerUpText: SKIN_RAMP.neon.ok,
      hudText: SKIN_RAMP.neon.ink,
      hudPowerUp: SKIN_RAMP.neon.ok,
      lifeIcon: SKIN_RAMP.neon.accent,
      overlayTitle: SKIN_RAMP.neon.accent,
      overlaySub: SKIN_RAMP.neon.inkDim,
    },
    retro: {
      bg: SKIN_RAMP.retro.bg,
      ship: SKIN_RAMP.retro.ink,
      thrust: SKIN_RAMP.retro.accent,
      asteroid: SKIN_RAMP.retro.scale[5],
      bullet: SKIN_RAMP.retro.accent2,
      particle: hexToRgb(SKIN_RAMP.retro.scale[6]),
      powerUp: SKIN_RAMP.retro.warn,
      powerUpText: SKIN_RAMP.retro.warn,
      hudText: SKIN_RAMP.retro.ink,
      hudPowerUp: SKIN_RAMP.retro.accent,
      lifeIcon: SKIN_RAMP.retro.scale[6],
      overlayTitle: SKIN_RAMP.retro.accent2,
      overlaySub: SKIN_RAMP.retro.inkDim,
    },
  },

  tetris: {
    // Copia literal, carácter por carácter, de lo que había en
    // components/games/tetris/engine.ts antes de existir este archivo:
    // GRID_LINE_COLOR, COLORS[1..8] y el rgba del highlight. No se toca. `bg`
    // no tenía literal propio (el canvas es transparente, hereda el fondo de
    // `.crt-screen`), así que reutiliza el `#000` que ya era su fondo real.
    clasico: {
      bg: "#000",
      grid: "#22222e",
      pieces: [
        "#4dd0e1",
        "#ffd54f",
        "#ba68c8",
        "#81c784",
        "#e57373",
        "#90caf9",
        "#ffb74d",
        "#9e9e9e",
      ],
      highlight: "rgba(255,255,255,0.12)",
    },
    neon: {
      bg: SKIN_RAMP.neon.bg,
      grid: SKIN_RAMP.neon.grid,
      pieces: tetrisPieces("neon"),
      // `clasico` compone el bisel como blanco al 12% de alpha, no un relleno
      // opaco — así se mantiene sutil (clase `veil`, solo techo). `neutral`
      // sólido rompía el techo de 2.20:1 contra las piezas oscuras.
      highlight: withAlpha(SKIN_RAMP.neon.ink, 0.12),
    },
    retro: {
      bg: SKIN_RAMP.retro.bg,
      grid: SKIN_RAMP.retro.grid,
      pieces: tetrisPieces("retro"),
      highlight: withAlpha(SKIN_RAMP.retro.ink, 0.12),
    },
  },

  arkanoid: {
    // Copia literal, carácter por carácter, de components/games/arkanoid/engine.ts
    // antes del refactor de skins. No tocar.
    //
    // Los tokens de sprite van en `null` a propósito: el Arkanoid original no
    // tiene un solo literal de color para la paleta, la pelota ni los
    // ladrillos — son regiones de `/games/arkanoid/spritesheet-breakout.png`.
    // `null` significa "dibujá el atlas tal cual", que es exactamente lo que
    // hacía antes.
    clasico: {
      bg: "#000",
      hudText: "#fff",
      scrim: "rgba(0, 0, 0, 0.6)",
      overlayText: "#fff",
      scrimPause: "rgba(0, 0, 0, 0.65)",
      pauseText: "#fff",
      btnFillActive: "#f0c040",
      btnFillIdle: "#444",
      btnStroke: "#fff",
      btnTextActive: "#000",
      btnTextIdle: "#fff",
      paddle: null,
      ball: null,
      brickRed: null,
      brickYellow: null,
      brickCyan: null,
      brickMagenta: null,
      brickHotpink: null,
      brickGreen: null,
      brickGray: null,
    },
    neon: {
      bg: SKIN_RAMP.neon.bg,
      hudText: SKIN_RAMP.neon.ink,
      scrim: withAlpha(SKIN_RAMP.neon.bg, 0.6),
      overlayText: SKIN_RAMP.neon.accent,
      scrimPause: withAlpha(SKIN_RAMP.neon.bg, 0.65),
      pauseText: SKIN_RAMP.neon.ink,
      btnFillActive: SKIN_RAMP.neon.warn,
      btnFillIdle: SKIN_RAMP.neon.scale[3],
      btnStroke: SKIN_RAMP.neon.ink,
      btnTextActive: SKIN_RAMP.neon.bg,
      btnTextIdle: SKIN_RAMP.neon.bg,
      paddle: SKIN_RAMP.neon.accent,
      ball: SKIN_RAMP.neon.accent2,
      brickRed: SKIN_RAMP.neon.scale[2],
      brickYellow: SKIN_RAMP.neon.scale[6],
      brickCyan: SKIN_RAMP.neon.scale[4],
      brickMagenta: SKIN_RAMP.neon.scale[3],
      brickHotpink: SKIN_RAMP.neon.scale[0],
      brickGreen: SKIN_RAMP.neon.scale[5],
      brickGray: SKIN_RAMP.neon.scale[7],
    },
    retro: {
      bg: SKIN_RAMP.retro.bg,
      hudText: SKIN_RAMP.retro.ink,
      scrim: withAlpha(SKIN_RAMP.retro.bg, 0.6),
      overlayText: SKIN_RAMP.retro.accent,
      scrimPause: withAlpha(SKIN_RAMP.retro.bg, 0.65),
      pauseText: SKIN_RAMP.retro.ink,
      btnFillActive: SKIN_RAMP.retro.warn,
      btnFillIdle: SKIN_RAMP.retro.scale[3],
      btnStroke: SKIN_RAMP.retro.ink,
      btnTextActive: SKIN_RAMP.retro.bg,
      btnTextIdle: SKIN_RAMP.retro.bg,
      // Ver la EXCEPCIÓN de la tabla de mapeo: en monocromo la paleta cede el
      // brillo a la pelota.
      paddle: SKIN_RAMP.retro.scale[3],
      ball: SKIN_RAMP.retro.accent2,
      brickRed: SKIN_RAMP.retro.scale[2],
      brickYellow: SKIN_RAMP.retro.scale[6],
      brickCyan: SKIN_RAMP.retro.scale[4],
      brickMagenta: SKIN_RAMP.retro.scale[3],
      brickHotpink: SKIN_RAMP.retro.scale[0],
      brickGreen: SKIN_RAMP.retro.scale[5],
      brickGray: SKIN_RAMP.retro.scale[7],
    },
  },

  snake: {
    // Copia literal, carácter por carácter, de los colores que el motor de
    // snake tenía hardcodeados antes de la migración. No tocar: `clasico`
    // debe verse exactamente igual que antes.
    clasico: {
      boardBg: "#04150a",
      gridLine: "rgba(57, 255, 106, 0.08)",
      body: "#1f9e46",
      head: "#5dffa0",
      eye: "#04150a",
      // En `clasico` la fruta no lleva plato: se dibuja el sprite tal cual,
      // como siempre. `null` evita introducir un elemento que no existía.
      fruitPlate: null,
    },
    neon: {
      boardBg: SKIN_RAMP.neon.bg,
      gridLine: SKIN_RAMP.neon.grid,
      body: SKIN_RAMP.neon.scale[2],
      head: SKIN_RAMP.neon.scale[6],
      eye: SKIN_RAMP.neon.bg,
      // `danger` (rojo-rosado) queda demasiado cerca en luminancia de
      // `scale[2]` (naranja) para el piso `sibling` de 1.5:1 — `scale[0]`
      // (violeta) despega de cuerpo Y cabeza a la vez.
      fruitPlate: SKIN_RAMP.neon.scale[0],
    },
    retro: {
      boardBg: SKIN_RAMP.retro.bg,
      gridLine: SKIN_RAMP.retro.grid,
      body: SKIN_RAMP.retro.scale[2],
      head: SKIN_RAMP.retro.scale[6],
      eye: SKIN_RAMP.retro.bg,
      // En monocromo `danger` es el único escalón con luminancia lo bastante
      // baja para despegar de cuerpo Y cabeza a la vez (`scale[4]` quedaba a
      // 1.46:1 de `scale[2]`, bajo el piso de 1.5:1).
      fruitPlate: SKIN_RAMP.retro.danger,
    },
  },

  frogger: {
    // Copia literal, carácter por carácter, de las constantes de dibujo que
    // `components/games/frogger/engine.ts` tenía hardcodeadas (NEON_DARK,
    // NEON_SAFE, NEON_GOAL_BG, NEON_GOAL_BORDER, NEON_GREEN, NEON_LOG,
    // NEON_LANE_LINE, CAR_COLORS y los literales sueltos del ojo, el HUD y la
    // barra de tiempo). El motor ya nacía con estética "neón sobre cristal
    // negro" propia; eso NO lo convierte en la skin `neon` — es su look
    // original y por contrato se conserva intacto acá.
    clasico: {
      riverBg: "#050507",
      roadBg: "#050507",
      goalBg: "#04140a",
      safeBg: "#1fae3f",
      goalBorder: "#d4af37",
      goalFilled: "#22ff66",
      frog: "#22ff66",
      frogEye: "#ffffff",
      frogPupil: "#0a0a0a",
      // Era `rgba(34, 255, 102, ${alpha})`: mismo verde que la rana, con alpha
      // dinámico según esté emergida o sumergida.
      turtle: [34, 255, 102],
      log: "#c9862e",
      cars: ["#28d6ff", "#3d7bff", "#ffd400", "#ff2fd6", "#ff3b3b"],
      laneLine: "rgba(255, 255, 255, 0.14)",
      hudScore: "#c9f7ff",
      hudScoreGlow: "#7be6ff",
      hudLevel: "#ff8ae8",
      hudLevelGlow: "#ff2fd6",
      lifeIcon: "#22ff66",
      timeOk: "#22ff66",
      timeWarn: "#ffd400",
      timeDanger: "#ff3b3b",
    },
    neon: {
      riverBg: SKIN_RAMP.neon.bg,
      roadBg: SKIN_RAMP.neon.bg,
      goalBg: SKIN_RAMP.neon.bg,
      safeBg: SKIN_RAMP.neon.scale[0],
      goalBorder: SKIN_RAMP.neon.warn,
      goalFilled: SKIN_RAMP.neon.ok,
      frog: SKIN_RAMP.neon.accent,
      frogEye: SKIN_RAMP.neon.ink,
      frogPupil: SKIN_RAMP.neon.bg,
      turtle: hexToRgb(SKIN_RAMP.neon.ok),
      log: SKIN_RAMP.neon.scale[2],
      cars: froggerCars("neon"),
      laneLine: SKIN_RAMP.neon.grid,
      hudScore: SKIN_RAMP.neon.ink,
      hudScoreGlow: SKIN_RAMP.neon.accent,
      hudLevel: SKIN_RAMP.neon.accent2,
      hudLevelGlow: SKIN_RAMP.neon.accent2,
      lifeIcon: SKIN_RAMP.neon.ok,
      timeOk: SKIN_RAMP.neon.ok,
      timeWarn: SKIN_RAMP.neon.warn,
      timeDanger: SKIN_RAMP.neon.danger,
    },
    retro: {
      riverBg: SKIN_RAMP.retro.bg,
      roadBg: SKIN_RAMP.retro.bg,
      goalBg: SKIN_RAMP.retro.bg,
      safeBg: SKIN_RAMP.retro.scale[0],
      goalBorder: SKIN_RAMP.retro.warn,
      goalFilled: SKIN_RAMP.retro.ok,
      frog: SKIN_RAMP.retro.accent,
      frogEye: SKIN_RAMP.retro.ink,
      frogPupil: SKIN_RAMP.retro.bg,
      turtle: hexToRgb(SKIN_RAMP.retro.ok),
      log: SKIN_RAMP.retro.scale[2],
      cars: froggerCars("retro"),
      laneLine: SKIN_RAMP.retro.grid,
      hudScore: SKIN_RAMP.retro.ink,
      hudScoreGlow: SKIN_RAMP.retro.accent,
      hudLevel: SKIN_RAMP.retro.accent2,
      hudLevelGlow: SKIN_RAMP.retro.accent,
      lifeIcon: SKIN_RAMP.retro.ok,
      timeOk: SKIN_RAMP.retro.ok,
      timeWarn: SKIN_RAMP.retro.warn,
      timeDanger: SKIN_RAMP.retro.danger,
    },
  },
};

// ── Contrato de contraste ───────────────────────────────────────────────────
// Lo consume `scripts/check-skin-contrast.mjs`. Vive acá, junto a las paletas,
// para que el script nunca tenga una lista de juegos escrita a mano.
//
//   play          → elemento jugable vs su fondo            ≥ 3.0:1
//   text          → texto dibujado en canvas vs su fondo    ≥ 4.5:1
//   label-on-fill → etiqueta vs el RELLENO que la contiene   ≥ 4.5:1
//   sibling       → dos colores que deben distinguirse       ≥ 1.5:1
//   decor         → adorno vs su fondo            banda 1.10:1 – 2.20:1
//   veil          → velo de volumen sobre otro token (bisel, brillo
//                   especular) dibujado ENCIMA de un token ya verificado.
//                   Solo techo (≤ 2.20:1), nunca piso: un bisel es sutil por
//                   diseño y no transporta información propia, así que no
//                   hay nada que exigirle leer. El riesgo real es el
//                   opuesto — que un alpha alto lo convierta en una banda
//                   plana que tape el color de abajo — y eso es lo que el
//                   techo atrapa.

export type ContrastClass =
  "play" | "text" | "label-on-fill" | "sibling" | "decor" | "veil";

export interface ContrastRule {
  /**
   * Clave del token dentro de la paleta del juego. Soporta un path con
   * índice de array separado por "." (p. ej. "pieces.0") para paletas que
   * agrupan una familia de colores en un array en vez de campos con nombre.
   */
  token: string;
  /** Clave (o path) contra la que se mide (otro token de la misma paleta). */
  against: string;
  kind: ContrastClass;
  /**
   * Si se define, la regla solo se evalúa para estas skins — nunca para
   * "clasico", que es intocable por contrato. Sin esta propiedad, la regla
   * se evalúa contra las 3. Existe para distinciones que solo son
   * mecánicamente exigibles cuando la skin no tiene matiz propio (p. ej.
   * `retro`, donde toda la distinción es luminancia).
   */
  skins?: readonly SkinId[];
}

export const GAME_CONTRAST_RULES: Record<string, readonly ContrastRule[]> = {
  asteroids: [
    { token: "ship", against: "bg", kind: "play" },
    { token: "thrust", against: "bg", kind: "play" },
    { token: "asteroid", against: "bg", kind: "play" },
    { token: "bullet", against: "bg", kind: "play" },
    { token: "particle", against: "bg", kind: "play" },
    { token: "powerUp", against: "bg", kind: "play" },
    { token: "lifeIcon", against: "bg", kind: "play" },
    { token: "powerUpText", against: "bg", kind: "text" },
    { token: "hudText", against: "bg", kind: "text" },
    { token: "hudPowerUp", against: "bg", kind: "text" },
    { token: "overlayTitle", against: "bg", kind: "text" },
    { token: "overlaySub", against: "bg", kind: "text" },
    // Sin reglas `sibling`: el Asteroides original es monocromo (nave, roca y
    // bala son todas "#fff"), así que exigir que se distingan entre sí haría
    // fallar a `clasico`, que es intocable por contrato.
  ],

  tetris: [
    { token: "grid", against: "bg", kind: "decor" },
    // Las 8 piezas, cada una jugable contra el fondo.
    { token: "pieces.0", against: "bg", kind: "play" }, // I
    { token: "pieces.1", against: "bg", kind: "play" }, // O
    { token: "pieces.2", against: "bg", kind: "play" }, // T
    { token: "pieces.3", against: "bg", kind: "play" }, // S
    { token: "pieces.4", against: "bg", kind: "play" }, // Z
    { token: "pieces.5", against: "bg", kind: "play" }, // J
    { token: "pieces.6", against: "bg", kind: "play" }, // L
    { token: "pieces.7", against: "bg", kind: "play" }, // N (tuerca)
    // El bisel superior de cada bloque, medido contra las 8 piezas sobre las
    // que se dibuja (el color compuesto cambia según la pieza de abajo).
    { token: "highlight", against: "pieces.0", kind: "veil" },
    { token: "highlight", against: "pieces.1", kind: "veil" },
    { token: "highlight", against: "pieces.2", kind: "veil" },
    { token: "highlight", against: "pieces.3", kind: "veil" },
    { token: "highlight", against: "pieces.4", kind: "veil" },
    { token: "highlight", against: "pieces.5", kind: "veil" },
    { token: "highlight", against: "pieces.6", kind: "veil" },
    { token: "highlight", against: "pieces.7", kind: "veil" },
    // Distinción entre tetrominós vecinos: SOLO se exige en `retro`. En
    // `clasico` y `neon` las piezas se distinguen por MATIZ (el diseño
    // original de Tetris y el de la skin neón), y exigirles separación de
    // luminancia sería tanto imposible — 8 elementos, todos obligados a
    // ≥3.0:1 contra el fondo, dejan menos de 7x de rango total, y 1.5^7 ≈
    // 17x — como incorrecto: rompería la paleta clásica, intocable por
    // contrato. En `retro` no hay matiz por definición, la luminancia es el
    // único canal que queda, y ahí el umbral sí es obligatorio.
    {
      token: "pieces.0",
      against: "pieces.1",
      kind: "sibling",
      skins: ["retro"],
    },
    {
      token: "pieces.1",
      against: "pieces.2",
      kind: "sibling",
      skins: ["retro"],
    },
    {
      token: "pieces.2",
      against: "pieces.3",
      kind: "sibling",
      skins: ["retro"],
    },
    {
      token: "pieces.3",
      against: "pieces.4",
      kind: "sibling",
      skins: ["retro"],
    },
    {
      token: "pieces.4",
      against: "pieces.5",
      kind: "sibling",
      skins: ["retro"],
    },
    {
      token: "pieces.5",
      against: "pieces.6",
      kind: "sibling",
      skins: ["retro"],
    },
    {
      token: "pieces.6",
      against: "pieces.7",
      kind: "sibling",
      skins: ["retro"],
    },
  ],

  arkanoid: [
    // Sprites del atlas. En `clasico` estos tokens son `null` (atlas sin
    // teñir) y el verificador se los saltea: no hay color propio que medir.
    { token: "paddle", against: "bg", kind: "play" },
    { token: "ball", against: "bg", kind: "play" },
    { token: "brickRed", against: "bg", kind: "play" },
    { token: "brickYellow", against: "bg", kind: "play" },
    { token: "brickCyan", against: "bg", kind: "play" },
    { token: "brickMagenta", against: "bg", kind: "play" },
    { token: "brickHotpink", against: "bg", kind: "play" },
    { token: "brickGreen", against: "bg", kind: "play" },
    { token: "brickGray", against: "bg", kind: "play" },
    // El único par que el jugador compara lado a lado de verdad: la pelota
    // apoyada sobre la paleta. NO se declaran `sibling` entre ladrillos —
    // los colores de ladrillo no significan nada mecánicamente (todos son de
    // un golpe y 10 puntos) y, además, sería insatisfacible: las filas
    // adyacentes de los 5 niveles forman un K4 entre amarillo/rosa/magenta/
    // cian, y `retro` es de un solo matiz.
    { token: "ball", against: "paddle", kind: "sibling" },
    // Texto en canvas.
    { token: "hudText", against: "bg", kind: "text" },
    { token: "overlayText", against: "scrim", kind: "text" },
    { token: "pauseText", against: "scrimPause", kind: "text" },
    // Botones del selector de nivel, dibujados en el canvas: contraste por los
    // dos lados y en los dos estados.
    { token: "btnFillActive", against: "scrimPause", kind: "play" },
    { token: "btnStroke", against: "scrimPause", kind: "play" },
    // El relleno inactivo va como `sibling` y no como `play`: su afordancia la
    // carga el borde (`btnStroke`, que sí es `play`). El "#444" de `clasico`
    // da 2.16:1 contra el velo y `clasico` es intocable por contrato.
    { token: "btnFillIdle", against: "scrimPause", kind: "sibling" },
    { token: "btnTextActive", against: "btnFillActive", kind: "label-on-fill" },
    { token: "btnTextIdle", against: "btnFillIdle", kind: "label-on-fill" },
  ],

  snake: [
    { token: "body", against: "boardBg", kind: "play" },
    { token: "head", against: "boardBg", kind: "play" },
    // La cabeza debe leerse como distinta del cuerpo de un vistazo.
    { token: "head", against: "body", kind: "sibling" },
    // El ojo se dibuja encima de la cabeza, no del tablero.
    { token: "eye", against: "head", kind: "play" },
    // El plato bajo la fruta marca su posición sobre el tablero...
    { token: "fruitPlate", against: "boardBg", kind: "play" },
    // ...y no puede confundirse ni con el cuerpo ni con la cabeza.
    { token: "fruitPlate", against: "body", kind: "sibling" },
    { token: "fruitPlate", against: "head", kind: "sibling" },
    { token: "gridLine", against: "boardBg", kind: "decor" },
  ],

  frogger: [
    // La rana tiene que leerse en las tres zonas por las que pasa.
    { token: "frog", against: "roadBg", kind: "play" },
    { token: "frog", against: "riverBg", kind: "play" },
    { token: "frog", against: "goalBg", kind: "play" },
    // Plataformas y obstáculos contra el fondo de su zona.
    { token: "turtle", against: "riverBg", kind: "play" },
    { token: "log", against: "riverBg", kind: "play" },
    { token: "cars.0", against: "roadBg", kind: "play" },
    { token: "cars.1", against: "roadBg", kind: "play" },
    { token: "cars.2", against: "roadBg", kind: "play" },
    { token: "cars.3", against: "roadBg", kind: "play" },
    { token: "cars.4", against: "roadBg", kind: "play" },
    // Fila de metas.
    { token: "goalBorder", against: "goalBg", kind: "play" },
    { token: "goalFilled", against: "goalBg", kind: "play" },
    // HUD, vidas y barra de tiempo: todos se dibujan DENTRO de la fila de
    // metas, así que su fondo real es `goalBg`, no el asfalto.
    { token: "hudScore", against: "goalBg", kind: "text" },
    { token: "hudLevel", against: "goalBg", kind: "text" },
    { token: "lifeIcon", against: "goalBg", kind: "play" },
    { token: "timeOk", against: "goalBg", kind: "play" },
    { token: "timeWarn", against: "goalBg", kind: "play" },
    { token: "timeDanger", against: "goalBg", kind: "play" },
    // La pupila se dibuja encima de la esclerótica, no del tablero.
    //
    // NO se declara la esclerótica contra el cuerpo de la rana: en `clasico`
    // el blanco puro sobre el verde brillante da 1.35:1, por debajo incluso
    // del piso `sibling`, y `clasico` es intocable por contrato. Los ojos se
    // leen por forma y por la pupila oscura de adentro, no por su contraste
    // contra el cuerpo.
    { token: "frogPupil", against: "frogEye", kind: "play" },
    // La franja segura es un FONDO, no un objeto: no se le exige `play`. Lo
    // único que importa es que se despegue del asfalto y que la rana siga
    // leyéndose parada encima (en `clasico` esa relación es de 2.17:1 —
    // verde sobre verde —, así que el umbral posible es `sibling`).
    { token: "safeBg", against: "roadBg", kind: "sibling" },
    { token: "frog", against: "safeBg", kind: "sibling" },
    // La rana pasa la mitad del nivel parada sobre un tronco.
    { token: "frog", against: "log", kind: "sibling" },
    // Sin `sibling` entre vehículos, ni entre vehículo y rana: el color del
    // auto no significa nada mecánicamente (todos matan igual, como los
    // ladrillos de Arkanoid) y el original ya empareja la rana verde con el
    // auto amarillo en 1.06:1, así que exigirlo haría fallar a `clasico`.
    // Tampoco `frog` vs `turtle`: en `clasico` son literalmente el mismo
    // "#22ff66".
    { token: "laneLine", against: "roadBg", kind: "decor" },
    { token: "laneLine", against: "riverBg", kind: "decor" },
  ],
};
