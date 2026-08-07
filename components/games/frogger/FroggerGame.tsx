"use client";

import { useEffect, useRef } from "react";
import {
  CANVAS_H,
  CANVAS_W,
  createFroggerEngine,
  type FroggerEngineHandle,
} from "./engine";
import type { GameEngineProps } from "../types";

export default function FroggerGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FroggerEngineHandle | null>(null);
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

    const engine = createFroggerEngine(canvas, {
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
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
