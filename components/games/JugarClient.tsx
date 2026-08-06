"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/games";
import { GAME_REGISTRY } from "@/components/games/registry";
import SkinPicker from "@/components/games/SkinPicker";
import TouchControls from "@/components/games/TouchControls";
import { useSkin } from "@/components/games/useSkin";
import type { VirtualInput } from "@/components/games/types";
import type { RealGameId } from "@/lib/real-games";
import { submitScore } from "@/app/games/[id]/jugar/actions";

export default function JugarClient({ game }: { game: Game }) {
  const isRegistered = Boolean(GAME_REGISTRY[game.id]);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  // La skin vive por encima de la `key` del motor y sobrevive a "JUGAR DE
  // NUEVO": cambiarla repinta en vivo, nunca reinicia la partida. Por eso no
  // aparece en `restart()`.
  const [skin, setSkin] = useSkin();
  const inputRef = useRef<VirtualInput | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (over || paused || isRegistered) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220
    );
    return () => clearInterval(t);
  }, [over, paused, isRegistered]);

  const EngineComponent = GAME_REGISTRY[game.id];
  const level = isRegistered ? engineLevel : 1 + Math.floor(score / 2500);

  const endGame = () => setOver(true);
  const restart = () => {
    setScore(0);
    setLives(3);
    setEngineLevel(1);
    setPaused(false);
    setOver(false);
    setGameKey((k) => k + 1);
    setPlayerName("");
    setSaveState("idle");
    setSaveError("");
  };

  const handleSaveScore = async () => {
    setSaveState("saving");
    const result = await submitScore(game.id, playerName, score);
    if (result.ok) {
      setSaveState("saved");
    } else {
      setSaveState("error");
      setSaveError(result.error);
    }
  };

  return (
    <div className="av-player fade-in" data-skin={skin}>
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              INVITADO
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <SkinPicker skin={skin} onChange={setSkin} />
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {EngineComponent ? (
            <EngineComponent
              key={gameKey}
              paused={paused}
              skin={skin}
              inputRef={inputRef}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setEngineLevel}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                endGame();
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {isRegistered && (
        <TouchControls
          gameId={game.id as RealGameId}
          inputRef={inputRef}
          paused={paused}
        />
      )}

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {isRegistered &&
              (saveState === "saved" ? (
                <div className="toast-saved">PUNTAJE GUARDADO</div>
              ) : (
                <>
                  <div className="input-row">
                    <input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="TU NOMBRE"
                      maxLength={20}
                      disabled={saveState === "saving"}
                    />
                    <button
                      className="btn yellow"
                      onClick={handleSaveScore}
                      disabled={!playerName.trim() || saveState === "saving"}
                    >
                      {saveState === "saving"
                        ? "GUARDANDO…"
                        : "GUARDAR PUNTAJE"}
                    </button>
                  </div>
                  {saveState === "error" && (
                    <div
                      className="pixel neon-magenta"
                      style={{ fontSize: 10 }}
                    >
                      {saveError}
                    </div>
                  )}
                </>
              ))}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
