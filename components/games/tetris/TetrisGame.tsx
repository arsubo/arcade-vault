"use client";

import { useEffect, useRef } from "react";
import { createTetrisEngine, type TetrisEngineHandle } from "./engine";

interface TetrisGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export default function TetrisGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: TetrisGameProps) {
  const boardCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngineHandle | null>(null);
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
    const boardCanvas = boardCanvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!boardCanvas || !nextCanvas) return;

    const engine = createTetrisEngine(boardCanvas, nextCanvas, {
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
        ref={boardCanvasRef}
        width={300}
        height={600}
        style={{ height: "100%", width: "auto", display: "block" }}
      />
      <canvas
        ref={nextCanvasRef}
        width={120}
        height={120}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 64,
          height: 64,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid var(--ink-faint)",
          borderRadius: 6,
        }}
      />
    </div>
  );
}
