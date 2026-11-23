"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FILM_CATEGORIES, FILM_STYLES, searchFilmStyles } from "@/lib/luma/film-styles";
import type { FilmCategory } from "@/lib/luma/types";
import { cn } from "@/lib/utils";
import { StyleCard } from "./style-card";

export function LibraryView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FilmCategory | "All">("All");

  const styles = useMemo(() => searchFilmStyles(query, category), [query, category]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Film Library</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
          {FILM_STYLES.length} simulations, one adaptive engine
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Each look carries its own contrast curve, color bias, and highlight/shadow treatment. Select one to open the
          generator with that simulation preloaded.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Fujifilm, Kodak, cinematic, camera…"
            className="pl-9"
          />
        </div>
        <div className="scrollbar-thin flex gap-1 overflow-x-auto">
          {(["All", ...FILM_CATEGORIES] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition",
                category === item
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted hover:text-foreground"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {styles.map((style) => (
          <StyleCard
            key={style.id}
            style={style}
            onSelect={() => router.push(`/generate?style=${style.id}`)}
          />
        ))}
      </div>
      {styles.length === 0 ? (
        <div className="surface rounded-2xl p-12 text-center">
          <p className="text-sm text-foreground">No simulations match that search</p>
          <p className="mt-1 text-xs text-muted-foreground">Try a brand, mood, or camera name.</p>
        </div>
      ) : null}
    </div>
  );
}
