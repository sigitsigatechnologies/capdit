import { clamp } from "./utils";
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
  LookProfile,
  ToneCurveSet,
} from "./types";

export const LIGHTROOM_RANGES = {
  exposure: { min: -5, max: 5, step: 0.01 },
  contrast: { min: -100, max: 100, step: 1 },
  highlights: { min: -100, max: 100, step: 1 },
  shadows: { min: -100, max: 100, step: 1 },
  whites: { min: -100, max: 100, step: 1 },
  blacks: { min: -100, max: 100, step: 1 },
  temperature: { min: -100, max: 100, step: 1 },
  tint: { min: -100, max: 100, step: 1 },
  texture: { min: -100, max: 100, step: 1 },
  clarity: { min: -100, max: 100, step: 1 },
  dehaze: { min: -100, max: 100, step: 1 },
  vibrance: { min: -100, max: 100, step: 1 },
  saturation: { min: -100, max: 100, step: 1 },
  sharpening: { min: 0, max: 100, step: 1 },
  vignette: { min: -100, max: 100, step: 1 },
  grain: { min: 0, max: 100, step: 1 },
} as const;

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

export function generatePresetFromLook(
  look: LookProfile,
  analysis: AnalysisResult,
  sourceFileName: string
): LightroomPreset {
  const basic: BasicParams = {
    exposure: round(look.exposure, 2),
    contrast: clamp(Math.round(look.contrast), -100, 100),
    highlights: clamp(Math.round(look.highlights), -100, 100),
    shadows: clamp(Math.round(look.shadows), -100, 100),
    whites: clamp(Math.round(look.whites), -100, 100),
    blacks: clamp(Math.round(look.blacks), -100, 100),
    temperature: clamp(Math.round(look.temperature), -100, 100),
    tint: clamp(Math.round(look.tint), -100, 100),
    texture: 0,
    clarity: clamp(Math.round(look.clarity), -100, 100),
    dehaze: 0,
    vibrance: clamp(Math.round(look.vibrance), -100, 100),
    saturation: clamp(Math.round(look.saturation), -100, 100),
  };

  const colorGrading: ColorGradingParams = {
    shadows: 0,
    midtones: 0,
    highlights: 0,
    blending: 0,
    balance: 0,
  };

  const detail: DetailParams = {
    sharpening: 25,
    radius: 1,
    detail: 25,
    masking: 0,
    noiseReduction: 10,
  };

  const effects: EffectsParams = {
    vignette: clamp(Math.round(look.vignette), -100, 100),
    grain: 0,
    grainSize: 12,
    grainRoughness: 50,
  };

  return {
    id: `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: `CAPDIT - ${sourceFileName.replace(/\.[^.]+$/, "")}`,
    sourceFileName,
    createdAt: Date.now(),
    analysis,
    basic,
    toneCurve: makeToneCurve(look.contrast),
    hsl: neutralHsl(),
    colorGrading,
    detail,
    effects,
    calibration: neutralCalibration(),
  };
}
