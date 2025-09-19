// app/users/page.tsx
import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";

export const revalidate = 0;

// Type for exactly what we select from `profiles`
interface Profile {
  id: string; // your profiles.id is almost certainly uuid
  email: string | null;
  display_name: string | null;
  biography: string | null;
}

// tiny helper to safely trim nullable strings
function trimOrEmpty(s: string | null | undefined) {
  return typeof s === "string" ? s.trim() : "";
}

export default async function UsersPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/");

  // Strongly type the result using `.returns<Profile[]>()`
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, biography")
    .order("display_name", { ascending: true })
    .returns<Profile[]>(); // <— types the `data` field

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-semibold">Users</h1>
        <Separator className="my-4" />
        <p className="text-sm text-red-500">Failed to load users: {error.message}</p>
      </div>
    );
  }

  const profiles: Profile[] = data ?? [];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold">Users</h1>
      <Separator className="my-4" />

      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <li key={p.id} className="rounded border p-4">
              <div className="mb-1 text-lg font-semibold">{trimOrEmpty(p.display_name) || "Unnamed user"}</div>
              <div className="break-all text-sm text-muted-foreground">{p.email ?? "No email"}</div>
              <Separator className="my-3" />
              <div className="whitespace-pre-wrap text-sm">{trimOrEmpty(p.biography) || "No biography provided."}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
