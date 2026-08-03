import type { ComponentType } from "react";
import ArkanoidGame from "./arkanoid/ArkanoidGame";
import AsteroidsGame from "./asteroids/AsteroidsGame";
import SnakeGame from "./snake/SnakeGame";
import TetrisGame from "./tetris/TetrisGame";

export interface GameEngineProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export const GAME_REGISTRY: Record<string, ComponentType<GameEngineProps>> = {
  asteroides: AsteroidsGame,
  tetris: TetrisGame,
  arkanoid: ArkanoidGame,
  snake: SnakeGame,
};
