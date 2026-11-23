import type { Adjustments } from "@/lib/adjustments";

export type FilmCategory =
  | "Popular"
  | "Fujifilm"
  | "Kodak"
  | "Cinematic"
  | "Portrait"
  | "Moody"
  | "Vintage"
  | "Nature"
  | "Black & White"
  | "Camera";

export interface FilmCharacteristics {
  colors: string;
  contrast: string;
  skinTone: string;
  saturation: string;
  highlights: string;
  shadows: string;
}

export type HslKey = "red" | "orange" | "yellow" | "green" | "aqua" | "blue" | "purple" | "magenta";

export type HslBias = Partial<Record<HslKey, { saturation?: number; luminance?: number }>>;

export interface FilmStyle {
  id: string;
  name: string;
  category: FilmCategory;
  description: string;
  swatch: [string, string, string];
  characteristics: FilmCharacteristics;
  creative: Adjustments;
  hslBias?: HslBias;
}

export interface ImageStats {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlightClip: number;
  shadowClip: number;
  sky: number;
  greenery: number;
  skin: number;
  dominantColors: string[];
  width: number;
  height: number;
}

export interface ImageAnalysis {
  sceneType: string;
  portrait: boolean;
  environment: string;
  lighting: string;
  exposure: string;
  whiteBalance: string;
  skinTone: string;
  dominantColors: string[];
  highlightCondition: string;
  shadowCondition: string;
  mood: string;
  summary: string;
  recommendedAdjustments: Partial<Adjustments>;
  stats: ImageStats;
  source: "ai" | "cv";
}

export interface ReferenceMatch {
  stats: ImageStats;
  similarity: number;
  summary: string;
}

export type VariationKey = "soft" | "balanced" | "strong";

export interface PresetVariation {
  key: VariationKey;
  label: string;
  intensity: number;
  adjust: Adjustments;
  summary: string;
}

export interface GeneratedPreset {
  id: string;
  styleId: string;
  styleName: string;
  styleCategory: FilmCategory;
  intensity: number;
  adaptive: boolean;
  adjust: Adjustments;
  summary: string;
  analysis: ImageAnalysis;
  reference?: ReferenceMatch;
  variations: PresetVariation[];
  createdAt: number;
}

export interface SavedPreset extends GeneratedPreset {
  savedName: string;
}

export interface HistoryItem {
  id: string;
  styleId: string;
  styleName: string;
  styleCategory: FilmCategory;
  summary: string;
  adjust: Adjustments;
  createdAt: number;
}
