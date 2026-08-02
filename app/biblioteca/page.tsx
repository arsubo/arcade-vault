import BibliotecaClient from "@/components/BibliotecaClient";
import { getGames } from "@/lib/supabase/queries";

export default async function Biblioteca() {
  const games = await getGames();

  return <BibliotecaClient games={games} />;
}
