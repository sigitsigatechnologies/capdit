import { clamp } from "./utils";
import type {
  AnalysisResult,
  BasicParams,
  CalibrationChannel,
  ColorGradingParams,
  DetailParams,
  EffectsParams,
  HLSLookupKey,
  HSLParams,
  LightroomPreset,
  ToneCurveSet,
} from "./types";

export const LIGHTROOM_RANGES = {
  exposure: { min: -5, max: 5, step: 0.01 },
  contrast: { min: 0, max: 100, step: 1 },
  highlights: { min: -100, max: 100, step: 1 },
  shadows: { min: -100, max: 100, step: 1 },
  whites: { min: 0, max: 100, step: 1 },
  blacks: { min: 0, max: 100, step: 1 },
  temperature: { min: -100, max: 100, step: 1 },
  tint: { min: -50, max: 50, step: 1 },
  texture: { min: -100, max: 100, step: 1 },
  clarity: { min: -100, max: 100, step: 1 },
  dehaze: { min: -100, max: 100, step: 1 },
  vibrance: { min: -100, max: 100, step: 1 },
  saturation: { min: 0, max: 100, step: 1 },
  sharpening: { min: 0, max: 100, step: 1 },
  radius: { min: 0.1, max: 5, step: 0.1 },
  detail: { min: 0, max: 100, step: 1 },
  masking: { min: 0, max: 100, step: 1 },
  noiseReduction: { min: 0, max: 100, step: 1 },
  vignette: { min: -100, max: 100, step: 1 },
  grain: { min: 0, max: 100, step: 1 },
  grainSize: { min: 0, max: 30, step: 1 },
  grainRoughness: { min: 0, max: 100, step: 1 },
} as const;

const HSL_HUES: Record<HLSLookupKey, number> = {
  red: 0,
  orange: 30,
  yellow: 50,
  green: 120,
  aqua: 180,
  blue: 220,
  purple: 270,
  magenta: 300,
};

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function makeToneCurve(contrast: number): ToneCurveSet {
  const pointAt = (x: number) => {
    const clamped = clamp(x, 0, 1);
    const y = (1 - Math.cos(Math.PI * clamped)) / 2;
    const scaled = y * (1 + ((clamp(contrast, 0, 100) - 50) / 50) * 0.6);
    return { x: clamped, y: clamp(scaled, 0, 1) };
  };
  const pts = [pointAt(0), pointAt(0.25), pointAt(0.5), pointAt(0.75), pointAt(1)];
  return { rgb: pts, red: pts, green: pts, blue: pts };
}

function generateHsl(analysis: AnalysisResult): Record<HLSLookupKey, HSLParams> {
  const saturation = clamp(analysis.color.saturation, 0, 100);
  const luminanceBase = clamp(50 - analysis.lighting.exposure * 10, 10, 90);
  const result = {} as Record<HLSLookupKey, HSLParams>;
  (Object.keys(HSL_HUES) as HLSLookupKey[]).forEach((key) => {
    result[key] = {
      hue: HSL_HUES[key],
      saturation: clamp(Math.round(saturation), 0, 100),
      luminance: clamp(Math.round(luminanceBase), 10, 90),
    };
  });
  return result;
}

export function generatePreset(analysis: AnalysisResult, sourceFileName: string): LightroomPreset {
  const basic: BasicParams = {
    exposure: round(clamp(analysis.lighting.exposure, -5, 5), 2),
    contrast: clamp(Math.round(analysis.visual.contrast), 0, 100),
    highlights: clamp(Math.round(analysis.lighting.highlights), -100, 100),
    shadows: clamp(Math.round(analysis.lighting.shadows), -100, 100),
    whites: clamp(Math.round(analysis.lighting.whites), 0, 100),
    blacks: clamp(Math.round(analysis.lighting.blacks), 0, 100),
    temperature: clamp(Math.round(analysis.color.colorTemperature), -100, 100),
    tint: clamp(Math.round(analysis.color.tint), -50, 50),
    texture: clamp(Math.round(10 + analysis.color.saturation), -100, 100),
    clarity: clamp(Math.round(analysis.visual.contrast * 0.8), -100, 100),
    dehaze: clamp(Math.round(analysis.visual.atmosphere === "clear" ? 12 : -8), -100, 100),
    vibrance: clamp(Math.round(analysis.color.vibrance), -100, 100),
    saturation: clamp(Math.round(analysis.color.saturation), 0, 100),
  };

  const toneCurve = makeToneCurve(analysis.visual.contrast);

  const colorGrading: ColorGradingParams = {
    shadows: clamp(Math.round(analysis.lighting.shadows), -50, 50),
    midtones: clamp(Math.round(analysis.visual.contrast), 0, 100),
    highlights: clamp(Math.round(analysis.lighting.highlights), -50, 50),
    blending: 0,
    balance: 0,
  };

  const detail: DetailParams = {
    sharpening: clamp(Math.round(20 + analysis.visual.contrast), 0, 100),
    radius: 1,
    detail: 50,
    masking: 50,
    noiseReduction: clamp(Math.round(analysis.lighting.dynamicRange > 60 ? 20 : 40), 0, 100),
  };

  const effects: EffectsParams = {
    vignette: clamp(Math.round(analysis.lighting.dynamicRange > 60 ? -8 : 6), -100, 100),
    grain: clamp(Math.round(analysis.visual.film === "grainy" ? 24 : 8), 0, 100),
    grainSize: 12,
    grainRoughness: 50,
  };

  const calibration = {
    red: { hue: 0, saturation: clamp(Math.round(60 + analysis.color.saturation), 0, 100), luminance: 50 },
    green: { hue: 120, saturation: clamp(Math.round(55 + analysis.color.saturation), 0, 100), luminance: 50 },
    blue: { hue: 220, saturation: clamp(Math.round(60 + analysis.color.saturation), 0, 100), luminance: 50 },
  } as Record<"red" | "green" | "blue", CalibrationChannel>;

  const preset: LightroomPreset = {
    id: `preset_${Date.now().toString(36)}`,
    name: `AI Preset — ${sourceFileName.replace(/\.[^.]+$/, "")}`,
    sourceFileName,
    createdAt: Date.now(),
    analysis,
    basic,
    toneCurve,
    hsl: generateHsl(analysis),
    colorGrading,
    detail,
    effects,
    calibration,
  };
  return preset;
}
