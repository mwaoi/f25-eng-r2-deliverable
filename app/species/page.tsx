import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createServerSupabaseClient } from "@/lib/server-utils";
import { redirect } from "next/navigation";
import AddSpeciesDialog from "./add-species-dialog";
import SpeciesListClient from "./species-list-client";

export const revalidate = 0; // always fetch fresh data

export default async function SpeciesList() {
  // Create supabase server component client and obtain user session from stored cookie
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // this is a protected route - only users who are signed in can view this route
    redirect("/");
  }

  // Obtain the ID of the currently signed-in user
  const sessionId = session.user.id;

  // Pull all columns needed for cards, edit gating, and search
  const { data: species, error } = await supabase
    .from("species")
    .select(
      `id, scientific_name, common_name, total_population, kingdom, description, image, author`
    )
    .order("id", { ascending: false });

  if (error) {
    // Render a simple failure state
    return (
      <div className="space-y-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <TypographyH2>Species List</TypographyH2>
          <AddSpeciesDialog userId={sessionId} />
        </div>
        <Separator className="my-4" />
        <p className="text-sm text-red-500">Failed to load species: {error.message}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Species List</TypographyH2>
        <AddSpeciesDialog userId={sessionId} />
      </div>
      <Separator className="my-4" />

      {/* Client component handles search & rendering */}
      <SpeciesListClient species={species ?? []} currentUserId={sessionId} />
    </>
  );
}
