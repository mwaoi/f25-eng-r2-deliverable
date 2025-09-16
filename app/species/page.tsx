export const revalidate = 0; 

import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createServerSupabaseClient } from "@/lib/server-utils";
import { redirect } from "next/navigation";
import AddSpeciesDialog from "./add-species-dialog";
import SpeciesCard from "./species-card";

export default async function SpeciesList() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/");

  const currentUserId = session.user.id;

  const { data: species, error } = await supabase
    .from("species")
    .select(`
      id,
      scientific_name,
      common_name,
      total_population,
      kingdom,
      description,
      image,
      author
    `)
    .order("id", { ascending: false });

  if (error) {
    return <div className="p-6">Failed to load species: {error.message}</div>;
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Species List</TypographyH2>
        <AddSpeciesDialog userId={currentUserId} />
      </div>
      <Separator className="my-4" />
      <div className="flex flex-wrap justify-center">
        {species?.map((s) => (
          <SpeciesCard key={s.id} species={s} currentUserId={currentUserId} />
        ))}
      </div>
    </>
  );
}
