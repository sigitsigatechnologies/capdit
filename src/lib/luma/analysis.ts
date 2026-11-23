import sharp from "sharp";
import { clamp } from "@/lib/utils";
import { LIGHTROOM_RANGES, type Adjustments } from "@/lib/adjustments";
import { aiAnalysisSchema } from "./schemas";
import type { ImageAnalysis, ImageStats, ReferenceMatch } from "./types";

const MAX_ANALYSIS_EDGE = 768;
const STATS_EDGE = 256;

export async function readImageMeta(buffer: Buffer) {
  try {
    const meta = await sharp(buffer, { failOn: "error" }).metadata();
    if (!meta.width || !meta.height) return null;
    return meta;
  } catch {
    return null;
  }
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
}

export async function computeStats(buffer: Buffer): Promise<ImageStats> {
  const { data, info } = await sharp(buffer, { failOn: "error" })
    .rotate()
    .resize(STATS_EDGE, STATS_EDGE, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const total = info.width * info.height;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumLum = 0;
  let sumLumSq = 0;
  let sumSat = 0;
  let highlight = 0;
  let shadow = 0;
  let sky = 0;
  let greenery = 0;
  let skin = 0;
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();

  for (let i = 0; i < total; i += 1) {
    const offset = i * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sumLum += lum;
    sumLumSq += lum * lum;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    sumSat += sat;

    if (lum > 245) highlight += 1;
    if (lum < 12) shadow += 1;

    const y = Math.floor(i / info.width);
    if (y < info.height * 0.45 && b > r + 8 && b > g + 4 && b > 90) sky += 1;
    if (g > r * 1.08 && g > b * 1.08 && g > 60) greenery += 1;

    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const mx = Math.max(rr, gg, bb);
    const mn = Math.min(rr, gg, bb);
    const delta = mx - mn;
    if (delta > 0.05 && mx > 0.35 && mx < 0.98) {
      let hue = 0;
      if (mx === rr) hue = ((gg - bb) / delta) % 6;
      else if (mx === gg) hue = (bb - rr) / delta + 2;
      else hue = (rr - gg) / delta + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
      const skinSat = delta / mx;
      if ((hue <= 45 || hue >= 345) && skinSat > 0.15 && skinSat < 0.65) skin += 1;
    }

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);
    if (bucket) bucket.count += 1;
    else buckets.set(key, { count: 1, r, g, b });
  }

  const meanLum = sumLum / total;
  const variance = Math.max(0, sumLumSq / total - meanLum * meanLum);
  const std = Math.sqrt(variance);
  const meanR = sumR / total;
  const meanG = sumG / total;
  const meanB = sumB / total;

  const dominantColors = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((bucket) => toHex(bucket.r, bucket.g, bucket.b));

  return {
    brightness: Math.round((meanLum / 255) * 100),
    contrast: Math.round(clamp((std / 80) * 100, 0, 100)),
    saturation: Math.round(clamp((sumSat / total) * 100, 0, 100)),
    temperature: Math.round(clamp(((meanR - meanB) / 255) * 200, -100, 100)),
    tint: Math.round(clamp(((meanG - (meanR + meanB) / 2) / 255) * 200, -100, 100)),
    highlightClip: Number(((highlight / total) * 100).toFixed(1)),
    shadowClip: Number(((shadow / total) * 100).toFixed(1)),
    sky: Math.round((sky / total) * 100),
    greenery: Math.round((greenery / total) * 100),
    skin: Math.round((skin / total) * 100),
    dominantColors,
    width: info.width,
    height: info.height,
  };
}

