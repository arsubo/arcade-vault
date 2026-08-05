// Motor de "Snake" implementado desde cero (sin código de origen) sobre una
// grilla clásica de 20x20 con wrap-around en los 4 bordes. El HUD (score,
// vidas, nivel) vive exclusivamente en React — el canvas solo dibuja
// tablero, serpiente y fruta.

import { FRUITS, FRUIT_KEYS, FRUITS_SRC } from "./sprites";
import type { GameEngineHandle } from "../types";

const GRID_SIZE = 20;
const CELL = 30;
const BOARD_PX = GRID_SIZE * CELL; // 600

const INITIAL_TICK_MS = 150;
const TICK_STEP_MS = 10;
const MIN_TICK_MS = 60;
const POINTS_PER_FRUIT = 10;
const POINTS_PER_LEVEL = 50;
const INITIAL_LENGTH = 3;
const INITIAL_LIVES = 3;
const MAX_TICKS_PER_FRAME = 5;

type Direction = "up" | "down" | "left" | "right";

interface Cell {
  x: number;
  y: number;
}

const DIRECTION_VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function wrap(n: number): number {
  return (n + GRID_SIZE) % GRID_SIZE;
}

export interface SnakeCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export type SnakeEngineHandle = GameEngineHandle;

export function createSnakeEngine(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks
): SnakeEngineHandle {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");

  // ── Assets ──────────────────────────────────────────────────────────────
  const fruitsImg = new Image();
  let fruitsLoaded = false;
  fruitsImg.onload = () => {
    fruitsLoaded = true;
  };
  fruitsImg.src = FRUITS_SRC;

  // ── Estado del juego ────────────────────────────────────────────────────
  let snake: Cell[] = [];
  let direction: Direction = "right";
  let queuedDirection: Direction = "right";
  let fruit: { cell: Cell; key: string } | null = null;
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let tickMs = INITIAL_TICK_MS;
  let gameOver = false;
  let paused = false;

  function centerCell(): Cell {
    const c = Math.floor(GRID_SIZE / 2);
    return { x: c, y: c };
  }

  function resetSnake() {
    const c = centerCell();
    snake = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
      x: c.x - i,
      y: c.y,
    }));
    direction = "right";
    queuedDirection = "right";
  }

  function randomFreeCell(): Cell {
    let cell: Cell;
    do {
      cell = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some((s) => s.x === cell.x && s.y === cell.y));
    return cell;
  }

  function spawnFruit() {
    const key = FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)];
    fruit = { cell: randomFreeCell(), key };
  }

  function applyLevelForScore() {
    const newLevel = Math.floor(score / POINTS_PER_LEVEL) + 1;
    if (newLevel !== level) {
      level = newLevel;
      tickMs = Math.max(
        MIN_TICK_MS,
        INITIAL_TICK_MS - (level - 1) * TICK_STEP_MS
      );
      callbacks.onLevelChange(level);
    }
  }

  function step() {
    if (gameOver) return;

    direction = queuedDirection;
    const vec = DIRECTION_VECTORS[direction];
    const head = snake[0];
    const newHead: Cell = { x: wrap(head.x + vec.x), y: wrap(head.y + vec.y) };

    const willEatFruit =
      fruit !== null &&
      newHead.x === fruit.cell.x &&
      newHead.y === fruit.cell.y;
    const bodyToCheck = willEatFruit ? snake : snake.slice(0, -1);
    const hitSelf = bodyToCheck.some(
      (s) => s.x === newHead.x && s.y === newHead.y
    );

    if (hitSelf) {
      lives -= 1;
      callbacks.onLivesChange(lives);
      if (lives <= 0) {
        gameOver = true;
        callbacks.onGameOver(score);
        return;
      }
      resetSnake();
      if (
        fruit &&
        snake.some((s) => s.x === fruit!.cell.x && s.y === fruit!.cell.y)
      ) {
        spawnFruit();
      }
      return;
    }

    snake.unshift(newHead);
    if (willEatFruit) {
      score += POINTS_PER_FRUIT;
      callbacks.onScoreChange(score);
      applyLevelForScore();
      spawnFruit();
    } else {
      snake.pop();
    }
  }

  // ── Input ───────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    const dir = KEY_TO_DIRECTION[e.code];
    if (!dir) return;
    e.preventDefault();
    if (dir === OPPOSITE[direction]) return;
    queuedDirection = dir;
  }

  document.addEventListener("keydown", onKeyDown);

  // ── Draw ────────────────────────────────────────────────────────────────
  const BOARD_BG = "#04150a";
  const GRID_LINE = "rgba(57, 255, 106, 0.08)";
  const BODY_COLOR = "#1f9e46";
  const HEAD_COLOR = "#5dffa0";
  const SEGMENT_RADIUS = 7;

  function drawBoard() {
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = i * CELL + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, BOARD_PX);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(BOARD_PX, p);
      ctx.stroke();
    }
  }

  function drawFruit() {
    if (!fruit || !fruitsLoaded) return;
    const rect = FRUITS[fruit.key];
    const px = fruit.cell.x * CELL;
    const py = fruit.cell.y * CELL;
    ctx.drawImage(
      fruitsImg,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      px + 2,
      py + 2,
      CELL - 4,
      CELL - 4
    );
  }

  function drawHeadEyes(px: number, py: number) {
    const vec = DIRECTION_VECTORS[direction];
    const cx = px + CELL / 2;
    const cy = py + CELL / 2;
    const spread = CELL * 0.22;
    const forward = CELL * 0.16;
    const perpX = -vec.y;
    const perpY = vec.x;

    ctx.fillStyle = "#04150a";
    for (const side of [-1, 1]) {
      const ex = cx + vec.x * forward + perpX * spread * side;
      const ey = cy + vec.y * forward + perpY * spread * side;
      ctx.beginPath();
      ctx.arc(ex, ey, CELL * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSnake() {
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const px = seg.x * CELL;
      const py = seg.y * CELL;
      const isHead = i === 0;

      ctx.fillStyle = isHead ? HEAD_COLOR : BODY_COLOR;
      ctx.beginPath();
      ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, SEGMENT_RADIUS);
      ctx.fill();

      if (isHead) drawHeadEyes(px, py);
    }
  }

  function draw() {
    drawBoard();
    drawFruit();
    drawSnake();
  }

  // ── Loop principal (por tick, con acumulador de tiempo) ────────────────
  let acc = 0;
  let lastTime: number | null = null;
  let rafId: number | null = null;

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);

    if (paused) {
      lastTime = null;
      acc = 0;
      draw();
      return;
    }
    if (lastTime === null) {
      lastTime = ts;
      draw();
      return;
    }

    acc += ts - lastTime;
    lastTime = ts;

    let ticks = 0;
    while (acc >= tickMs && ticks < MAX_TICKS_PER_FRAME && !gameOver) {
      acc -= tickMs;
      step();
      ticks++;
    }
    if (ticks >= MAX_TICKS_PER_FRAME) acc = 0;

    draw();
  }

  // ── Inicio ──────────────────────────────────────────────────────────────
  resetSnake();
  spawnFruit();
  callbacks.onScoreChange(score);
  callbacks.onLivesChange(lives);
  callbacks.onLevelChange(level);
  rafId = requestAnimationFrame(loop);

  return {
    setPaused(p: boolean) {
      paused = p;
    },
    // TODO(skin-designer): Snake todavía no tiene paletas. No-op hasta que le
    // toque su corrida — el contrato ya lo exige, la implementación no.
    setSkin() {},
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", onKeyDown);
    },
  };
}
