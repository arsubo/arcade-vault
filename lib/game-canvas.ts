// Utilidades de canvas compartidas por los 5 motores: contexto opaco y capas
// cacheadas para fondos/grillas estáticas que no necesitan repintarse cada
// frame.

export interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Marca la capa como sucia; se repinta en el próximo `draw`. */
  invalidate: () => void;
  /** `true` si hay que repintar. Se limpia al leerla. */
  consumeDirty: () => boolean;
}

/**
 * Pide el contexto 2D declarando `{ alpha: false }`: los 5 motores pintan un
 * fondo opaco antes que nada, así que el navegador no necesita reservar el
 * canal alfa ni componer el canvas contra lo que haya detrás.
 */
export function getOpaqueContext2D(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");
  return ctx;
}

/**
 * Canvas fuera de pantalla para cachear el dibujo de elementos estáticos
 * (fondos, grillas) y blitearlos con un solo `drawImage` por frame en vez de
 * repetir decenas de operaciones de dibujo. Nace sucia: el primer `draw` del
 * consumidor la pinta.
 */
export function createLayer(width: number, height: number): Layer {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = getOpaqueContext2D(canvas);

  let dirty = true;

  return {
    canvas,
    ctx,
    invalidate: () => {
      dirty = true;
    },
    consumeDirty: () => {
      if (!dirty) return false;
      dirty = false;
      return true;
    },
  };
}
