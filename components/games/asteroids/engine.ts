// Motor de "Asteroides" portado 1:1 desde
// references/started-games/02-asteroids/game.js a un módulo framework-agnostic.
// Mismas mecánicas, mismo balance, mismo HUD/GAME OVER dibujados en canvas.

import { GAME_PALETTES, type SkinId } from "@/lib/skins";
import { getOpaqueContext2D } from "@/lib/game-canvas";
import { createGameLoop } from "@/lib/game-loop";
import type { GameEngineHandle } from "../types";
import type { AsteroidsPalette } from "./palette";

const W = 800;
const H = 600;

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

/** Compactación in-place de los muertos: sin la asignación por frame que deja
 * `.filter()`. */
function compactDead<T extends { dead: boolean }>(arr: T[]): void {
  let write = 0;
  for (let read = 0; read < arr.length; read++) {
    if (!arr[read].dead) arr[write++] = arr[read];
  }
  arr.length = write;
}

const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;

type Keys = Record<string, boolean>;
type GameState = "playing" | "dead" | "gameover";

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
  dead: boolean;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette) {
    ctx.fillStyle = pal.bullet;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead: boolean;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette) {
    // `setTransform` a la identidad en vez de `save()/restore()`: lo único
    // que hay que revertir es la matriz de transformación (nada usa
    // shadow/clip/globalAlpha acá), y resetearla es más barato que apilar y
    // desapilar el estado completo del contexto.
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = pal.asteroid;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ttl: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 12;
    this.ttl = POWERUP_TTL;
    this.dead = false;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = pal.powerUp;
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = pal.powerUpText;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

class Ship {
  tripleShot: number;
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 0;
  shootCooldown = 0;
  dead = false;

  constructor() {
    this.tripleShot = 0;
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: Keys) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = pal.ship;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = pal.thrust;
      ctx.stroke();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
    this.dead = false;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, alphaColors: readonly string[]) {
    // `alphaColors` es la tabla de `rgba()` precomputada en `setSkin` (una
    // por cada paso de 0.01 de alpha): evita construir un string nuevo por
    // partícula y por frame (hasta ~140/frame con muchas partículas vivas).
    const alpha = this.ttl / this.life;
    const idx = Math.round(alpha * (alphaColors.length - 1));
    ctx.strokeStyle =
      alphaColors[Math.min(alphaColors.length - 1, Math.max(0, idx))];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

export interface AsteroidsCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  /** Diagnóstico de rendimiento: una vez por frame de rAF mientras corre. */
  onFrame?: () => void;
}

export type AsteroidsEngineHandle = GameEngineHandle;

const PARTICLE_ALPHA_STEPS = 101; // 0.00 .. 1.00 en pasos de 0.01

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
  skin: SkinId
): AsteroidsEngineHandle {
  const ctx = getOpaqueContext2D(canvas);

  // La skin entra siempre como dato explícito. El motor jamás lee el DOM
  // (`getComputedStyle`) para averiguar un color.

  let pal: AsteroidsPalette = GAME_PALETTES.asteroids[skin];

  /** Tabla de `rgba()` de las partículas (una por paso de alpha), recomputada
   * solo en `setSkin` — ver `Particle.draw`. */
  let particleAlphaColors: string[] = [];
  function computeParticleAlphaColors() {
    const [r, g, b] = pal.particle;
    particleAlphaColors = Array.from(
      { length: PARTICLE_ALPHA_STEPS },
      (_, i) =>
        `rgba(${r}, ${g}, ${b}, ${(i / (PARTICLE_ALPHA_STEPS - 1)).toFixed(2)})`
    );
  }
  computeParticleAlphaColors();

  // ── Input ───────────────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};
  const GAME_KEYS = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space",
  ]);

  function setKey(code: string, down: boolean) {
    if (down) {
      if (!keys[code]) justPressed[code] = true;
      keys[code] = true;
    } else {
      keys[code] = false;
    }
  }
  function onKeyDown(e: KeyboardEvent) {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    setKey(e.code, true);
  }
  function onKeyUp(e: KeyboardEvent) {
    setKey(e.code, false);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function pressed(code: string): boolean {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  // ── Estado del juego ────────────────────────────────────────────────────
  let ship!: Ship;
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: GameState = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let paused = false;

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    spawnAsteroids(4);
    callbacks.onScoreChange(score);
    callbacks.onLivesChange(lives);
    callbacks.onLevelChange(level);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
    callbacks.onLevelChange(level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    callbacks.onLivesChange(lives);
    if (lives <= 0) {
      state = "gameover";
      // Corta el loop de verdad: sin esto, el rAF sigue despertando al
      // compositor detrás del modal de "FIN DEL JUEGO" indefinidamente.
      syncRunning();
      callbacks.onGameOver(score);
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      if (pressed("Space")) initGame();
      for (let i = 0; i < particles.length; i++) particles[i].update(dt);
      compactDead(particles);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      for (let i = 0; i < particles.length; i++) particles[i].update(dt);
      compactDead(particles);
      for (let i = 0; i < asteroids.length; i++) asteroids[i].update(dt);
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    for (let i = 0; i < bullets.length; i++) bullets[i].update(dt);
    for (let i = 0; i < asteroids.length; i++) asteroids[i].update(dt);
    for (let i = 0; i < particles.length; i++) particles[i].update(dt);
    for (let i = 0; i < powerUps.length; i++) powerUps[i].update(dt);

    compactDead(bullets);
    compactDead(particles);
    compactDead(powerUps);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          callbacks.onScoreChange(score);
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    compactDead(asteroids);
    for (const na of newAsteroids) asteroids.push(na);
    compactDead(bullets);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────
  function drawLifeIcon(x: number, y: number) {
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = pal.lifeIcon;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawHUD() {
    ctx.fillStyle = pal.hudText;
    ctx.font = "15px monospace";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${score}`, 14, 26);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = pal.hudPowerUp;
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  function drawOverlay(title: string, sub: string) {
    ctx.textAlign = "center";
    ctx.fillStyle = pal.overlayTitle;
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = pal.overlaySub;
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw() {
    callbacks.onFrame?.();
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    // `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` están declaradas a
    // nivel de módulo: no ven la clausura del motor, así que la paleta (o la
    // tabla de alphas, para `Particle`) les llega como argumento explícito.
    for (let i = 0; i < particles.length; i++)
      particles[i].draw(ctx, particleAlphaColors);
    for (let i = 0; i < asteroids.length; i++) asteroids[i].draw(ctx, pal);
    for (let i = 0; i < powerUps.length; i++) powerUps[i].draw(ctx, pal);
    for (let i = 0; i < bullets.length; i++) bullets[i].draw(ctx, pal);
    ship.draw(ctx, pal);

    drawHUD();

    if (state === "gameover")
      drawOverlay(
        "GAME OVER",
        `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`
      );
  }

  // ── Loop principal ──────────────────────────────────────────────────────
  // Corta el rAF de verdad en pausa y en game-over — no reprograma el frame
  // para recién ahí hacer `return`, como hacía el loop manual anterior.
  const gameLoop = createGameLoop({
    update(dtMs) {
      // Mismo clamp de 50ms que tenía el loop manual (evita saltos grandes
      // de simulación tras un stall); las unidades del motor son segundos.
      update(Math.min(dtMs / 1000, 0.05));
    },
    draw,
  });

  function syncRunning() {
    gameLoop.setRunning(!paused && state !== "gameover");
  }

  initGame();
  gameLoop.start();

  return {
    setPaused(p: boolean) {
      paused = p;
      syncRunning();
    },
    setSkin(next: SkinId) {
      pal = GAME_PALETTES.asteroids[next];
      computeParticleAlphaColors();
      // Repintado inmediato y obligatorio: el loop no dibuja mientras está
      // detenido (pausa o game-over), y esos son justo los momentos más
      // probables de que el jugador esté tocando el selector de skin.
      draw();
    },
    setVirtualKey(code: string, down: boolean) {
      setKey(code, down);
    },
    destroy() {
      gameLoop.stop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
