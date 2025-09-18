"use client";

import * as React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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
import { Plus } from "lucide-react";

type SpeciesInsert = {
  scientific_name?: string | null;
  common_name?: string | null;
  total_population?: number | null;
  kingdom?: string | null;
  description?: string | null;
  image?: string | null;
  author: string;
};

export default function AddSpeciesDialog({ userId }: { userId: string }) {
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const router = useRouter();
  const { toast } = useToast();

  // form state
  const [open, setOpen] = React.useState(false);
  const [scientificName, setScientificName] = React.useState("");
  const [commonName, setCommonName] = React.useState("");
  const [totalPopulation, setTotalPopulation] = React.useState("");
  const [kingdom, setKingdom] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [image, setImage] = React.useState("");

  // wiki search state
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function resetForm() {
    setScientificName("");
    setCommonName("");
    setTotalPopulation("");
    setKingdom("");
    setDescription("");
    setImage("");
    setQuery("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload: SpeciesInsert = {
      scientific_name: scientificName || null,
      common_name: commonName || null,
      total_population:
        totalPopulation.trim() === "" ? null : Number.isNaN(Number(totalPopulation)) ? null : Number(totalPopulation),
      kingdom: kingdom || null,
      description: description || null,
      image: image || null,
      author: userId,
    };

    const { error } = await supabase.from("species").insert(payload);
    setSaving(false);

    if (error) {
      toast({ title: "Failed to add species", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Species added" });
    setOpen(false);
    resetForm();
    router.refresh();
  }

  /**
   * ---- Wikipedia + Wikidata Autofill ----
   * 1) Wikipedia Search -> top title
   * 2) Wikipedia REST Summary -> extract + main image + wikibase_item
   * 3) Wikidata entity -> taxon name (P225) and parent-taxons to find Kingdom (rank 'kingdom')
   * 4) Wikipedia parse wikitext -> try to extract population from infobox
   */
  async function autofillFromWikipedia() {
    const q = (query || scientificName || commonName).trim();
    if (!q) {
      toast({ title: "Enter a name to search", description: "Try a scientific or common name." });
      return;
    }

    setSearching(true);
    try {
      // 1) Search Wikipedia for best title
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        q
      )}&format=json&origin=*`;
      const searchRes = await fetch(searchUrl);
      const searchJson = (await searchRes.json()) as any;
      const top = searchJson?.query?.search?.[0];
      if (!top?.title) {
        toast({
          title: "No Wikipedia match",
          description: "Try a different spelling or a more specific name.",
          variant: "destructive",
        });
        return;
      }
      const title: string = top.title;

      // 2) Get summary (description + image + wikibase id)
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const sumRes = await fetch(summaryUrl);
      const sumJson = (await sumRes.json()) as any;

      const extract: string | undefined = sumJson?.extract;
      const thumb: string | undefined =
        sumJson?.originalimage?.source || sumJson?.thumbnail?.source || undefined;
      const wikibaseId: string | undefined = sumJson?.wikibase_item;

      if (extract) setDescription(extract);
      if (thumb) setImage(thumb);
      if (!scientificName && !commonName) setCommonName(title);

      // 3) From Wikidata, pull scientific name + kingdom (best effort)
      if (wikibaseId) {
        try {
          const { sciName, kingdomName } = await getTaxonFromWikidata(wikibaseId);
          if (sciName && !scientificName) setScientificName(sciName);
          if (kingdomName && !kingdom) setKingdom(kingdomName);
        } catch {
          /* ignore wikidata failures, continue */
        }
      }

      // 4) Try to grab population from the infobox wikitext
      try {
        const pop = await getPopulationFromInfobox(title);
        if (pop && !totalPopulation) setTotalPopulation(pop);
      } catch {
        /* ignore */
      }

      toast({
        title: "Autofilled from Wikipedia",
        description: `Loaded summary${thumb ? " and image" : ""}${
          wikibaseId ? ", plus scientific name/kingdom" : ""
        }${totalPopulation ? ", and population" : ""} for “${title}”.`,
      });
    } catch (e) {
      toast({
        title: "Wikipedia request failed",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Species
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a new species</DialogTitle>
          <DialogDescription>Enter details below, or use Wikipedia to autofill description, image, and more.</DialogDescription>
        </DialogHeader>

        {/* Wikipedia search bar */}
        <div className="rounded-md border p-3">
          <Label htmlFor="wiki_q" className="text-xs">Wikipedia autofill</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="wiki_q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Panthera tigris or Tiger"
            />
            <Button type="button" onClick={autofillFromWikipedia} disabled={searching}>
              {searching ? "Searching…" : "Autofill"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            We’ll search Wikipedia, copy the summary to Description, the main image to Image URL,
            and (when available) the scientific name, kingdom, and a population estimate.
          </p>
        </div>

        {/* Main form */}
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="scientific_name">Scientific name</Label>
            <Input
              id="scientific_name"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              placeholder="e.g., Panthera tigris"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="common_name">Common name</Label>
            <Input
              id="common_name"
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
              placeholder="e.g., Tiger"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="total_population">Total population</Label>
            <Input
              id="total_population"
              inputMode="numeric"
              value={totalPopulation}
              onChange={(e) => setTotalPopulation(e.target.value)}
              placeholder="e.g., 3900"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="kingdom">Kingdom</Label>
            <Input id="kingdom" value={kingdom} onChange={(e) => setKingdom(e.target.value)} placeholder="e.g., Animalia" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image">Image URL</Label>
            <Input id="image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Short summary of the species…"
            />
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add species"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- Helpers (client-side) ----------------- */

/** Fetch Wikidata entity JSON (labels, claims, etc.) */
async function fetchEntity(qid: string): Promise<any> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json?format=json&origin=*`;
  const res = await fetch(url);
  const json = (await res.json()) as any;
  return json?.entities?.[qid];
}

/** Get scientific name (P225) and kingdom (by walking parent taxon chain until rank=='kingdom') */
async function getTaxonFromWikidata(qid: string): Promise<{ sciName?: string; kingdomName?: string }> {
  const entity = await fetchEntity(qid);
  if (!entity) return {};

  // P225: taxon name (scientific name)
  const sciName =
    entity?.claims?.P225?.[0]?.mainsnak?.datavalue?.value ??
    entity?.labels?.en?.value; // fallback

  // Walk parents (P171) until a node whose rank (P105) label is 'kingdom'
  let kingdomName: string | undefined;
  let parentQ = entity?.claims?.P171?.[0]?.mainsnak?.datavalue?.value?.id as string | undefined;

  for (let i = 0; i < 10 && parentQ && !kingdomName; i++) {
    const parent = await fetchEntity(parentQ);
    if (!parent) break;

    const rankQ: string | undefined = parent?.claims?.P105?.[0]?.mainsnak?.datavalue?.value?.id;
    let rankLabel = "";
    if (rankQ) {
      const rankEntity = await fetchEntity(rankQ);
      rankLabel = rankEntity?.labels?.en?.value?.toLowerCase?.() ?? "";
    }
    if (rankLabel === "kingdom") {
      kingdomName = parent?.labels?.en?.value;
      break;
    }
    parentQ = parent?.claims?.P171?.[0]?.mainsnak?.datavalue?.value?.id;
  }

  return { sciName, kingdomName };
}

/** Parse Wikipedia wikitext to extract a population-like number from the infobox (best effort). */
async function getPopulationFromInfobox(title: string): Promise<string | undefined> {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&page=${encodeURIComponent(
    title
  )}&format=json&origin=*`;
  const res = await fetch(url);
  const json = (await res.json()) as any;
  const wikitext: string | undefined = json?.parse?.wikitext?.["*"];
  if (!wikitext) return undefined;

  // Try common parameter names
  const lines = wikitext.split("\n");
  const candidate = lines.find((l) => /\|\s*(population|population_total|pop_estimate)\s*=/.test(l));
  if (!candidate) return undefined;

  // Strip templates and brackets, pull first large number
  const cleaned = candidate
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\|\s*(population|population_total|pop_estimate)\s*=/i, " ")
    .trim();

  const numMatch = cleaned.match(/[\d][\d,\s\.]+/);
  if (!numMatch) return undefined;

  // Return digits only (keep commas)
  const digits = numMatch[0].replace(/\s+/g, "");
  return digits;
}
