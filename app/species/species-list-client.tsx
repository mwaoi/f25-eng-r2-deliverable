"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import SpeciesCard from "./species-card";

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

export default function SpeciesListClient({
  species,
  currentUserId,
}: {
  species: Species[];
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";

  const [query, setQuery] = React.useState(qParam);

  // Keep input <-> URL in sync (debounced)
  React.useEffect(() => {
    setQuery(qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : ""); // shallow URL update
    }, 250); // debounce for nice UX
    return () => clearTimeout(t);
  }, [query, router, searchParams]);

  // Case-insensitive substring filtering over three fields
  const filtered = React.useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return species;

    return species.filter((sp) => {
      const sci = (sp.scientific_name ?? "").toString().toLowerCase();
      const com = (sp.common_name ?? "").toString().toLowerCase();
      const des = (sp.description ?? "").toString().toLowerCase();
      return sci.includes(s) || com.includes(s) || des.includes(s);
    });
  }, [query, species]);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by scientific name, common name, or description…"
          aria-label="Search species"
          className="max-w-md"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No species match “{query.trim()}”.
        </p>
      ) : (
        <div className="flex flex-wrap justify-center">
          {filtered.map((sp) => (
            <SpeciesCard key={sp.id} species={sp} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
