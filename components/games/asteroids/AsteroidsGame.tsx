"use client";

import { memo, useEffect, useRef } from "react";
import { createAsteroidsEngine, type AsteroidsEngineHandle } from "./engine";
import type { GameEngineProps } from "../types";

function AsteroidsGame({
  paused,
  skin,
  inputRef,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  onEngineFrame,
}: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngineHandle | null>(null);
  // Skin del primer frame. Va por ref y no en las dependencias del efecto de
  // montaje: cambiar de skin repinta en vivo, nunca reinicia la partida.
  const initialSkinRef = useRef(skin);
  const callbacksRef = useRef({
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
    onEngineFrame,
  });

  useEffect(() => {
    callbacksRef.current = {
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
      onEngineFrame,
    };
  }, [onScoreChange, onLivesChange, onLevelChange, onGameOver, onEngineFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createAsteroidsEngine(
      canvas,
      {
        onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
        onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
        onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
        onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
        onFrame: () => callbacksRef.current.onEngineFrame?.(),
      },
      initialSkinRef.current
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
    engineRef.current?.setSkin(skin);
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

export default memo(AsteroidsGame);
