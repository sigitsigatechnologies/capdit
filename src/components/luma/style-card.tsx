"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilmStyle } from "@/lib/luma/types";

interface StyleCardProps {
  style: FilmStyle;
  selected?: boolean;
  onSelect: (style: FilmStyle) => void;
}

export function StyleCard({ style, selected, onSelect }: StyleCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(style)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-foreground/70 bg-foreground/[0.04]"
          : "border-border bg-card hover:border-foreground/25 hover:bg-secondary/50"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="h-9 w-16 rounded-lg ring-1 ring-inset ring-black/10"
          style={{
            background: `linear-gradient(100deg, ${style.swatch[0]} 0%, ${style.swatch[1]} 50%, ${style.swatch[2]} 100%)`,
          }}
        />
        {selected ? (
          <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3.5" />
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {style.category}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm font-medium text-foreground">{style.name}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {style.category === "Camera"
          ? "Camera profile"
          : style.category === "Cinematic"
            ? "Cinematic grade"
            : `${style.category} simulation`}
      </p>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{style.description}</p>
    </button>
  );
}
