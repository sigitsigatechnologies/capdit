"use client";

import { FILTER_PRESETS, presetCssFilter } from "@/lib/presets";
import { SliderRow } from "./slider-row";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function FilterStrip({
  filterId,
  intensity,
  previewUrl,
  onFilter,
  onIntensity,
  compact = false,
}: {
  filterId: string | null;
  intensity: number;
  previewUrl?: string;
  onFilter: (id: string | null) => void;
  onIntensity: (value: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className={cn("grid gap-1.5", compact ? "grid-cols-3" : "grid-cols-3")}>
        <button
          onClick={() => onFilter(null)}
          className={cn(
            "group relative overflow-hidden rounded-lg border transition",
            filterId === null ? "border-violet-400/70 ring-1 ring-violet-400/40" : "border-white/[0.07] hover:border-white/20"
          )}
        >
          <div className="flex aspect-square items-center justify-center bg-[#141722] text-[10px] text-muted">
            Original
          </div>
          {filterId === null && <CheckMarker />}
        </button>
        {FILTER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onFilter(preset.id)}
            className={cn(
              "group relative overflow-hidden rounded-lg border transition",
              filterId === preset.id
                ? "border-violet-400/70 ring-1 ring-violet-400/40"
                : "border-white/[0.07] hover:border-white/20"
            )}
            title={preset.name}
          >
            <div
              className="aspect-square overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${preset.gradient?.[0] ?? "#1f2937"}, ${preset.gradient?.[1] ?? "#4b5563"})`,
              }}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={preset.name}
                  className="size-full object-cover"
                  style={{ filter: presetCssFilter(preset.id) }}
                />
              ) : null}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-1 pt-3">
              <span className="block truncate text-[9px] font-medium text-white/90">{preset.name}</span>
            </div>
            {filterId === preset.id && <CheckMarker />}
          </button>
        ))}
      </div>
      {filterId && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
          <SliderRow
            label="Filter intensity"
            value={intensity}
            min={0}
            max={100}
            unit="%"
            onChange={onIntensity}
            onReset={() => onIntensity(100)}
          />
        </div>
      )}
    </div>
  );
}

function CheckMarker() {
  return (
    <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-violet-500 text-white shadow">
      <Check className="size-2.5" />
    </span>
  );
}
