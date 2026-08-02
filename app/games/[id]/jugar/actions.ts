"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitScore(
  gameId: string,
  playerName: string,
  score: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (gameId !== "asteroides") {
    return { ok: false, error: "Este juego no admite puntajes reales." };
  }

  const trimmedName = playerName.trim();
  if (!trimmedName || trimmedName.length > 20) {
    return {
      ok: false,
      error: "El nombre debe tener entre 1 y 20 caracteres.",
    };
  }

  if (!Number.isInteger(score) || score <= 0) {
    return { ok: false, error: "El puntaje debe ser un entero positivo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("scores").insert({
    game_id: gameId,
    player_name: trimmedName,
    score,
  });

  if (error) {
    return { ok: false, error: "No se pudo guardar el puntaje." };
  }

  return { ok: true };
}
