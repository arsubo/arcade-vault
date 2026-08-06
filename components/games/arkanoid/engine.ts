// Motor de "Arkanoid" portado 1:1 desde
// references/started-games/04-arkanoid/{game.js,levels.js,assets/spritesheet.js}
// a un módulo framework-agnostic. Mismas mecánicas, mismo balance, mismo
// HUD/overlays (score/nivel/vidas, GAME OVER, victoria, pausa con selector
// de nivel) dibujados en canvas.

import { GAME_PALETTES, type SkinId } from "@/lib/skins";
import type { GameEngineHandle } from "../types";
import { LEVELS } from "./levels";
import {
  BRICK_TOKEN,
  type ArkanoidBrickColor,
  type ArkanoidPalette,
} from "./palette";
import {
  buildTintedSheet,
  drawFrame,
  drawSprite,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  getBaseSheet,
  loadSpritesheet,
  SPRITES,
  type SpriteSheet,
  type TintRegion,
} from "./spritesheet";

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_H = 24;
const BLOCK_W = 64;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

const PAUSE_BTN_W = 60;
const PAUSE_BTN_H = 40;
const PAUSE_BTN_GAP = 12;
const PAUSE_BTN_Y = 340;
const PAUSE_BTN_ROW_X = (W - (5 * PAUSE_BTN_W + 4 * PAUSE_BTN_GAP)) / 2;

type GameState = "playing" | "gameover" | "win";

interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
}

export interface ArkanoidCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export type ArkanoidEngineHandle = GameEngineHandle;

// ── Atlas teñido por skin ───────────────────────────────────────────────────
// Una hoja por skin, cacheada a nivel de módulo: las paletas son estáticas, así
// que teñir dos veces la misma skin no puede dar un resultado distinto. La
// caché sobrevive a un remount del motor (p. ej. "JUGAR DE NUEVO").

const sheetCache = new Map<SkinId, SpriteSheet | null>();

function sheetFor(skin: SkinId): SpriteSheet | null {
  const base = getBaseSheet();
  // Sin atlas decodificado todavía no hay nada que teñir NI que cachear.
  if (!base) return null;

  const cached = sheetCache.get(skin);
  if (cached !== undefined) return cached;

  const pal = GAME_PALETTES.arkanoid[skin];
  const regions: TintRegion[] = [];

  if (pal.paddle) regions.push({ frame: SPRITES.paddle, color: pal.paddle });
  if (pal.ball) regions.push({ frame: SPRITES.ball, color: pal.ball });

  // El orden importa: `buildTintedSheet` dedupea por coordenada y gana el
  // primero. "red" va antes que "gray", que comparte con él las coordenadas de
  // sus 4 frames de explosión.
  for (const color of Object.keys(BRICK_TOKEN) as ArkanoidBrickColor[]) {
    const tint = pal[BRICK_TOKEN[color]];
    if (!tint) continue;
    const block = SPRITES["block_" + color];
    if (block) regions.push({ frame: block, color: tint });
    for (const frame of EXPLOSION_FRAMES[color] ?? []) {
      regions.push({ frame, color: tint });
    }
  }

  // Sin regiones que teñir (`clasico`): el atlas original, sin copia.
  const sheet = regions.length === 0 ? base : buildTintedSheet(regions);
  sheetCache.set(skin, sheet);
  return sheet;
}

