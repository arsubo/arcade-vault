"use client";

import { memo, useEffect, useRef } from "react";
import { createSnakeEngine, type SnakeEngineHandle } from "./engine";
import type { GameEngineProps } from "../types";

function SnakeGame({
  paused,
  skin,
  inputRef,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngineHandle | null>(null);
  // La skin inicial entra por ref para que el efecto que monta el motor no la
  // lleve en sus dependencias: cambiar de skin repinta, nunca reinicia.
  const skinRef = useRef(skin);
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

    const engine = createSnakeEngine(
      canvas,
      {
        onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
        onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
        onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
        onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
      },
      skinRef.current
    );
    engineRef.current = engine;
    inputRef.current = { setVirtualKey: engine.setVirtualKey };

    return () => {
      engine.destroy();
      engineRef.current = null;
      inputRef.current = null;
    };
  }, [inputRef]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    skinRef.current = skin;
    engineRef.current?.setSkin(skin);
  }, [skin]);

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

export default memo(SnakeGame);
