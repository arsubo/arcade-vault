// Motor de "Frogger" implementado desde cero (sin código de origen, sin
// sprites bitmap: todo se dibuja con primitivas canvas). Cuadrícula de 16x14
// celdas de 40px dividida en 5 zonas fijas por fila: metas (0), río (1-6),
// zona segura media (7), carretera (8-12), inicio (13).
//
// Todo el color sale de `GAME_PALETTES.frogger` (lib/skins.ts) y entra como
// dato explícito por el parámetro `skin` — el motor nunca lee el DOM para
// averiguar de qué color pintar. `setVirtualKey` rutea al mismo
// `handleDirectionKey` que usa el listener de teclado — sin lógica
// duplicada.

import { GAME_PALETTES, type SkinId } from "@/lib/skins";
import { createLayer, getOpaqueContext2D, type Layer } from "@/lib/game-canvas";
import type { GameEngineHandle } from "../types";
import type { FroggerPalette } from "./palette";

export const COLS = 16;
export const ROWS = 14;
export const CELL = 40;
export const CANVAS_W = COLS * CELL; // 640
export const CANVAS_H = ROWS * CELL; // 560

export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;

const ROAD_ROWS = [8, 9, 10, 11, 12];
const RIVER_ROWS = [1, 2, 3, 4, 5, 6];

const ROAD_SPEED_MIN = 1.5;
const ROAD_SPEED_MAX = 4;
const RIVER_SPEED_MIN = 1;
const RIVER_SPEED_MAX = 3;
const LEVEL_SPEED_FACTOR = 1.15;

const ROAD_MIN_GAP_CELLS = 2;
const RIVER_MIN_GAP_CELLS = 1;

const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGED_MS = 1500;
const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;

export type Direction = "up" | "down" | "left" | "right";

export interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}

export interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  /** Solo tortugas: fase (ms) dentro del ciclo visible/sumergida, offset por grupo. */
  submergeTimer?: number;
}

export interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function levelSpeedMultiplier(level: number): number {
  return Math.pow(LEVEL_SPEED_FACTOR, level - 1);
}

function buildRoadLane(row: number, laneIndex: number, level: number): Lane {
  const dir: 1 | -1 = laneIndex % 2 === 0 ? 1 : -1;
  const speed =
    randRange(ROAD_SPEED_MIN, ROAD_SPEED_MAX) * levelSpeedMultiplier(level);

  const entities: Entity[] = [];
  let cursor = randRange(0, CELL * 3);
  const trackEnd = CANVAS_W * 2;
  while (cursor < trackEnd) {
    const isTruck = Math.random() < 0.35;
    const widthCells = isTruck
      ? Math.floor(randRange(2, 4))
      : Math.floor(randRange(1, 3));
    const width = widthCells * CELL;
    entities.push({ col: cursor, width, type: isTruck ? "truck" : "car" });
    cursor +=
      width + randRange(ROAD_MIN_GAP_CELLS, ROAD_MIN_GAP_CELLS + 3) * CELL;
  }

  return { row, speed, dir, entities };
}

function buildRiverLane(row: number, laneIndex: number, level: number): Lane {
  const dir: 1 | -1 = laneIndex % 2 === 0 ? -1 : 1;
  const speed =
    randRange(RIVER_SPEED_MIN, RIVER_SPEED_MAX) * levelSpeedMultiplier(level);
  const isTurtleLane = laneIndex % 2 === 1;

  const entities: Entity[] = [];
  let cursor = randRange(0, CELL * 3);
  const trackEnd = CANVAS_W * 2;
  while (cursor < trackEnd) {
    const widthCells = isTurtleLane
      ? Math.floor(randRange(2, 4))
      : Math.floor(randRange(2, 5));
    const width = widthCells * CELL;
    entities.push({
      col: cursor,
      width,
      type: isTurtleLane ? "turtle" : "log",
      submerged: false,
      submergeTimer: isTurtleLane ? randRange(0, TURTLE_CYCLE_MS) : undefined,
    });
    cursor +=
      width + randRange(RIVER_MIN_GAP_CELLS, RIVER_MIN_GAP_CELLS + 2) * CELL;
  }

  return { row, speed, dir, entities };
}

