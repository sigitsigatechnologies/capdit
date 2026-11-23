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
    values: { temperature: 10, contrast: 14, highlights: -8, shadows: -10, blacks: -14, saturation: -4, vibrance: 8, clarity: 5, vignette: -12 },
  },
  {
    keywords: ["teal and orange", "teal & orange", "teal", "orange"],
    values: { temperature: 14, tint: 4, contrast: 10, saturation: 10, vibrance: 12, clarity: 8, shadows: -6, highlights: 4 },
  },
  {
    keywords: ["moody", "dark", "low key", "dramatic"],
    values: { exposure: -0.35, contrast: 18, shadows: -16, highlights: -8, blacks: -18, saturation: -10, vibrance: -4, vignette: -22, clarity: 6 },
  },
  {
    keywords: ["film", "analog", "35mm"],
    values: { contrast: -8, saturation: -8, blacks: 12, shadows: 8, highlights: -4, vignette: -14 },
  },
  {
    keywords: ["vintage", "retro", "old"],
    values: { temperature: 20, saturation: -12, vibrance: -4, blacks: 16, shadows: 8, vignette: -18, contrast: -4 },
  },
  {
    keywords: ["warm", "golden", "sunset", "golden hour", "amber", "red"],
    values: { temperature: 26, tint: 3, vibrance: 8, saturation: 4, highlights: 6 },
  },
  {
    keywords: ["cool", "blue", "cold", "winter", "cyan"],
    values: { temperature: -24, tint: 2, vibrance: 6, contrast: 4 },
  },
  {
    keywords: ["green", "forest", "moss"],
    values: { tint: -8, vibrance: 8, saturation: 4 },
  },
  {
    keywords: ["pink", "magenta", "rose"],
    values: { tint: 10, vibrance: 8, temperature: 4 },
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
    keywords: ["portrait", "skin", "wedding", "romantic"],
    values: { clarity: -6, texture: -4, vibrance: 4, saturation: 2, highlights: 6, shadows: 8 },
  },
  {
    keywords: ["landscape", "nature", "mountain"],
    values: { vibrance: 14, clarity: 10, saturation: 6, dehaze: 6 },
  },
  {
    keywords: ["street", "urban", "city"],
    values: { contrast: 12, clarity: 8, saturation: -4, blacks: -10 },
  },
  {
    keywords: ["food"],
    values: { temperature: 8, saturation: 12, vibrance: 10, clarity: 6 },
  },
  {
    keywords: ["beach", "tropical", "summer"],
    values: { temperature: 12, saturation: 10, vibrance: 10, clarity: 5, highlights: 6 },
  },
  {
    keywords: ["autumn", "fall", "brown"],
    values: { temperature: 18, saturation: 6, tint: 2, vibrance: 6 },
  },
  {
    keywords: ["night", "neon", "cyberpunk"],
    values: { temperature: -10, tint: 6, saturation: 16, vibrance: 16, contrast: 16, blacks: -18, clarity: 8 },
  },
  {
    keywords: ["hdr", "crisp", "sharp"],
    values: { contrast: 14, clarity: 14, shadows: -10, highlights: -12, saturation: 6, sharpening: 20 },
  },
  {
    keywords: ["soft", "dreamy", "hazy"],
    values: { clarity: -12, contrast: -6, highlights: 8, shadows: 10 },
  },
  {
    keywords: ["grainy", "grain"],
    values: { grain: 30, contrast: -4, saturation: -4 },
  },
  {
    keywords: ["luxury", "elegant", "editorial"],
    values: { contrast: 10, blacks: -10, saturation: -6, clarity: 4, vignette: -8 },
  },
  {
    keywords: ["fujifilm", "fuji", "classic chrome", "provia", "velvia", "astia", "film simulation"],
    values: { saturation: -10, vibrance: 6, contrast: 10, shadows: -6, highlights: -4, temperature: 4, tint: -3, clarity: 4, vignette: -8 },
  },
  {
    keywords: ["sony", "alpha", "a7"],
    values: { contrast: 8, clarity: 10, saturation: 4, vibrance: 8, temperature: -4, tint: -2, shadows: 6, highlights: -4 },
  },
  {
    keywords: ["haslebat", "hasselblad", "hassy"],
    values: { temperature: 8, tint: 2, contrast: 6, clarity: 8, vibrance: 6, saturation: 4, highlights: -4, shadows: 8, texture: 4 },
  },
  {
    keywords: ["nikon"],
    values: { contrast: 12, saturation: 6, vibrance: 10, temperature: 4, tint: -2, clarity: 6, shadows: -6, highlights: -4 },
  },
  {
    keywords: ["kodak", "portra", "ektar", "ultramax", "gold 200"],
    values: { temperature: 16, tint: 3, saturation: 8, vibrance: 10, contrast: 6, shadows: 8, highlights: -4, blacks: 6 },
  },
];

