import type { Adjustments } from "../types";
import { DEFAULT_ADJUSTMENTS } from "../types";

export interface FilterPreset {
  id: string;
  name: string;
  adjustments: Partial<Adjustments>;
  gradient: [string, string];
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "cinematic",
    name: "Cinematic",
    adjustments: { contrast: 18, saturation: -10, shadows: -12, highlights: -8, temperature: -6, vignette: 18 },
    gradient: ["#0f2027", "#4f7c9b"],
  },
  {
    id: "warm",
    name: "Warm",
    adjustments: { temperature: 28, saturation: 10, brightness: 4 },
    gradient: ["#ff9966", "#ffd28a"],
  },
  {
    id: "cool",
    name: "Cool",
    adjustments: { temperature: -28, tint: 6, saturation: 4, contrast: 6 },
    gradient: ["#2b5876", "#4e9bce"],
  },
  {
    id: "vintage",
    name: "Vintage",
    adjustments: { contrast: -12, saturation: -22, fade: 24, temperature: 14, grain: 20, vignette: 16, highlights: -10 },
    gradient: ["#8a6a45", "#e0c9a6"],
  },
  {
    id: "retro",
    name: "Retro",
    adjustments: { contrast: 10, saturation: -6, grain: 26, fade: 12, temperature: 12 },
    gradient: ["#e96443", "#904e95"],
  },
  {
    id: "film",
    name: "Film",
    adjustments: { contrast: 12, fade: 10, grain: 14, highlights: -12, shadows: 8, saturation: -4 },
    gradient: ["#232526", "#9e9e93"],
  },
  {
    id: "portrait",
    name: "Portrait",
    adjustments: { brightness: 6, contrast: 6, saturation: 5, shadows: 10, temperature: 8, sharpness: 8 },
    gradient: ["#3d2b3d", "#c9a7b8"],
  },
  {
    id: "landscape",
    name: "Landscape",
    adjustments: { saturation: 24, contrast: 14, sharpness: 22, temperature: 4, highlights: -8 },
    gradient: ["#134e5e", "#71b280"],
  },
  {
    id: "moody",
    name: "Moody",
    adjustments: { brightness: -8, contrast: 16, saturation: -26, shadows: -22, highlights: -10, vignette: 28 },
    gradient: ["#232526", "#414345"],
  },
  {
    id: "bw",
    name: "Black & White",
    adjustments: { saturation: -100, contrast: 14, grain: 8, vignette: 14 },
    gradient: ["#1f1f1f", "#c9c9c9"],
  },
  {
    id: "clean",
    name: "Clean",
    adjustments: { brightness: 5, contrast: 6, saturation: 3, sharpness: 14, highlights: -4 },
    gradient: ["#e6e9f0", "#9fb3c8"],
  },
  {
    id: "hdr",
    name: "HDR",
    adjustments: { contrast: 18, shadows: 24, highlights: -20, saturation: 16, sharpness: 20 },
    gradient: ["#16222a", "#3a6073"],
  },
];

export function mergeAdjustments(base: Adjustments, delta: Partial<Adjustments>): Adjustments {
  const out = { ...base };
  (Object.keys(delta) as (keyof Adjustments)[]).forEach((key) => {
    out[key] = (base[key] ?? 0) + (delta[key] ?? 0);
  });
  return out;
}

export function getPreset(id: string | null): FilterPreset | undefined {
  if (!id) return undefined;
  return FILTER_PRESETS.find((p) => p.id === id);
}

export function presetAdjustments(id: string | null, intensity: number): Partial<Adjustments> {
  const preset = getPreset(id);
  if (!preset) return {};
  const k = intensity / 100;
  const scaled: Partial<Adjustments> = {};
  (Object.keys(preset.adjustments) as (keyof Adjustments)[]).forEach((key) => {
    scaled[key] = Math.round((preset.adjustments[key] ?? 0) * k);
  });
  return scaled;
}

export function resolveAdjustments(
  base: Adjustments,
  filterId: string | null,
  intensity = 100
): Adjustments {
  const merged = mergeAdjustments(DEFAULT_ADJUSTMENTS, base);
  const preset = getPreset(filterId);
  if (!preset) return merged;
  return mergeAdjustments(merged, presetAdjustments(filterId, intensity));
}

export const ADJUSTMENT_META: Record<
  keyof Adjustments,
  { label: string; min: number; max: number; unit?: string }
> = {
  brightness: { label: "Brightness", min: -100, max: 100 },
  contrast: { label: "Contrast", min: -100, max: 100 },
  saturation: { label: "Saturation", min: -100, max: 100 },
  exposure: { label: "Exposure", min: -100, max: 100 },
  temperature: { label: "Temperature", min: -100, max: 100 },
  tint: { label: "Tint", min: -100, max: 100 },
  highlights: { label: "Highlights", min: -100, max: 100 },
  shadows: { label: "Shadows", min: -100, max: 100 },
  sharpness: { label: "Sharpness", min: 0, max: 100 },
  blur: { label: "Blur", min: 0, max: 100 },
  vignette: { label: "Vignette", min: 0, max: 100 },
  fade: { label: "Fade", min: 0, max: 100 },
  grain: { label: "Grain", min: 0, max: 100 },
};

export const ADJUSTMENT_TABS: { id: string; keys: (keyof Adjustments)[] }[] = [
  { id: "Light", keys: ["exposure", "brightness", "contrast", "highlights", "shadows"] },
  { id: "Color", keys: ["temperature", "tint", "saturation"] },
  { id: "Detail", keys: ["sharpness", "blur", "vignette", "fade", "grain"] },
];
