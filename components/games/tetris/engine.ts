// Motor de "Tetris" portado 1:1 desde
// references/started-games/03-tetris/game.js a un módulo framework-agnostic.
// Mismas mecánicas, mismo balance. A diferencia de asteroides, el original
// no dibujaba HUD ni overlay en el canvas: aquí tampoco se dibuja ninguno,
// el HUD externo de React y el modal de fin de partida cubren ese rol.

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const GRID_LINE_COLOR = "#22222e";

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

type Shape = number[][];

interface Piece {
  type: number;
  shape: Shape;
  x: number;
  y: number;
}

export interface TetrisCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void; // se llama una vez con 1, nunca cambia
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface TetrisEngineHandle {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

export function createTetrisEngine(
  boardCanvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks
): TetrisEngineHandle {
  const ctx = boardCanvas.getContext("2d") as CanvasRenderingContext2D;
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");
  const nextCtx = nextCanvas.getContext("2d") as CanvasRenderingContext2D;
  if (!nextCtx)
    throw new Error("No se pudo obtener el contexto 2D del next-canvas.");

  // ── Input ───────────────────────────────────────────────────────────────
  // El original procesa cada `keydown` (incluidos los repetidos por el
  // auto-repeat del SO al mantener presionada una flecha) directo en el
  // listener — no hay estado de "tecla sostenida" consultado por frame.
  const GAME_KEYS = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space",
    "KeyX",
  ]);

  function onKeyDown(e: KeyboardEvent) {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (paused || gameOver) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
  }
  window.addEventListener("keydown", onKeyDown);

  // ── Estado del juego ────────────────────────────────────────────────────
  let board: number[][];
  let current: Piece;
  let next: Piece;
  let score = 0;
  let lines = 0;
  let level = 1;
  let paused = false;
  let gameOver = false;
  let dropAccum = 0;
  let dropInterval = 1000;

  function createBoard(): number[][] {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const type = Math.floor(Math.random() * 8) + 1;
    const shape = PIECES[type]!.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape: Shape, ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape: Shape): Shape {
    const rows = shape.length,
      cols = shape[0].length;
    const result: Shape = Array.from({ length: cols }, () =>
      new Array(rows).fill(0)
    );
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      const newLevel = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (newLevel - 1) * 90);
      callbacks.onScoreChange(score);
      if (newLevel !== level) {
        level = newLevel;
        callbacks.onLevelChange(level);
      }
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    callbacks.onScoreChange(score);
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
      callbacks.onScoreChange(score);
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      endGame();
    }
    drawNext();
  }

  function drawBlock(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    colorIndex: number,
    size: number,
    alpha?: number
  ) {
    if (!colorIndex) return;
    const color = COLORS[colorIndex]!;
    context.globalAlpha = alpha ?? 1;
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    // highlight
    context.fillStyle = "rgba(255,255,255,0.12)";
    context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    context.globalAlpha = 1;
  }

  function drawGrid() {
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
    drawGrid();

    // board
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

    // ghost
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            ctx,
            current.x + c,
            gy + r,
            current.shape[r][c],
            BLOCK,
            0.2
          );

    // current piece
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(
          ctx,
          current.x + c,
          current.y + r,
          current.shape[r][c],
          BLOCK
        );
  }

  function drawNext() {
    const NB = 30;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
  }

  function endGame() {
    gameOver = true;
    callbacks.onGameOver(score);
  }

  // ── Loop principal ────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (paused || gameOver) {
      lastTime = null;
      return;
    }
    const dt = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;

    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }

    if (gameOver) return;
    draw();
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    paused = false;
    gameOver = false;
    dropInterval = 1000;
    dropAccum = 0;
    lastTime = null;
    next = randomPiece();
    spawn();
    callbacks.onScoreChange(score);
    callbacks.onLivesChange(1);
    callbacks.onLevelChange(level);
  }

  initGame();
  rafId = requestAnimationFrame(loop);

  return {
    setPaused(p: boolean) {
      paused = p;
    },
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
