"use client";

/**
 * EditSpeciesDialog with persistent Save + Undo and Delete + Undo.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Species = {
  id: string | number;
  author?: string | null;
  scientific_name?: string | null;
  common_name?: string | null;
  total_population?: number | string | null;
  kingdom?: string | null;
  description?: string | null;
  image?: string | null;
};

export default function EditSpeciesDialog({
  species,
  currentUserId,
}: {
  species: Species;
  currentUserId: string;
}) {
  // Only authors can edit/delete
  if (!species.author || species.author !== currentUserId) return null;

  const router = useRouter();
  const { toast } = useToast();
  const supabase = React.useMemo(() => createClientComponentClient(), []);

  // ---- Form state
  const [scientificName, setScientificName] = React.useState(species.scientific_name ?? "");
  const [commonName, setCommonName] = React.useState(species.common_name ?? "");
  const [totalPopulation, setTotalPopulation] = React.useState(
    species.total_population ? String(species.total_population) : ""
  );
  const [kingdom, setKingdom] = React.useState(species.kingdom ?? "");
  const [description, setDescription] = React.useState(species.description ?? "");

  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Keep a full snapshot for Undo (works for both save & delete)
  const snapshotRef = React.useRef<Species>({
    id: species.id,
    author: species.author ?? null,
    scientific_name: species.scientific_name ?? null,
    common_name: species.common_name ?? null,
    total_population: species.total_population ?? null,
    kingdom: species.kingdom ?? null,
    description: species.description ?? null,
    image: species.image ?? null,
  });

  // ---- Helpers
  async function updateRow(values: Partial<Species>) {
    return supabase.from("species").update(values).eq("id", species.id);
  }
  async function deleteRow() {
    return supabase.from("species").delete().eq("id", species.id);
  }
  async function insertSnapshot(s: Species) {
    // Recreate the deleted row (same id) — assumes your RLS lets the author insert.
    return supabase.from("species").insert({
      id: s.id,
      author: s.author ?? null,
      scientific_name: s.scientific_name ?? null,
      common_name: s.common_name ?? null,
      total_population: s.total_population ?? null,
      kingdom: s.kingdom ?? null,
      description: s.description ?? null,
      image: s.image ?? null,
    });
  }

  // ---- Undo handlers
  async function handleUndoUpdate() {
    const prev = snapshotRef.current;
    const { error } = await updateRow({
      scientific_name: prev.scientific_name ?? null,
      common_name: prev.common_name ?? null,
      total_population: prev.total_population ?? null,
      kingdom: prev.kingdom ?? null,
      description: prev.description ?? null,
      image: prev.image ?? null,
    });
    if (error) {
      toast({ title: "Undo failed", description: error.message, variant: "destructive" });
      return;
    }
    router.refresh();
    toast({ title: "Changes reverted" });
  }

  async function handleUndoDelete() {
    const snap = snapshotRef.current;
    const { error } = await insertSnapshot(snap);
    if (error) {
      toast({ title: "Undo delete failed", description: error.message, variant: "destructive" });
      return;
    }
    router.refresh();
    toast({ title: "Species restored" });
  }

  // ---- Save changes
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const population =
      totalPopulation.trim() === ""
        ? null
        : Number.isNaN(Number(totalPopulation))
        ? totalPopulation
        : Number(totalPopulation);

    const nextValues: Partial<Species> = {
      scientific_name: scientificName || null,
      common_name: commonName || null,
      total_population: population,
      kingdom: kingdom || null,
      description: description || null,
    };

    const { error } = await updateRow(nextValues);
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Update snapshot to the *previous* values so Undo can restore
    snapshotRef.current = {
      ...snapshotRef.current,
      scientific_name: species.scientific_name ?? null,
      common_name: species.common_name ?? null,
      total_population: species.total_population ?? null,
      kingdom: species.kingdom ?? null,
      description: species.description ?? null,
    };

    // Update the in-memory species so subsequent edits compare correctly
    species.scientific_name = nextValues.scientific_name ?? null;
    species.common_name = nextValues.common_name ?? null;
    species.total_population = nextValues.total_population ?? null;
    species.kingdom = nextValues.kingdom ?? null;
    species.description = nextValues.description ?? null;

    router.refresh();

    toast({
      title: "Changes saved",
      description: "Your edits were saved to the database.",
      action: <Button variant="outline" onClick={handleUndoUpdate}>Undo</Button>,
      duration: 7000,
    });
  }

  // ---- Delete (with confirm + undo)
  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    const { error } = await deleteRow();
    setDeleting(false);
    setConfirmDelete(false);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }

    router.refresh();

    toast({
      title: "Species deleted",
      description: "You can undo this action.",
      action: <Button variant="outline" onClick={handleUndoDelete}>Undo</Button>,
      duration: 7000,
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">Edit</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit species</DialogTitle>
          <DialogDescription>Update or delete the species you originally created.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="scientific_name">Scientific name</Label>
            <Input id="scientific_name" value={scientificName} onChange={(e) => setScientificName(e.target.value)} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="common_name">Common name</Label>
            <Input id="common_name" value={commonName} onChange={(e) => setCommonName(e.target.value)} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="total_population">Total population</Label>
            <Input id="total_population" inputMode="numeric" value={totalPopulation} onChange={(e) => setTotalPopulation(e.target.value)} placeholder="e.g., 1500" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="kingdom">Kingdom</Label>
            <Input id="kingdom" value={kingdom} onChange={(e) => setKingdom(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter className="pt-2 flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "outline"}
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : confirmDelete ? "Click to confirm delete" : "Delete"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
