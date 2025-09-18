"use client";

import Image from "next/image";
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
import { Separator } from "@/components/ui/separator";
import Comments from "./comments";
import EditSpeciesDialog from "./edit-species-dialog";

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

export default function SpeciesCard({
  species,
  currentUserId,
}: {
  species: Species;
  currentUserId?: string;
}) {
  const authorLabel =
    species.author === currentUserId ? "You" : species.author ? `User ${species.author.slice(0, 8)}…` : null;

  return (
    <div className="m-4 w-72 min-w-72 flex-none rounded border-2 p-3 shadow">
      {species.image && (
        <div className="relative h-40 w-full">
          <Image
            src={species.image}
            alt={species.scientific_name ?? species.common_name ?? "Species image"}
            fill
            style={{ objectFit: "cover" }}
            sizes="288px"
          />
        </div>
      )}

      <h3 className="mt-3 text-2xl font-semibold">{species.scientific_name}</h3>
      <h4 className="text-lg font-light italic">{species.common_name}</h4>
      <p>{species.description ? truncate(species.description, 150) : ""}</p>

      {/* Buttons row */}
      <div className="mt-3 flex w-full gap-2">
        {/* Learn More dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex-1">Learn More</Button>
          </DialogTrigger>

          <DialogContent aria-describedby={`species-desc-${species.id}`}>
            <DialogHeader>
              <DialogTitle>{species.scientific_name ?? "Species details"}</DialogTitle>
              <DialogDescription id={`species-desc-${species.id}`}>
                Detailed information about this species.
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-2" />

            <div className="space-y-2 text-sm leading-relaxed">
              <KV label="Scientific name" value={species.scientific_name} />
              <KV label="Common name" value={species.common_name} />
              <KV label="Total population" value={formatMaybeNumber(species.total_population)} />
              <KV label="Kingdom" value={species.kingdom} />
              {species.description && (
                <div>
                  <span className="font-medium">Description:</span> {species.description}
                </div>
              )}
              {authorLabel && <KV label="Author" value={authorLabel} />}
            </div>

            {/* Comments block */}
            <Separator className="my-3" />
            {currentUserId && (
              <Comments
                speciesId={typeof species.id === "string" ? Number(species.id) : species.id}
                currentUserId={currentUserId}
              />
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit button only for the author */}
        {species.author === currentUserId && (
          <EditSpeciesDialog species={species} currentUserId={currentUserId!} />
        )}
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n).trim() + "…";
}

function formatMaybeNumber(v: unknown) {
  if (typeof v === "number") return new Intl.NumberFormat().format(v);
  if (typeof v === "string") return v;
  return "—";
}

function KV({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <span className="font-medium">{label}:</span>{" "}
      {value !== undefined && value !== null && String(value).length > 0 ? String(value) : "—"}
    </div>
  );
}
