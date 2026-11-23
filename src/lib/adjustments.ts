import type { LightroomPreset, LookProfile } from "./types";
import { clamp } from "./utils";

export const LIGHTROOM_RANGES = {
  exposure: { min: -5, max: 5, step: 0.01 },
  contrast: { min: -100, max: 100, step: 1 },
  highlights: { min: -100, max: 100, step: 1 },
  shadows: { min: -100, max: 100, step: 1 },
  whites: { min: -100, max: 100, step: 1 },
  blacks: { min: -100, max: 100, step: 1 },
  temperature: { min: -100, max: 100, step: 1 },
  tint: { min: -100, max: 100, step: 1 },
  vibrance: { min: -100, max: 100, step: 1 },
  saturation: { min: -100, max: 100, step: 1 },
  clarity: { min: -100, max: 100, step: 1 },
  texture: { min: -100, max: 100, step: 1 },
  dehaze: { min: -100, max: 100, step: 1 },
  sharpening: { min: 0, max: 100, step: 1 },
  vignette: { min: -100, max: 100, step: 1 },
  grain: { min: 0, max: 100, step: 1 },
} as const;

export type Adjustments = {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  clarity: number;
  texture: number;
  dehaze: number;
  sharpening: number;
  vignette: number;
  grain: number;
};

export const ADJUSTMENT_KEYS = Object.keys(LIGHTROOM_RANGES) as (keyof Adjustments)[];

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  clarity: 0,
  texture: 0,
  dehaze: 0,
  sharpening: 25,
  vignette: 0,
  grain: 0,
};

export function clampAdjustments(partial: Partial<Adjustments>): Adjustments {
  const result = { ...DEFAULT_ADJUSTMENTS };
  ADJUSTMENT_KEYS.forEach((key) => {
    const range = LIGHTROOM_RANGES[key];
    const value = partial[key];
    const next = typeof value === "number" && Number.isFinite(value) ? value : result[key];
    result[key] = clamp(next, range.min, range.max);
  });
  return result;
}

export function adjustmentsFromPreset(preset: LightroomPreset): Adjustments {
  return clampAdjustments({
    exposure: preset.basic.exposure,
    contrast: preset.basic.contrast,
    highlights: preset.basic.highlights,
    shadows: preset.basic.shadows,
    whites: preset.basic.whites,
    blacks: preset.basic.blacks,
    temperature: preset.basic.temperature,
    tint: preset.basic.tint,
    vibrance: preset.basic.vibrance,
    saturation: preset.basic.saturation,
    clarity: preset.basic.clarity,
    texture: preset.basic.texture,
    dehaze: preset.basic.dehaze,
    sharpening: preset.detail.sharpening,
    vignette: preset.effects.vignette,
    grain: preset.effects.grain,
  });
}

export function applyAdjustments(preset: LightroomPreset, adjust: Adjustments): LightroomPreset {
  return {
    ...preset,
    basic: {
      ...preset.basic,
      exposure: adjust.exposure,
      contrast: adjust.contrast,
      highlights: adjust.highlights,
      shadows: adjust.shadows,
      whites: adjust.whites,
      blacks: adjust.blacks,
      temperature: adjust.temperature,
      tint: adjust.tint,
      vibrance: adjust.vibrance,
      saturation: adjust.saturation,
      clarity: adjust.clarity,
      texture: adjust.texture,
      dehaze: adjust.dehaze,
    },
    detail: { ...preset.detail, sharpening: adjust.sharpening },
    effects: { ...preset.effects, vignette: adjust.vignette, grain: adjust.grain },
  };
}

export function adjustmentsFromLook(look: LookProfile): Adjustments {
  return clampAdjustments({
    ...DEFAULT_ADJUSTMENTS,
    exposure: look.exposure,
    contrast: look.contrast,
    highlights: look.highlights,
    shadows: look.shadows,
    whites: look.whites,
    blacks: look.blacks,
    temperature: look.temperature,
    tint: look.tint,
    vibrance: look.vibrance,
    saturation: look.saturation,
    clarity: look.clarity,
    vignette: look.vignette,
  });
}

export function summarizeAdjustments(adjust: Adjustments): string {
  const parts: string[] = [];
  parts.push(adjust.temperature >= 8 ? "Warm" : adjust.temperature <= -8 ? "Cool" : "Neutral");
  if (adjust.exposure >= 0.2) parts.push("Bright");
  else if (adjust.exposure <= -0.2) parts.push("Low-key");
  parts.push(adjust.contrast >= 10 ? "High contrast" : adjust.contrast <= -8 ? "Soft" : "Balanced");
  parts.push(
    adjust.saturation >= 8 || adjust.vibrance >= 12
      ? "Vivid"
      : adjust.saturation <= -8
        ? "Muted"
        : "Natural"
  );
  return parts.join(" · ");
}

export function previewFilter(adjust: Adjustments): string {
  const brightness = Math.pow(2, adjust.exposure).toFixed(3);
  const contrast = (1 + (adjust.contrast / 100) * 0.8).toFixed(3);
  const saturate = Math.max(0, 1 + adjust.saturation / 100).toFixed(3);
  const sepia = ((clamp(adjust.temperature, 0, 100) / 100) * 0.25).toFixed(3);
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) sepia(${sepia})`;
}
