export const SUPPORTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
}

export type AIProviderId = "mock" | "openai" | "anthropic" | "google";

export interface AIProviderSettings {
  provider: AIProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface LightingAnalysis {
  exposure: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  dynamicRange: number;
}

export interface ColorAnalysis {
  dominantColors: string[];
  colorTemperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  colorCast: string;
}

export interface PhotographyAnalysis {
  environment: "indoor" | "outdoor";
  lighting: "natural" | "artificial";
  subject:
    | "portrait"
    | "landscape"
    | "street"
    | "product"
    | "food"
    | "architecture"
    | "other";
  skinTone?: { detected: boolean; value?: number };
  background: string;
}

export interface VisualCharacterAnalysis {
  contrast: number;
  mood: string;
  atmosphere: string;
  colorHarmony: string;
  film: string;
}

export interface AnalysisResult {
  lighting: LightingAnalysis;
  color: ColorAnalysis;
  photography: PhotographyAnalysis;
  visual: VisualCharacterAnalysis;
  provider: string;
  model: string;
  analyzedAt: number;
}

export interface BasicParams {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  texture: number;
  clarity: number;
  dehaze: number;
  vibrance: number;
  saturation: number;
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface ToneCurveSet {
  rgb: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export interface HSLParams {
  hue: number;
  saturation: number;
  luminance: number;
}

export type HLSLookupKey =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "aqua"
  | "blue"
  | "purple"
  | "magenta";

export interface ColorGradingParams {
  shadows: number;
  midtones: number;
  highlights: number;
  blending: number;
  balance: number;
}

export interface DetailParams {
  sharpening: number;
  radius: number;
  detail: number;
  masking: number;
  noiseReduction: number;
}

export interface EffectsParams {
  vignette: number;
  grain: number;
  grainSize: number;
  grainRoughness: number;
}

export interface CalibrationChannel {
  hue: number;
  saturation: number;
  luminance: number;
}

export interface CalibrationParams {
  red: CalibrationChannel;
  green: CalibrationChannel;
  blue: CalibrationChannel;
}

export interface LightroomPreset {
  id: string;
  name: string;
  sourceFileName: string;
  createdAt: number;
  analysis: AnalysisResult;
  basic: BasicParams;
  toneCurve: ToneCurveSet;
  hsl: Record<HLSLookupKey, HSLParams>;
  colorGrading: ColorGradingParams;
  detail: DetailParams;
  effects: EffectsParams;
  calibration: CalibrationParams;
}
