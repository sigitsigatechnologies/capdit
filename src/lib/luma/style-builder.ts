import { clampAdjustments, type Adjustments } from "@/lib/adjustments";
import type { FilmCategory, FilmCharacteristics, FilmStyle, HslBias } from "./types";

export interface CompactLook {
  id: string;
  name: string;
  category: FilmCategory;
  description: string;
  swatch: [string, string, string];
  exposure?: number;
  temperature?: number;
  tint?: number;
  contrast?: number;
  highlights?: number;
  shadows?: number;
  whites?: number;
  blacks?: number;
  vibrance?: number;
  saturation?: number;
  clarity?: number;
  texture?: number;
  dehaze?: number;
  grain?: number;
  vignette?: number;
  sharpening?: number;
  hslBias?: HslBias;
  labels?: Partial<FilmCharacteristics>;
}

const contrastWord = (value: number) =>
  value >= 18 ? "High" : value >= 9 ? "Medium-high" : value >= -3 ? "Medium" : "Soft";
const saturationWord = (value: number) => (value >= 16 ? "High" : value >= 5 ? "Medium" : "Low");
const temperatureWord = (value: number) => (value >= 8 ? "Warm" : value <= -8 ? "Cool" : "Neutral");

export function compactLook(spec: CompactLook): FilmStyle {
  const creative: Adjustments = clampAdjustments({
    sharpening: spec.sharpening ?? 25,
    exposure: spec.exposure ?? 0,
    temperature: spec.temperature ?? 0,
    tint: spec.tint ?? 0,
    contrast: spec.contrast ?? 0,
    highlights: spec.highlights ?? 0,
    shadows: spec.shadows ?? 0,
    whites: spec.whites ?? 0,
    blacks: spec.blacks ?? 0,
    vibrance: spec.vibrance ?? 0,
    saturation: spec.saturation ?? 0,
    clarity: spec.clarity ?? 0,
    texture: spec.texture ?? 0,
    dehaze: spec.dehaze ?? 0,
    grain: spec.grain ?? 0,
    vignette: spec.vignette ?? 0,
  });
  const mono = creative.saturation <= -99;

  return {
    id: spec.id,
    name: spec.name,
    category: spec.category,
    description: spec.description,
    swatch: spec.swatch,
    characteristics: {
      colors:
        spec.labels?.colors ??
        (mono
          ? "Neutral monochrome"
          : `${temperatureWord(creative.temperature)} ${saturationWord(creative.saturation).toLowerCase()} palette`),
      contrast: spec.labels?.contrast ?? `${contrastWord(creative.contrast)} S-curve`,
      skinTone:
        spec.labels?.skinTone ??
        (mono
          ? "Sculpted, tonal"
          : creative.temperature >= 8
            ? "Warm, gentle"
            : creative.temperature <= -8
              ? "Cool, clean"
              : "Natural"),
      saturation: spec.labels?.saturation ?? (mono ? "Monochrome" : saturationWord(creative.saturation)),
      highlights:
        spec.labels?.highlights ??
        (creative.highlights <= -15 || creative.whites <= -10
          ? "Protected, soft"
          : creative.highlights >= 10
            ? "Bright, airy"
            : "Controlled"),
      shadows:
        spec.labels?.shadows ??
        (creative.blacks >= 10
          ? "Lifted, matte"
          : creative.shadows >= 10
            ? "Open"
            : creative.shadows <= -10
              ? "Deep"
              : "Balanced"),
    },
    creative,
    hslBias: spec.hslBias,
  };
}
