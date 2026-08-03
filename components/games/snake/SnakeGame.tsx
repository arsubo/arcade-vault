"use client";

import { useEffect, useRef } from "react";
import { createSnakeEngine, type SnakeEngineHandle } from "./engine";

interface SnakeGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export default function SnakeGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngineHandle | null>(null);
  const callbacksRef = useRef({
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
  });

  useEffect(() => {
    callbacksRef.current = {
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
    };
  }, [onScoreChange, onLivesChange, onLevelChange, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createSnakeEngine(canvas, {
      onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
      onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
      onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        style={{ height: "100%", width: "auto", display: "block" }}
      />
    </div>
  );
}
