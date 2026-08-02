import { notFound } from "next/navigation";
import JugarClient from "@/components/games/JugarClient";
import { getGameById } from "@/lib/supabase/queries";

export default async function GamePlayerPage(
  props: PageProps<"/games/[id]/jugar">
) {
  const { id } = await props.params;
  const game = await getGameById(id);
  if (!game) notFound();

  return <JugarClient game={game} />;
}
