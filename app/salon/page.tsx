import SalonClient from "@/components/SalonClient";
import { getGames, getTopScores } from "@/lib/supabase/queries";

export default async function HallOfFamePage() {
  const [games, asteroidesScores] = await Promise.all([
    getGames(),
    getTopScores("asteroides", 12),
  ]);

  return <SalonClient games={games} asteroidesScores={asteroidesScores} />;
}
