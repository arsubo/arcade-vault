import SalonClient from "@/components/SalonClient";
import { getGames, getTopScores } from "@/lib/supabase/queries";
import { REAL_GAME_IDS } from "@/lib/real-games";
import type { ScoreRow } from "@/lib/games";

export default async function HallOfFamePage() {
  const [games, realScoresList] = await Promise.all([
    getGames(),
    Promise.all(REAL_GAME_IDS.map((id) => getTopScores(id, 12))),
  ]);

  const realScores: Record<string, ScoreRow[]> = Object.fromEntries(
    REAL_GAME_IDS.map((id, i) => [id, realScoresList[i]])
  );

  return <SalonClient games={games} realScores={realScores} />;
}
