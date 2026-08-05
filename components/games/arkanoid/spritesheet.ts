export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export const EXPLOSION_FRAMES: Record<string, Frame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

export const EXPLOSION_DURATION = 150;

export const SPRITES: Record<string, Frame> = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  block_gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  block_red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  block_yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  block_cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  block_magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  block_hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  block_green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

let ssImg: HTMLCanvasElement | null = null;
let ssLoaded = false;
const ssCallbacks: (() => void)[] = [];

export function loadSpritesheet(cb: () => void): void {
  if (ssLoaded) {
    cb();
    return;
  }
  ssCallbacks.push(cb);
  if (ssImg) return;

  const rawImg = new Image();
  rawImg.onload = () => {
    const oc = document.createElement("canvas");
    oc.width = rawImg.width;
    oc.height = rawImg.height;
    const octx = oc.getContext("2d") as CanvasRenderingContext2D;
    octx.drawImage(rawImg, 0, 0);
    ssImg = oc;
    ssLoaded = true;
    ssCallbacks.forEach((f) => f());
  };
  rawImg.onerror = () => console.error("Failed to load spritesheet");
  rawImg.src = "/games/arkanoid/spritesheet-breakout.png";
}

/** Atlas ya decodificado (el original o una copia teñida). */
export type SpriteSheet = HTMLCanvasElement;

/** El atlas tal cual vino del PNG. Es el que usa la skin `clasico`. */
export function getBaseSheet(): SpriteSheet | null {
  return ssLoaded ? ssImg : null;
}

export interface TintRegion {
  frame: Frame;
  color: string;
}

/**
 * Opacidad del tinte. Por debajo de 1 a propósito: deja pasar entre el 10% y
 * el 20% del pixel-art original, que es lo que conserva el bisel/sombreado de
 * los sprites. Con 1.0 los ladrillos quedan como rectángulos planos.
 */
const TINT_ALPHA = 0.85;

/**
 * Copia del atlas con algunas regiones teñidas.
 *
 * Tiñe con `clip` + `source-atop` para no pisar los píxeles transparentes de
 * alrededor, y dedupea por coordenada de origen: `EXPLOSION_FRAMES.gray`
 * apunta a EXACTAMENTE las mismas coordenadas que `EXPLOSION_FRAMES.red`, y
 * encadenar dos tintes sobre la misma región daría un color que no es ninguno
 * de los dos. Gana el primero de la lista.
 */
export function buildTintedSheet(
  regions: readonly TintRegion[]
): SpriteSheet | null {
  if (!ssLoaded || !ssImg) return null;

  const oc = document.createElement("canvas");
  oc.width = ssImg.width;
  oc.height = ssImg.height;
  const octx = oc.getContext("2d");
  if (!octx) return null;
  octx.drawImage(ssImg, 0, 0);

  const painted = new Set<string>();
  for (const { frame, color } of regions) {
    const key = `${frame.sx},${frame.sy},${frame.sw},${frame.sh}`;
    if (painted.has(key)) continue;
    painted.add(key);

    octx.save();
    octx.beginPath();
    octx.rect(frame.sx, frame.sy, frame.sw, frame.sh);
    octx.clip();
    octx.globalCompositeOperation = "source-atop";
    octx.globalAlpha = TINT_ALPHA;
    octx.fillStyle = color;
    octx.fillRect(frame.sx, frame.sy, frame.sw, frame.sh);
    octx.restore();
  }

  return oc;
}

// La hoja va SIEMPRE como argumento explícito y nunca como variable global
// mutable: durante un cambio de skin conviven la hoja vieja y la nueva, y una
// global haría que un frame a medio dibujar mezclara las dos.
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet | null,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  if (!sheet) return;
  ctx.drawImage(sheet, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet | null,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  if (!sheet) return;
  const sp = SPRITES[name];
  if (!sp) return;
  ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}