function fallbackAnalysis(stats: ImageStats, width: number, height: number): ImageAnalysis {
  const portrait = stats.skin > 10;
  const sceneType = stats.sky > 18 ? "landscape" : portrait ? "portrait" : stats.greenery > 25 ? "nature" : "general";
  return {
    sceneType,
    portrait,
    environment: stats.brightness >= 45 ? "outdoor" : "indoor",
    lighting: stats.brightness > 65 ? "bright light" : stats.brightness < 35 ? "low light" : "natural light",
    exposure:
      stats.brightness < 40 ? "slightly underexposed" : stats.brightness > 64 ? "slightly overexposed" : "well exposed",
    whiteBalance: stats.temperature > 10 ? "warm" : stats.temperature < -10 ? "cool" : "neutral",
    skinTone: portrait ? (stats.temperature >= 0 ? "medium warm" : "medium cool") : "not dominant",
    dominantColors: stats.dominantColors.slice(0, 4),
    highlightCondition: stats.highlightClip > 5 ? "clipping" : stats.highlightClip > 1 ? "moderate" : "clean",
    shadowCondition: stats.shadowClip > 8 ? "crushed" : stats.shadowClip > 2 ? "slightly dark" : "open",
    mood: stats.contrast > 60 ? "dramatic" : stats.saturation > 55 ? "vibrant" : "natural",
    summary: `${sceneType} in ${stats.brightness < 40 ? "low" : stats.brightness > 64 ? "bright" : "balanced"} light, ${stats.temperature > 10 ? "warm" : stats.temperature < -10 ? "cool" : "neutral"} white balance.`,
    recommendedAdjustments: {
      exposure: clamp((50 - stats.brightness) / 100, -0.6, 0.6),
      highlights: stats.highlightClip > 2 ? -Math.round(clamp(stats.highlightClip * 4, 5, 60)) : 0,
      shadows: stats.shadowClip > 2 ? Math.round(clamp(stats.shadowClip * 4, 5, 60)) : 0,
      contrast: stats.contrast < 30 ? 6 : stats.contrast > 68 ? -6 : 0,
    },
    stats: { ...stats, width, height },
    source: "cv",
  };
}

function aiSchemaJson() {
  const number = { type: "number" };
  return {
    type: "object",
    properties: {
      sceneType: { type: "string" },
      portrait: { type: "boolean" },
      environment: { type: "string" },
      lighting: { type: "string" },
      exposure: { type: "string" },
      whiteBalance: { type: "string" },
      skinTone: { type: "string" },
      dominantColors: { type: "array", items: { type: "string" } },
      highlightCondition: { type: "string" },
      shadowCondition: { type: "string" },
      mood: { type: "string" },
      summary: { type: "string" },
      recommendedAdjustments: {
        type: "object",
        properties: {
          exposure: number,
          contrast: number,
          highlights: number,
          shadows: number,
          whites: number,
          blacks: number,
          temperature: number,
          tint: number,
          vibrance: number,
          saturation: number,
        },
      },
    },
    required: [
      "sceneType",
      "portrait",
      "environment",
      "lighting",
      "exposure",
      "whiteBalance",
      "skinTone",
      "dominantColors",
      "highlightCondition",
      "shadowCondition",
      "mood",
      "summary",
    ],
  };
}

const AI_ADJUSTMENT_KEYS = [
  "exposure",
  "contrast",
  "highlights",
  "shadows",
  "whites",
  "blacks",
  "temperature",
  "tint",
  "vibrance",
  "saturation",
] as const;

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeAi(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const colors = Array.isArray(obj.dominantColors)
    ? obj.dominantColors.filter((value): value is string => typeof value === "string" && value.length > 0).slice(0, 6)
    : [];
  const rawAdjust =
    obj.recommendedAdjustments && typeof obj.recommendedAdjustments === "object"
      ? (obj.recommendedAdjustments as Record<string, unknown>)
      : {};
  const recommendedAdjustments: Record<string, number> = {};
  AI_ADJUSTMENT_KEYS.forEach((key) => {
    const parsed = asNumber(rawAdjust[key]);
    if (parsed === null) return;
    const range = LIGHTROOM_RANGES[key];
    recommendedAdjustments[key] = clamp(parsed, range.min, range.max);
  });

  return {
    sceneType: asText(obj.sceneType, "general"),
    portrait: obj.portrait === true || obj.portrait === "true",
    environment: asText(obj.environment, "outdoor"),
    lighting: asText(obj.lighting, "natural light"),
    exposure: asText(obj.exposure, "balanced"),
    whiteBalance: asText(obj.whiteBalance, "neutral"),
    skinTone: asText(obj.skinTone, "natural"),
    dominantColors: colors,
    highlightCondition: asText(obj.highlightCondition, "controlled"),
    shadowCondition: asText(obj.shadowCondition, "balanced"),
    mood: asText(obj.mood, "natural"),
    summary: asText(obj.summary, "Natural photographic look"),
    recommendedAdjustments,
  };
}