export function buildLanes(level: number): Lane[] {
  const roadLanes = ROAD_ROWS.map((row, i) => buildRoadLane(row, i, level));
  const riverLanes = RIVER_ROWS.map((row, i) => buildRiverLane(row, i, level));
  return [...roadLanes, ...riverLanes];
}

// ── Salto de la rana ────────────────────────────────────────────────────────
const ANIM_MS = 120;
const GOAL_COUNT = 5;
const GOAL_WIDTH_COLS = 2;
const GOAL_SPAN_COLS = 3; // 2 columnas de boca + 1 de separador

const POINTS_PER_ADVANCE = 10;
const POINTS_PER_GOAL = 50;
const POINTS_PER_ROUND = 200;
const TIME_BONUS_PER_SEC = 10;

const INITIAL_ROUND_MS = 15000;
const ROUND_TIME_STEP_MS = 1000;
const MIN_ROUND_MS = 6000;

const INITIAL_LIVES = 3;

const DIRECTION_DELTA: Record<Direction, { col: number; row: number }> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function goalIndexForCol(col: number): number | null {
  const c = Math.round(col);
  for (let i = 0; i < GOAL_COUNT; i++) {
    const start = 1 + i * GOAL_SPAN_COLS;
    if (c >= start && c < start + GOAL_WIDTH_COLS) return i;
  }
  return null;
}

function roundMsForLevel(level: number): number {
  return Math.max(
    MIN_ROUND_MS,
    INITIAL_ROUND_MS - (level - 1) * ROUND_TIME_STEP_MS
  );
}

export interface FroggerCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  /** Diagnóstico de rendimiento: una vez por frame de rAF, se pause o no. */
  onFrame?: () => void;
}

export type FroggerEngineHandle = GameEngineHandle;

function paletteFor(skin: SkinId): FroggerPalette {
  return GAME_PALETTES.frogger[skin];
}

