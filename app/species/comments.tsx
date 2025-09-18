"use client";

import * as React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type CommentRow = {
  id: string;
  species_id: number; // or string if your species.id is text; adjust if needed
  author: string;
  content: string;
  created_at: string; // ISO
  profiles?: { display_name?: string | null } | null;
};

export default function Comments({
  speciesId,
  currentUserId,
}: {
  speciesId: number | string;
  currentUserId: string;
}) {
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const [items, setItems] = React.useState<CommentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);
  const [value, setValue] = React.useState("");

  // Normalize id for .eq()
  const eqValue = React.useMemo(
    () => (typeof speciesId === "string" ? Number(speciesId) : speciesId),
    [speciesId]
  );

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select(`id, species_id, author, content, created_at, profiles:author(display_name)`)
        .eq("species_id", eqValue as any)
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (!error && data) setItems(data as any);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eqValue, supabase]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const textVal = value.trim();
    if (!textVal || posting) return;

    setPosting(true);

    // optimistic add
    const tempId = crypto.randomUUID();
    const optimistic: CommentRow = {
      id: tempId,
      species_id: Number(eqValue),
      author: currentUserId,
      content: textVal,
      created_at: new Date().toISOString(),
      profiles: { display_name: "You" },
    };
    setItems((arr) => [optimistic, ...arr]);
    setValue("");

    const { data, error } = await supabase
      .from("comments")
      .insert({ species_id: eqValue as any, author: currentUserId, content: textVal })
      .select(`id, species_id, author, content, created_at, profiles:author(display_name)`)
      .single();

    setPosting(false);

    if (error) {
      // rollback
      setItems((arr) => arr.filter((c) => c.id !== tempId));
      alert(`Failed to post comment: ${error.message}`);
      return;
    }

    setItems((arr) => [data as any, ...arr.filter((c) => c.id !== tempId)]);
  }

  async function remove(id: string) {
    const prev = items;
    setItems((arr) => arr.filter((c) => c.id !== id));

    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      alert(`Failed to delete: ${error.message}`);
      setItems(prev);
    }
  }

  return (
    <div className="mt-3">
      <h4 className="mb-2 text-base font-semibold">Comments</h4>

      <form onSubmit={submit} className="mb-3 space-y-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          placeholder="Leave a comment…"
          className="text-sm"
          disabled={posting}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" size="sm" disabled={posting || !value.trim()}>
            {posting ? "Posting…" : "Post"}
          </Button>
        </div>
      </form>

      <Separator className="my-3" />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className="rounded-md border p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {(c.profiles?.display_name && c.profiles.display_name.trim()) || "User"}
                  {" • "}
                  {new Date(c.created_at).toLocaleString()}
                </div>
                {c.author === currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => void remove(c.id)}
                    title="Delete your comment"
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{c.content}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
