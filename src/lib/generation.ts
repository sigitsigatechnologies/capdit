import { clamp } from "./utils";
import { type Adjustments } from "./adjustments";
import type {
  AnalysisResult,
  BasicParams,
  CalibrationChannel,
  CalibrationParams,
  ColorGradingParams,
  DetailParams,
  EffectsParams,
  HLSLookupKey,
  HSLParams,
  LightroomPreset,
  ToneCurveSet,
} from "./types";

const HSL_KEYS: HLSLookupKey[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "aqua",
  "blue",
  "purple",
  "magenta",
];

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function makeToneCurve(contrast: number): ToneCurveSet {
  const factor = clamp(1 + contrast / 120, 0.45, 1.6);
  const pointAt = (x: number) => {
    const clamped = clamp(x, 0, 1);
    const base = (1 - Math.cos(Math.PI * clamped)) / 2;
    const y = 0.5 + (base - 0.5) * factor;
    return { x: clamped, y: clamp(y, 0, 1) };
  };
  const pts = [0, 0.25, 0.5, 0.75, 1].map(pointAt);
  return { rgb: pts, red: pts, green: pts, blue: pts };
}

function neutralHsl(): Record<HLSLookupKey, HSLParams> {
  const result = {} as Record<HLSLookupKey, HSLParams>;
  HSL_KEYS.forEach((key) => {
    result[key] = { hue: 0, saturation: 50, luminance: 50 };
  });
  return result;
}

function neutralCalibration(): CalibrationParams {
  const channel = (): CalibrationChannel => ({ hue: 0, saturation: 50, luminance: 50 });
  return { red: channel(), green: channel(), blue: channel() };
}

function analysisFromAdjustments(adjust: Adjustments): AnalysisResult {
  const cast = adjust.temperature > 12 ? "warm" : adjust.temperature < -12 ? "cool" : "neutral";
  return {
    lighting: {
      exposure: adjust.exposure,
      highlights: adjust.highlights,
      shadows: adjust.shadows,
      whites: adjust.whites,
      blacks: adjust.blacks,
      dynamicRange: clamp(Math.round(50 + adjust.contrast * 0.5), 0, 100),
    },
    color: {
      dominantColors: [],
      colorTemperature: adjust.temperature,
      tint: adjust.tint,
      saturation: clamp(Math.round(50 + adjust.saturation * 0.4), 0, 100),
      vibrance: adjust.vibrance,
      colorCast: cast,
    },
    photography: {
      environment: "outdoor",
      lighting: "natural",
      subject: "other",
      background: "style",
    },
    visual: {
      contrast: adjust.contrast,
      mood: "styled",
      atmosphere: "clear",
      colorHarmony: "custom",
      film: "clean",
    },
    provider: "style-engine",
    model: "style-engine",
    analyzedAt: Date.now(),
  };
}

export function generatePresetFromAdjustments(
  adjust: Adjustments,
  sourceFileName: string
): LightroomPreset {
  const basic: BasicParams = {
    exposure: round(adjust.exposure, 2),
    contrast: clamp(Math.round(adjust.contrast), -100, 100),
    highlights: clamp(Math.round(adjust.highlights), -100, 100),
    shadows: clamp(Math.round(adjust.shadows), -100, 100),
    whites: clamp(Math.round(adjust.whites), -100, 100),
    blacks: clamp(Math.round(adjust.blacks), -100, 100),
    temperature: clamp(Math.round(adjust.temperature), -100, 100),
    tint: clamp(Math.round(adjust.tint), -100, 100),
    texture: clamp(Math.round(adjust.texture), -100, 100),
    clarity: clamp(Math.round(adjust.clarity), -100, 100),
    dehaze: clamp(Math.round(adjust.dehaze), -100, 100),
    vibrance: clamp(Math.round(adjust.vibrance), -100, 100),
    saturation: clamp(Math.round(adjust.saturation), -100, 100),
  };

  const colorGrading: ColorGradingParams = {
    shadows: 0,
    midtones: 0,
    highlights: 0,
    blending: 0,
    balance: 0,
  };

  const detail: DetailParams = {
    sharpening: clamp(Math.round(adjust.sharpening), 0, 100),
    radius: 1,
    detail: 25,
    masking: 0,
    noiseReduction: 10,
  };

  const effects: EffectsParams = {
    vignette: clamp(Math.round(adjust.vignette), -100, 100),
    grain: clamp(Math.round(adjust.grain), 0, 100),
    grainSize: 12,
    grainRoughness: 50,
  };

  return {
    id: `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: `CAPDIT - ${sourceFileName.replace(/\.[^.]+$/, "")}`,
    sourceFileName,
    createdAt: Date.now(),
    analysis: analysisFromAdjustments(adjust),
    basic,
    toneCurve: makeToneCurve(adjust.contrast),
    hsl: neutralHsl(),
    colorGrading,
    detail,
    effects,
    calibration: neutralCalibration(),
  };
}
