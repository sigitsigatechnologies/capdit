import {
  DEFAULT_ADJUSTMENTS,
  clampAdjustments,
  summarizeAdjustments,
  type Adjustments,
} from "./adjustments";

type StyleRule = {
  keywords: string[];
  values: Partial<Adjustments>;
};

const STYLE_RULES: StyleRule[] = [
  {
    keywords: ["cinematic", "movie", "film look"],
    values: {
      temperature: 10,
      contrast: 14,
      highlights: -8,
      shadows: -10,
      blacks: -14,
      saturation: -4,
      vibrance: 8,
      clarity: 5,
      vignette: -12,
    },
  },
  {
    keywords: ["teal and orange", "teal & orange", "teal", "orange"],
    values: {
      temperature: 14,
      tint: 4,
      contrast: 10,
      saturation: 10,
      vibrance: 12,
      clarity: 8,
      shadows: -6,
      highlights: 4,
    },
  },
  {
    keywords: ["moody", "dark", "low key", "dramatic"],
    values: {
      exposure: -0.35,
      contrast: 18,
      shadows: -16,
      highlights: -8,
      blacks: -18,
      saturation: -10,
      vibrance: -4,
      vignette: -22,
      clarity: 6,
    },
  },
  {
    keywords: ["film", "analog", "35mm"],
    values: {
      contrast: -8,
      saturation: -8,
      blacks: 12,
      shadows: 8,
      highlights: -4,
      vignette: -14,
    },
  },
  {
    keywords: ["vintage", "retro", "old"],
    values: {
      temperature: 20,
      saturation: -12,
      vibrance: -4,
      blacks: 16,
      shadows: 8,
      vignette: -18,
      contrast: -4,
    },
  },
  {
    keywords: ["warm", "golden", "sunset", "golden hour"],
    values: { temperature: 26, tint: 3, vibrance: 8, saturation: 4, highlights: 6 },
  },
  {
    keywords: ["cool", "blue", "cold", "winter"],
    values: { temperature: -24, tint: 2, vibrance: 6, contrast: 4 },
  },
  {
    keywords: ["clean", "modern", "minimal", "fresh"],
    values: { exposure: 0.2, contrast: 6, clarity: 8, saturation: 2, highlights: 10, shadows: 8 },
  },
  {
    keywords: ["airy", "bright", "light", "high key"],
    values: { exposure: 0.4, contrast: -6, shadows: 20, whites: 16, highlights: 8 },
  },
  {
    keywords: ["matte", "faded", "pastel"],
    values: { blacks: 22, shadows: 16, contrast: -12, saturation: -6 },
  },
  {
    keywords: ["vivid", "punchy", "vibrant", "pop"],
    values: { saturation: 20, vibrance: 18, contrast: 12, clarity: 10 },
  },
  {
    keywords: ["desaturated", "muted", "subtle"],
    values: { saturation: -22, vibrance: -10 },
  },
  {
    keywords: ["black and white", "black & white", "bw", "monochrome", "grayscale"],
    values: { saturation: -100, vibrance: -40 },
  },
  {
    keywords: ["portrait", "skin"],
    values: { clarity: -6, texture: -4, vibrance: 4, saturation: 2 },
  },
  {
    keywords: ["landscape", "nature", "mountain"],
    values: { vibrance: 14, clarity: 10, saturation: 6, dehaze: 6 },
  },
  {
    keywords: ["food"],
    values: { temperature: 8, saturation: 12, vibrance: 10, clarity: 6 },
  },
  {
    keywords: ["night", "neon", "cyberpunk"],
    values: {
      temperature: -10,
      tint: 6,
      saturation: 16,
      vibrance: 16,
      contrast: 16,
      blacks: -18,
      clarity: 8,
    },
  },
];

export interface StyleResult {
  adjust: Adjustments;
  matched: string[];
  summary: string;
}

export function generateStyleAdjustments(text: string): StyleResult {
  const haystack = ` ${text.toLowerCase()} `;
  const merged: Partial<Adjustments> = {};
  const matched: string[] = [];

  for (const rule of STYLE_RULES) {
    if (!rule.keywords.some((keyword) => haystack.includes(keyword))) continue;
    matched.push(rule.keywords[0]);
    (Object.entries(rule.values) as [keyof Adjustments, number][]).forEach(([key, value]) => {
      merged[key] = (merged[key] ?? DEFAULT_ADJUSTMENTS[key]) + value;
    });
  }

  const adjust = clampAdjustments({ ...DEFAULT_ADJUSTMENTS, ...merged });
  return { adjust, matched, summary: summarizeAdjustments(adjust) };
}
