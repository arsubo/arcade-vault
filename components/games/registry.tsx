import type { ComponentType } from "react";
import ArkanoidGame from "./arkanoid/ArkanoidGame";
import AsteroidsGame from "./asteroids/AsteroidsGame";
import SnakeGame from "./snake/SnakeGame";
import TetrisGame from "./tetris/TetrisGame";
import type { GameEngineProps } from "./types";

export type { GameEngineProps } from "./types";

export const GAME_REGISTRY: Record<string, ComponentType<GameEngineProps>> = {
  asteroides: AsteroidsGame,
  tetris: TetrisGame,
  arkanoid: ArkanoidGame,
  snake: SnakeGame,
};
