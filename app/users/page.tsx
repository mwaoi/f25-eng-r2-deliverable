import { Separator } from "@/components/ui/separator";
import { createServerSupabaseClient } from "@/lib/server-utils"; // ✅ add this
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function UsersPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, biography")
    .order("display_name", { ascending: true });

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