export function createFroggerEngine(
  canvas: HTMLCanvasElement,
  callbacks: FroggerCallbacks,
  skin: SkinId
): FroggerEngineHandle {
  const ctx = getOpaqueContext2D(canvas);
  const bgLayer: Layer = createLayer(CANVAS_W, CANVAS_H);

  // ── Estado del juego ────────────────────────────────────────────────────
  let lanes: Lane[] = buildLanes(1);
  let level = 1;
  let score = 0;
  let lives = INITIAL_LIVES;
  let goals: boolean[] = new Array(GOAL_COUNT).fill(false);
  let bestRowReached = ROW_START;
  let currentRoundMs = roundMsForLevel(level);
  let roundTimer = currentRoundMs;
  let paused = false;
  let gameOver = false;
  let pendingDir: Direction | null = null;

  const centerCol = Math.floor(COLS / 2);
  const frog: Frog = {
    col: centerCol,
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: centerCol,
    targetRow: ROW_START,
  };

  function respawnFrogAtStart() {
    frog.col = centerCol;
    frog.row = ROW_START;
    frog.animating = false;
    frog.animT = 0;
    frog.targetCol = centerCol;
    frog.targetRow = ROW_START;
  }

  // ── Colisión y soporte ──────────────────────────────────────────────────
  function checkRoadCollision(): boolean {
    const centerPx = frog.col * CELL + CELL / 2;
    for (const lane of lanes) {
      if (lane.row !== frog.row) continue;
      for (const e of lane.entities) {
        if (e.type !== "car" && e.type !== "truck") continue;
        if (centerPx >= e.col && centerPx < e.col + e.width) return true;
      }
    }
    return false;
  }

  function getSupport(): { lane: Lane; entity: Entity } | null {
    const centerPx = frog.col * CELL + CELL / 2;
    for (const lane of lanes) {
      if (lane.row !== frog.row) continue;
      for (const e of lane.entities) {
        if (e.type !== "log" && e.type !== "turtle") continue;
        if (centerPx >= e.col && centerPx < e.col + e.width) {
          if (e.type === "turtle" && e.submerged) return null;
          return { lane, entity: e };
        }
      }
    }
    return null;
  }

  // ── Ronda y muerte ──────────────────────────────────────────────────────
  function killFrog() {
    lives -= 1;
    callbacks.onLivesChange(lives);
    if (lives <= 0) {
      callbacks.onLivesChange(0);
      gameOver = true;
      callbacks.onGameOver(score);
      return;
    }
    respawnFrogAtStart();
    roundTimer = currentRoundMs;
  }

  function completeRound() {
    level += 1;
    callbacks.onLevelChange(level);
    goals = new Array(GOAL_COUNT).fill(false);
    bestRowReached = ROW_START;
    lanes = buildLanes(level);
    currentRoundMs = roundMsForLevel(level);
    roundTimer = currentRoundMs;
    respawnFrogAtStart();
    bgLayer.invalidate();
  }

  function resolveLanding() {
    if (frog.row < bestRowReached) {
      bestRowReached = frog.row;
      score += POINTS_PER_ADVANCE;
      callbacks.onScoreChange(score);
    }

    if (frog.row === ROW_GOALS) {
      const goalIndex = goalIndexForCol(frog.col);
      if (goalIndex === null || goals[goalIndex]) {
        killFrog();
        return;
      }
      goals[goalIndex] = true;
      bgLayer.invalidate();
      score +=
        POINTS_PER_GOAL + Math.floor(roundTimer / 1000) * TIME_BONUS_PER_SEC;
      callbacks.onScoreChange(score);
      if (goals.every(Boolean)) {
        score += POINTS_PER_ROUND;
        callbacks.onScoreChange(score);
        completeRound();
      } else {
        respawnFrogAtStart();
        roundTimer = currentRoundMs;
      }
      return;
    }

    if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
      if (checkRoadCollision()) killFrog();
    }
  }

  // ── Input ───────────────────────────────────────────────────────────────
  function tryStartJump(dir: Direction) {
    const delta = DIRECTION_DELTA[dir];
    const targetCol = Math.round(frog.col) + delta.col;
    const targetRow = frog.row + delta.row;
    if (targetCol < 0 || targetCol > COLS - 1) return;
    if (targetRow < 0 || targetRow > ROWS - 1) return;
    frog.animating = true;
    frog.animT = 0;
    frog.targetCol = targetCol;
    frog.targetRow = targetRow;
  }

  function handleDirectionKey(code: string) {
    const dir = KEY_TO_DIRECTION[code];
    if (!dir || frog.animating) return;
    pendingDir = dir;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!KEY_TO_DIRECTION[e.code]) return;
    e.preventDefault();
    handleDirectionKey(e.code);
  }

  document.addEventListener("keydown", onKeyDown);

  // ── Update ──────────────────────────────────────────────────────────────
  function update(dt: number) {
    for (const lane of lanes) {
      for (const e of lane.entities) {
        e.col += lane.speed * lane.dir * (dt / 16);
        if (lane.dir === 1 && e.col > CANVAS_W) {
          e.col = -e.width;
        } else if (lane.dir === -1 && e.col + e.width < 0) {
          e.col = CANVAS_W;
        }
        if (e.type === "turtle") {
          e.submergeTimer = (e.submergeTimer ?? 0) + dt;
          const phase = e.submergeTimer % TURTLE_CYCLE_MS;
          e.submerged = phase >= TURTLE_VISIBLE_MS;
        }
      }
    }

    if (frog.animating) {
      frog.animT += dt;
      if (frog.animT >= ANIM_MS) {
        frog.animating = false;
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        resolveLanding();
      }
    } else {
      if (pendingDir) {
        tryStartJump(pendingDir);
        pendingDir = null;
      }
      if (
        !frog.animating &&
        frog.row >= ROW_RIVER_TOP &&
        frog.row <= ROW_RIVER_BOT
      ) {
        const support = getSupport();
        if (!support) {
          killFrog();
        } else {
          frog.col +=
            (support.lane.speed * support.lane.dir * (dt / 16)) / CELL;
          if (frog.col < 0 || frog.col > COLS - 1) killFrog();
        }
      } else if (
        !frog.animating &&
        frog.row >= ROW_ROAD_TOP &&
        frog.row <= ROW_ROAD_BOT &&
        checkRoadCollision()
      ) {
        killFrog();
      }
    }

    if (!gameOver) {
      roundTimer -= dt;
      if (roundTimer <= 0) {
        roundTimer = 0;
        killFrog();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────
  // La estética de cada skin la fija la paleta; la geometría (contornos con
  // shadowBlur en vez de relleno sólido) es del motor y no cambia.
  // `let`: `setSkin` la reasigna en vivo (no es `const` aunque el linter lo
  // sugiera mirando solo hasta acá).
  let pal = paletteFor(skin);

  /** `rgba(...)` de la tortuga compuesto al vuelo: su alpha es dinámico. */
  function turtleColor(alpha: number): string {
    const [r, g, b] = pal.turtle;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function glowOn(
    context: CanvasRenderingContext2D,
    color: string,
    blur: number,
    paint: () => void
  ) {
    context.save();
    context.shadowColor = color;
    context.shadowBlur = blur;
    paint();
    context.restore();
  }

  function glow(color: string, blur: number, paint: () => void) {
    glowOn(ctx, color, blur, paint);
  }

  function zoneColor(row: number): string {
    if (row === ROW_GOALS) return pal.goalBg;
    if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return pal.riverBg;
    if (row === ROW_SAFE_MID || row === ROW_START) return pal.safeBg;
    return pal.roadBg;
  }

  /**
   * Fondo estático (zonas, bocas de meta, líneas divisorias) cambia solo en
   * `setSkin`, `completeRound` y captura de meta — se pinta una vez en
   * `bgLayer` y el frame a frame se limita a un `drawImage`.
   */
  function paintBackgroundLayer() {
    const bctx = bgLayer.ctx;
    for (let row = 0; row < ROWS; row++) {
      bctx.fillStyle = zoneColor(row);
      bctx.fillRect(0, row * CELL, CANVAS_W, CELL);
    }

    // Bocas destino: borde dorado brillante; huecos entre bocas quedan con el
    // fondo oscuro de la fila de metas (letales si la rana cae ahí).
    for (let i = 0; i < GOAL_COUNT; i++) {
      const startCol = 1 + i * GOAL_SPAN_COLS;
      const x = startCol * CELL;
      const y = ROW_GOALS * CELL;
      const w = GOAL_WIDTH_COLS * CELL;
      glowOn(bctx, pal.goalBorder, 6, () => {
        bctx.strokeStyle = pal.goalBorder;
        bctx.lineWidth = 2;
        bctx.strokeRect(x + 2, y + 2, w - 4, CELL - 4);
      });
      if (goals[i]) {
        glowOn(bctx, pal.goalFilled, 8, () => {
          bctx.fillStyle = pal.goalFilled;
          bctx.beginPath();
          bctx.ellipse(x + w / 2, y + CELL / 2, 10, 8, 0, 0, Math.PI * 2);
          bctx.fill();
        });
      }
    }

    bctx.save();
    bctx.strokeStyle = pal.laneLine;
    bctx.lineWidth = 2;
    bctx.setLineDash([10, 10]);
    for (const row of [...ROAD_ROWS, ...RIVER_ROWS]) {
      const y = row * CELL + CELL / 2;
      bctx.beginPath();
      bctx.moveTo(0, y);
      bctx.lineTo(CANVAS_W, y);
      bctx.stroke();
    }
    bctx.restore();
  }

  function carColorIndex(e: Entity): number {
    return Math.abs(Math.round(e.col)) % pal.cars.length;
  }

  function drawEntity(e: Entity, row: number) {
    const y = row * CELL;
    if (e.type === "car" || e.type === "truck") {
      const color = pal.cars[carColorIndex(e)];
      glow(color, 10, () => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(e.col + 2, y + 6, e.width - 4, CELL - 12, 4);
        ctx.stroke();
        if (e.type === "truck") {
          ctx.beginPath();
          ctx.moveTo(e.col + e.width - 14, y + 6);
          ctx.lineTo(e.col + e.width - 14, y + CELL - 6);
          ctx.stroke();
        }
      });
    } else if (e.type === "log") {
      glow(pal.log, 6, () => {
        ctx.strokeStyle = pal.log;
        ctx.lineWidth = 2;
        ctx.strokeRect(e.col + 1, y + 8, e.width - 2, CELL - 16);
        for (let lx = e.col + 10; lx < e.col + e.width - 4; lx += 14) {
          ctx.beginPath();
          ctx.moveTo(lx, y + 8);
          ctx.lineTo(lx, y + CELL - 8);
          ctx.stroke();
        }
      });
    } else {
      const alpha = e.submerged ? 0.25 : 1;
      const groupCells = Math.round(e.width / CELL);
      glow(turtleColor(1), e.submerged ? 0 : 12, () => {
        ctx.fillStyle = turtleColor(alpha);
        for (let i = 0; i < groupCells; i++) {
          ctx.beginPath();
          ctx.ellipse(
            e.col + i * CELL + CELL / 2,
            y + CELL / 2,
            CELL * 0.42,
            CELL * 0.32,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      });
    }
  }

  function drawFrog() {
    const t = frog.animating ? frog.animT / ANIM_MS : 1;
    const visualCol = frog.col + (frog.targetCol - frog.col) * t;
    const visualRow = frog.row + (frog.targetRow - frog.row) * t;
    const cx = visualCol * CELL + CELL / 2;
    const cy = visualRow * CELL + CELL / 2;
    const hop = frog.animating ? Math.sin(Math.PI * t) * 6 : 0;

    glow(pal.frog, 14, () => {
      ctx.fillStyle = pal.frog;
      ctx.beginPath();
      ctx.ellipse(cx, cy - hop, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = pal.frogEye;
    ctx.beginPath();
    ctx.arc(cx - 5, cy - hop - 6, 3, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - hop - 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.frogPupil;
    ctx.beginPath();
    ctx.arc(cx - 5, cy - hop - 6, 1.4, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - hop - 6, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHud() {
    ctx.font = "16px monospace";
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    glow(pal.hudScoreGlow, 6, () => {
      ctx.fillStyle = pal.hudScore;
      ctx.fillText(`SCORE ${String(score).padStart(6, "0")}`, 8, CELL / 2);
    });

    ctx.textAlign = "center";
    glow(pal.hudLevelGlow, 6, () => {
      ctx.fillStyle = pal.hudLevel;
      ctx.fillText(
        `LVL ${String(level).padStart(2, "0")}`,
        CANVAS_W / 2,
        CELL / 2
      );
    });

    ctx.textAlign = "right";
    for (let i = 0; i < lives; i++) {
      glow(pal.lifeIcon, 8, () => {
        ctx.fillStyle = pal.lifeIcon;
        ctx.beginPath();
        ctx.arc(CANVAS_W - 12 - i * 18, CELL / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const frac = Math.max(0, roundTimer / currentRoundMs);
    const timeColor =
      frac > 0.5 ? pal.timeOk : frac > 0.25 ? pal.timeWarn : pal.timeDanger;
    glow(timeColor, 8, () => {
      ctx.fillStyle = timeColor;
      ctx.fillRect(0, 0, CANVAS_W * frac, 4);
    });
  }

  function draw() {
    if (bgLayer.consumeDirty()) paintBackgroundLayer();
    ctx.drawImage(bgLayer.canvas, 0, 0);
    for (const lane of lanes) {
      for (const e of lane.entities) drawEntity(e, lane.row);
    }
    drawFrog();
    drawHud();
  }

  // ── Loop principal ──────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    callbacks.onFrame?.();
    if (lastTime === null) {
      lastTime = ts;
      draw();
      return;
    }
    const dt = ts - lastTime;
    lastTime = ts;
    if (!paused && !gameOver) update(dt);
    draw();
  }

  // ── Inicio ──────────────────────────────────────────────────────────────
  callbacks.onScoreChange(score);
  callbacks.onLivesChange(lives);
  callbacks.onLevelChange(level);
  rafId = requestAnimationFrame(loop);

  return {
    setPaused(p: boolean) {
      paused = p;
    },
    setSkin(next: SkinId) {
      pal = paletteFor(next);
      bgLayer.invalidate();
      // Repintado inmediato en vez de esperar al próximo frame: el jugador
      // suele tocar el selector con la partida en pausa, y el cambio de skin
      // repinta en vivo — nunca reinicia ni altera el estado del juego.
      draw();
    },
    setVirtualKey(code: string, down: boolean) {
      // Motor sin `keyup`: solo reacciona al flanco de bajada del dedo, igual
      // que `onKeyDown` ignora `keyup` por completo.
      if (down) handleDirectionKey(code);
    },
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", onKeyDown);
    },
  };
}
