import HomeClient from "@/components/HomeClient";
import { getGames } from "@/lib/supabase/queries";

export default async function Home() {
  const games = await getGames();

  return <HomeClient games={games} />;
}