const ARCHETYPES: Partial<Adjustments>[] = [
  { exposure: 0.1, contrast: 14, temperature: 6, vibrance: 10, clarity: 6, vignette: -10 },
  { exposure: 0.25, contrast: -4, shadows: 18, whites: 12, highlights: 8 },
  { exposure: -0.25, contrast: 20, shadows: -14, blacks: -16, saturation: -12, vignette: -20 },
  { contrast: -10, blacks: 20, saturation: -10, temperature: 12, vignette: -14 },
  { temperature: -18, tint: 4, vibrance: 12, clarity: 8, contrast: 8 },
  { saturation: 18, vibrance: 16, contrast: 12, clarity: 10 },
  { temperature: 22, tint: 3, saturation: 6, vibrance: 8, highlights: 6 },
  { contrast: 10, highlights: -10, shadows: 14, blacks: -8, clarity: 4 },
];

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number, salt: number): number {
  const value = Math.sin(seed * 0.0001 + salt * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export interface StyleResult {
  adjust: Adjustments;
  matched: string[];
  summary: string;
}

export function generateStyleAdjustments(text: string): StyleResult {
  const normalized = text.toLowerCase().trim();
  const haystack = ` ${normalized} `;
  const merged: Partial<Adjustments> = {};
  const matched: string[] = [];

  for (const rule of STYLE_RULES) {
    if (!rule.keywords.some((keyword) => haystack.includes(keyword))) continue;
    matched.push(rule.keywords[0]);
    (Object.entries(rule.values) as [keyof Adjustments, number][]).forEach(([key, value]) => {
      merged[key] = (merged[key] ?? DEFAULT_ADJUSTMENTS[key]) + value;
    });
  }

  if (normalized.length > 0) {
    const seed = hashString(normalized) || 1;
    let scale = 0.35;

    if (matched.length === 0) {
      const archetype = ARCHETYPES[seed % ARCHETYPES.length];
      (Object.entries(archetype) as [keyof Adjustments, number][]).forEach(([key, value]) => {
        merged[key] = (merged[key] ?? DEFAULT_ADJUSTMENTS[key]) + value;
      });
      scale = 0.45;
    }

    const jitter = (salt: number) => (seededUnit(seed, salt) * 2 - 1) * scale;
    const add = (key: keyof Adjustments, amount: number) => {
      merged[key] = (merged[key] ?? DEFAULT_ADJUSTMENTS[key]) + amount;
    };

    add("exposure", jitter(1) * 0.3);
    add("contrast", Math.round(jitter(2) * 18));
    add("highlights", Math.round(jitter(3) * 14));
    add("shadows", Math.round(jitter(4) * 16));
    add("whites", Math.round(jitter(5) * 10));
    add("blacks", Math.round(jitter(6) * 10));
    add("temperature", Math.round(jitter(7) * 16));
    add("tint", Math.round(jitter(8) * 8));
    add("vibrance", Math.round(jitter(9) * 12));
    add("saturation", Math.round(jitter(10) * 10));
    add("clarity", Math.round(jitter(11) * 10));
    add("texture", Math.round(jitter(12) * 8));
    add("dehaze", Math.round(jitter(13) * 6));
    add("vignette", Math.round(jitter(14) * 12) - Math.round(Math.abs(jitter(15)) * 8));
    add("grain", Math.round(Math.abs(jitter(16)) * 12));
  }

  const adjust = clampAdjustments({ ...DEFAULT_ADJUSTMENTS, ...merged });
  return { adjust, matched, summary: summarizeAdjustments(adjust) };
}
