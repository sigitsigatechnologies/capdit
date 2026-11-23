import { clamp } from "@/lib/utils";
import {
  DEFAULT_ADJUSTMENTS,
  clampAdjustments,
  summarizeAdjustments,
  type Adjustments,
} from "@/lib/adjustments";
import type {
  FilmStyle,
  GeneratedPreset,
  ImageAnalysis,
  PresetVariation,
  ReferenceMatch,
  VariationKey,
} from "./types";

const KEYS = Object.keys(DEFAULT_ADJUSTMENTS) as (keyof Adjustments)[];

export function imageCorrection(analysis: ImageAnalysis): Partial<Adjustments> {
  const s = analysis.stats;
  const recommended = analysis.recommendedAdjustments;
  return {
    exposure: clamp((50 - s.brightness) / 100, -0.7, 0.7) * 0.9 + (recommended.exposure ?? 0) * 0.3,
    temperature: clamp(-s.temperature * 0.35, -40, 40),
    tint: clamp(-s.tint * 0.3, -25, 25),
    highlights:
      s.highlightClip > 3 ? -clamp(s.highlightClip * 3, 0, 55) : (recommended.highlights ?? 0) * 0.3,
    shadows:
      s.shadowClip > 3 ? clamp(s.shadowClip * 3, 0, 55) : (recommended.shadows ?? 0) * 0.3,
  };
}

export function styleAdjustments(style: FilmStyle, intensity: number): Adjustments {
  return interpolateCreative(style, intensity);
}

function interpolateCreative(style: FilmStyle, intensity: number): Adjustments {
  const t = clamp(intensity, 0, 100) / 100;
  const result = { ...DEFAULT_ADJUSTMENTS } as Adjustments;
  KEYS.forEach((key) => {
    result[key] = DEFAULT_ADJUSTMENTS[key] + (style.creative[key] - DEFAULT_ADJUSTMENTS[key]) * t;
  });
  return result;
}

function referenceBlend(analysis: ImageAnalysis, reference: ReferenceMatch): Partial<Adjustments> {
  if (!reference.stats) return {};
  const source = analysis.stats;
  const ref = reference.stats;
  return {
    temperature: clamp((ref.temperature - source.temperature) * 0.25, -25, 25),
    tint: clamp((ref.tint - source.tint) * 0.2, -15, 15),
    saturation: clamp((ref.saturation - source.saturation) * 0.2, -20, 20),
    contrast: clamp((ref.contrast - source.contrast) * 0.2, -20, 20),
  };
}

export function buildAdjustments(
  style: FilmStyle,
  intensity: number,
  analysis: ImageAnalysis,
  adaptive: boolean,
  reference?: ReferenceMatch
): Adjustments {
  const creative = interpolateCreative(style, intensity);
  const correction = adaptive ? imageCorrection(analysis) : {};
  const ref = reference ? referenceBlend(analysis, reference) : {};
  const merged: Partial<Adjustments> = {};
  KEYS.forEach((key) => {
    merged[key] = creative[key] + (correction[key] ?? 0) + (ref[key] ?? 0);
  });
  return clampAdjustments(merged);
}

const VARIATIONS: Array<{ key: VariationKey; label: string; intensity: number }> = [
  { key: "soft", label: "Soft", intensity: 35 },
  { key: "balanced", label: "Balanced", intensity: 70 },
  { key: "strong", label: "Strong", intensity: 100 },
];

export function generateAdaptivePreset(
  analysis: ImageAnalysis,
  style: FilmStyle,
  options: { intensity: number; adaptive: boolean; reference?: ReferenceMatch }
): GeneratedPreset {
  const adjust = buildAdjustments(
    style,
    options.intensity,
    analysis,
    options.adaptive,
    options.reference
  );

  const variations: PresetVariation[] = VARIATIONS.map((spec) => {
    const variantAdjust = buildAdjustments(
      style,
      spec.intensity,
      analysis,
      options.adaptive,
      options.reference
    );
    return {
      key: spec.key,
      label: spec.label,
      intensity: spec.intensity,
      adjust: variantAdjust,
      summary: summarizeAdjustments(variantAdjust),
    };
  });

  return {
    id: `luma_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    styleId: style.id,
    styleName: style.name,
    styleCategory: style.category,
    intensity: options.intensity,
    adaptive: options.adaptive,
    adjust,
    summary: summarizeAdjustments(adjust),
    analysis,
    reference: options.reference,
    variations,
    createdAt: Date.now(),
  };
}

export function presetFileName(styleName: string, variant?: string): string {
  const clean = (value: string) => value.replace(/[^a-z0-9]+/gi, "").replace(/^$/, "Preset");
  const parts = ["LUMA", clean(styleName)];
  if (variant) parts.push(clean(variant));
  return `${parts.join("_")}.xmp`;
}
