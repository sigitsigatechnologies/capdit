import { ADJUSTMENT_KEYS, type Adjustments } from "@/lib/adjustments";
import { cn } from "@/lib/utils";

const LABELS: Record<keyof Adjustments, string> = {
  exposure: "Exposure",
  contrast: "Contrast",
  highlights: "Highlights",
  shadows: "Shadows",
  whites: "Whites",
  blacks: "Blacks",
  temperature: "Temperature",
  tint: "Tint",
  vibrance: "Vibrance",
  saturation: "Saturation",
  clarity: "Clarity",
  texture: "Texture",
  dehaze: "Dehaze",
  sharpening: "Sharpening",
  vignette: "Vignette",
  grain: "Grain",
};

function formatValue(key: keyof Adjustments, value: number) {
  if (key === "exposure") return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
  return `${value > 0 ? "+" : ""}${Math.round(value)}`;
}

export function AdjustmentValues({ adjust, className }: { adjust: Adjustments; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4", className)}>
      {ADJUSTMENT_KEYS.map((key) => {
        const value = adjust[key];
        const neutral = key === "sharpening" ? value === 25 : value === 0;
        return (
          <div key={key} className="flex items-center justify-between gap-2 border-b border-foreground/[0.06] pb-1.5">
            <span className="truncate text-[11px] text-muted-foreground">{LABELS[key]}</span>
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                neutral ? "text-muted-foreground" : value > 0 ? "text-primary" : "text-[#2f6fb0]"
              )}
            >
              {formatValue(key, value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