export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
  skin: SkinId
): ArkanoidEngineHandle {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");

  // ── Sonido ──────────────────────────────────────────────────────────────
  const bounceSound = new Audio("/games/arkanoid/sounds/ball-bounce.mp3");
  const breakSound = new Audio("/games/arkanoid/sounds/break-sound.mp3");
  const activeAudio = new Set<HTMLAudioElement>();

  function playSound(base: HTMLAudioElement) {
    if (disposed) return;
    const clone = base.cloneNode() as HTMLAudioElement;
    activeAudio.add(clone);
    clone.addEventListener("ended", () => activeAudio.delete(clone));
    clone.play().catch(() => {});
  }

  // ── Skin ────────────────────────────────────────────────────────────────
  // La skin entra como dato explícito y se guarda acá; el motor nunca lee el
  // DOM para averiguar su color.
  let currentSkin: SkinId = skin;
  let pal: ArkanoidPalette = GAME_PALETTES.arkanoid[currentSkin];
  let sheet: SpriteSheet | null = null;

  function refreshSheet() {
    sheet = sheetFor(currentSkin);
  }

  // ── Estado del juego ────────────────────────────────────────────────────
  const paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball: Ball = {
    x: 0,
    y: 0,
    w: 16,
    h: 16,
    vx: BASE_BALL_VX,
    vy: BASE_BALL_VY,
  };

  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let gameState: GameState = "playing";
  let currentLevel = 1;
  let paused = false;
  let disposed = false;

  const keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false };

  function initPaddle() {
    paddle.x = (W - paddle.w) / 2;
  }

  function initBall() {
    const speed = LEVELS[currentLevel - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    currentLevel = n;
    const level = LEVELS[n - 1];
    blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * level.speed;
    ball.vy = BASE_BALL_VY * level.speed;
    callbacks.onLevelChange(currentLevel);
  }

  function collideAABB(block: Block): boolean {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  // ── Input ───────────────────────────────────────────────────────────────
  function onCanvasClick(e: MouseEvent) {
    if (!paused) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    for (let i = 0; i < 5; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      if (
        mx >= bx &&
        mx <= bx + PAUSE_BTN_W &&
        my >= PAUSE_BTN_Y &&
        my <= PAUSE_BTN_Y + PAUSE_BTN_H
      ) {
        loadLevel(i + 1);
        paused = false;
        return;
      }
    }
  }

  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
    if (e.key in keys) keys[e.key] = true;
    if (
      (e.key === "p" || e.key === "P" || e.key === "Escape") &&
      gameState === "playing"
    ) {
      paused = !paused;
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key in keys) keys[e.key] = false;
  }

  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("mousemove", onMouseMove);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // ── Update ──────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (gameState !== "playing") return;

    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playSound(bounceSound);
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      playSound(bounceSound);
    }

    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += 10;
        callbacks.onScoreChange(score);
        ball.vy = -ball.vy;
        playSound(breakSound);
        if (blocks.every((b) => !b.alive)) {
          if (currentLevel < 5) {
            loadLevel(currentLevel + 1);
          } else {
            gameState = "win";
            callbacks.onGameOver(score);
          }
        }
        break; // un bloque por frame
      }
    }

    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (ball.y > H) {
      lives--;
      callbacks.onLivesChange(lives);
      if (lives <= 0) {
        lives = 0;
        gameState = "gameover";
        callbacks.onGameOver(score);
      } else {
        initBall();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────
  function drawOverlay(message: string) {
    ctx.fillStyle = pal.scrim;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pal.overlayText;
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, W / 2, H / 2);
  }

  function drawPauseOverlay() {
    ctx.fillStyle = pal.scrimPause;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = pal.pauseText;
    ctx.font = "bold 56px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSA", W / 2, 260);

    ctx.font = "bold 16px monospace";
    ctx.fillText("Saltar al nivel:", W / 2, 310);

    for (let i = 0; i < 5; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      const isActive = i + 1 === currentLevel;
      ctx.fillStyle = isActive ? pal.btnFillActive : pal.btnFillIdle;
      ctx.strokeStyle = pal.btnStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, PAUSE_BTN_Y, PAUSE_BTN_W, PAUSE_BTN_H, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isActive ? pal.btnTextActive : pal.btnTextIdle;
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        String(i + 1),
        bx + PAUSE_BTN_W / 2,
        PAUSE_BTN_Y + PAUSE_BTN_H / 2
      );
    }
  }

  function draw() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    for (const block of blocks) {
      if (block.alive)
        drawSprite(
          ctx,
          sheet,
          "block_" + block.color,
          block.x,
          block.y,
          block.w,
          block.h
        );
    }

    for (const exp of explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3
      );
      drawFrame(
        ctx,
        sheet,
        EXPLOSION_FRAMES[exp.color][frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h
      );
    }

    drawSprite(ctx, sheet, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
    drawSprite(ctx, sheet, "ball", ball.x, ball.y, ball.w, ball.h);

    if (gameState === "playing") {
      ctx.fillStyle = pal.hudText;
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Score: " + score, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText("Nivel: " + currentLevel, W / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
        drawSprite(ctx, sheet, "ball", bx, 10, ballSize, ballSize);
      }
    }

    if (gameState === "gameover") drawOverlay("GAME OVER");
    if (gameState === "win") drawOverlay("¡Completaste el juego!");
    if (paused) drawPauseOverlay();
  }

  // ── Loop principal ────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    const dt = lastTime === null ? 0 : (ts - lastTime) / 1000;
    lastTime = ts;
    if (!paused) update(dt);
    draw();
  }

  let started = false;

  loadSpritesheet(() => {
    if (disposed) return;
    refreshSheet();
    initPaddle();
    callbacks.onScoreChange(score);
    callbacks.onLivesChange(lives);
    loadLevel(1);
    started = true;
    rafId = requestAnimationFrame(loop);
  });

  return {
    setPaused(p: boolean) {
      paused = p;
    },
    setSkin(next: SkinId) {
      if (disposed || next === currentSkin) return;
      currentSkin = next;
      pal = GAME_PALETTES.arkanoid[currentSkin];
      refreshSheet();
      // Repintado inmediato. El loop de este juego dibuja todos los frames
      // (solo saltea `update` en pausa), pero no se depende de eso: el cambio
      // de skin es una acción del jugador y tiene que verse en el acto,
      // incluso si el rAF está frenado porque la pestaña no está visible.
      if (started) draw();
    },
    setVirtualKey(code: string, down: boolean) {
      if (code in keys) keys[code] = down;
    },
    destroy() {
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      activeAudio.forEach((a) => {
        a.pause();
        a.currentTime = 0;
      });
      activeAudio.clear();
    },
  };
}
