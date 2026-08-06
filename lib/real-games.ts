export const REAL_GAME_IDS = [
  "asteroides",
  "tetris",
  "arkanoid",
  "snake",
] as const;

export type RealGameId = (typeof REAL_GAME_IDS)[number];

export function isRealGame(id: string): boolean {
  return (REAL_GAME_IDS as readonly string[]).includes(id);
}
