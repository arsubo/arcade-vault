export const REAL_GAME_IDS = [
  "asteroides",
  "tetris",
  "arkanoid",
  "snake",
] as const;

export function isRealGame(id: string): boolean {
  return (REAL_GAME_IDS as readonly string[]).includes(id);
}
