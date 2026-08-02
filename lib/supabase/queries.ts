import type { Game, ScoreRow } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("*");
  if (error) throw error;
  return data as Game[];
}

export async function getGameById(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Game | null;
}

export async function getTopScores(
  gameId: string,
  limit: number
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}
