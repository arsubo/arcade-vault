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
// ============================================================================

// Ruta relativa a propósito (no el alias `@/`): `scripts/check-skin-contrast.mjs`
// importa este archivo con el type-stripping nativo de Node, que no conoce los
// alias de `tsconfig.json`.
import type { AsteroidsPalette } from "../components/games/asteroids/palette";

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

// ── Paletas por juego ───────────────────────────────────────────────────────
// Se llena de a UN juego por corrida del subagente `skin-designer`. Que un
// juego no esté acá no es un error: es que todavía no le tocó.

export interface GamePalettes {
  asteroids: Record<SkinId, AsteroidsPalette>;
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

export type ContrastClass =
  "play" | "text" | "label-on-fill" | "sibling" | "decor";

export interface ContrastRule {
  /** Clave del token dentro de la paleta del juego. */
  token: string;
  /** Clave contra la que se mide (otro token de la misma paleta). */
  against: string;
  kind: ContrastClass;
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
};
