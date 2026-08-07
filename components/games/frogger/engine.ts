// Motor de "Frogger" implementado desde cero (sin código de origen, sin
// sprites bitmap: todo se dibuja con primitivas canvas). Cuadrícula de 16x14
// celdas de 40px dividida en 5 zonas fijas por fila: metas (0), río (1-6),
// zona segura media (7), carretera (8-12), inicio (13).

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
