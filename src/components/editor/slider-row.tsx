"use client";

import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  onReset,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  onReset?: () => void;
  accent?: "violet" | "cyan" | "emerald" | "amber";
}) {
  const dot =
    accent === "cyan"
      ? "bg-cyan-400"
      : accent === "emerald"
        ? "bg-emerald-400"
        : accent === "amber"
          ? "bg-amber-400"
          : "bg-violet-400";
  return (
    <div className="group">
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 tabular-nums">
            {value > 0 && unit !== "%" && min < 0 ? "+" : ""}
            {Math.round(value)}
            {unit}
          </span>
          {onReset && (
            <button
              onClick={onReset}
              className="text-muted opacity-0 transition hover:text-white group-hover:opacity-100"
              aria-label={`Reset ${label}`}
            >
              <RotateCcw className="size-2.5" />
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
        <span
          className={cn("pointer-events-none absolute left-1/2 top-1/2 size-0 -translate-x-1/2 -translate-y-1/2", dot)}
          style={{ opacity: 0.25 }}
        />
      </div>
    </div>
  );
}