const VISION_PROMPT = `You are a senior colorist and professional photography editor.
Analyze this photograph for designing an Adobe Lightroom preset.
Return ONLY JSON with these fields:
sceneType, portrait (boolean), environment, lighting, exposure, whiteBalance, skinTone,
dominantColors (3-5 short color names), highlightCondition, shadowCondition, mood, summary,
recommendedAdjustments { exposure, contrast, highlights, shadows, whites, blacks, temperature, tint, vibrance, saturation }.
Rules: preserve natural skin tones, avoid artificial orange skin, avoid teal-orange unless appropriate,
preserve highlights, do not crush shadows, adapt to the actual image, never fabricate camera metadata.`;

async function callGeminiVision(jpeg: Buffer, mime: string): Promise<ImageAnalysis["source"] | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  const data = jpeg.toString("base64");
  const models = [
    process.env.GEMINI_MODEL,
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ].filter((value): value is string => Boolean(value));

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          signal: AbortSignal.timeout(20_000),
          body: JSON.stringify({
            model,
            input: [
              { type: "text", text: VISION_PROMPT },
              { type: "image", data, mime_type: mime },
            ],
            response_format: aiSchemaJson(),
            generation_config: { temperature: 0.3 },
          }),
        });
        if (response.status === 503) {
          await new Promise((resolve) => setTimeout(resolve, 700));
          continue;
        }
        if (!response.ok) break;
        const payload = (await response.json()) as {
          steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
        };
        const text = (payload.steps ?? [])
          .filter((step) => step.type === "model_output")
          .flatMap((step) => step.content ?? [])
          .map((part) => part.text ?? "")
          .join("");
        if (!text.trim()) return null;
        const parsed = normalizeAi(JSON.parse(text) as unknown);
        const result = aiAnalysisSchema.safeParse(parsed);
        if (result.success) return result.data as unknown as ImageAnalysis["source"];
        console.warn("[luma] vision response failed validation", result.error.issues, text.slice(0, 240));
        return null;
      } catch {
        break;
      }
    }
  }
  return null;
}

export async function analyzeImageBuffer(buffer: Buffer): Promise<ImageAnalysis> {
  const meta = await readImageMeta(buffer);
  if (!meta?.width || !meta.height) throw new Error("Unsupported or corrupted image");
  const stats = await computeStats(buffer);
  const fallback = fallbackAnalysis(stats, meta.width, meta.height);

  const analysisJpeg = await sharp(buffer, { failOn: "error" })
    .rotate()
    .resize(MAX_ANALYSIS_EDGE, MAX_ANALYSIS_EDGE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const ai = (await callGeminiVision(analysisJpeg, "image/jpeg")) as unknown as {
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
  } | null;

  if (!ai) return fallback;

  return {
    sceneType: ai.sceneType,
    portrait: ai.portrait,
    environment: ai.environment,
    lighting: ai.lighting,
    exposure: ai.exposure,
    whiteBalance: ai.whiteBalance,
    skinTone: ai.skinTone,
    dominantColors: ai.dominantColors.length ? ai.dominantColors : fallback.dominantColors,
    highlightCondition: ai.highlightCondition,
    shadowCondition: ai.shadowCondition,
    mood: ai.mood,
    summary: ai.summary,
    recommendedAdjustments: { ...fallback.recommendedAdjustments, ...ai.recommendedAdjustments },
    stats,
    source: "ai",
  };
}

export async function buildReferenceMatch(source: ImageAnalysis, referenceStats: ImageStats): Promise<ReferenceMatch & { analysis: ImageStats }> {
  const diffs = [
    Math.abs(referenceStats.temperature - source.stats.temperature) / 2,
    Math.abs(referenceStats.saturation - source.stats.saturation),
    Math.abs(referenceStats.contrast - source.stats.contrast),
    Math.abs(referenceStats.brightness - source.stats.brightness),
  ];
  const similarity = Math.round(clamp(100 - diffs.reduce((sum, value) => sum + value, 0) / 4, 0, 100));
  return {
    stats: referenceStats,
    similarity,
    summary: `Reference palette is ${similarity}% close to the source. Suggested shifts: ${referenceStats.temperature > source.stats.temperature ? "warmer" : "cooler"}, ${referenceStats.saturation > source.stats.saturation ? "more saturated" : "less saturated"}, ${referenceStats.contrast > source.stats.contrast ? "more contrast" : "softer contrast"}.`,
    analysis: referenceStats,
  };
}
