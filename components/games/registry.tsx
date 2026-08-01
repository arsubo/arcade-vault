import type { ComponentType } from "react";
import AsteroidsGame from "./asteroids/AsteroidsGame";

export interface GameEngineProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export const GAME_REGISTRY: Record<string, ComponentType<GameEngineProps>> = {
  asteroides: AsteroidsGame,
};
