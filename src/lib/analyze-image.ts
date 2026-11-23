import type { AnalysisResult, LookProfile, UploadedImage } from "./types";
import { clamp } from "./utils";

export interface ImageStats {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  tint: number;
  dominantColors: string[];
  colorCast: string;
  lookSummary: string;
}

export interface LocalAnalysis {
  analysis: AnalysisResult;
  stats: ImageStats;
  look: LookProfile;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function toHex(r: number, g: number, b: number): string {
  const part = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export async function analyzeImage(image: UploadedImage): Promise<LocalAnalysis> {
  const img = await loadImage(image.previewUrl);
  const maxSide = 320;
  const naturalW = img.naturalWidth || maxSide;
  const naturalH = img.naturalHeight || maxSide;
  const scale = Math.min(1, maxSide / Math.max(naturalW, naturalH));
  const width = Math.max(1, Math.round(naturalW * scale));
  const height = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported in this browser");
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const total = width * height;

  let lumSum = 0;
  let lumSqSum = 0;
  let satSum = 0;
  let warmSum = 0;
  let greenSum = 0;
  let brightCount = 0;
  let darkCount = 0;
  let centerLumSum = 0;
  let centerCount = 0;
  let borderLumSum = 0;
  let borderCount = 0;
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    lumSum += lum;
    lumSqSum += lum * lum;
    if (lum > 0.8) brightCount += 1;
    if (lum < 0.2) darkCount += 1;

    const pixel = i / 4;
    const px = pixel % width;
    const py = Math.floor(pixel / width);
    const dx = px / width - 0.5;
    const dy = py / height - 0.5;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < 0.08) {
      centerLumSum += lum;
      centerCount += 1;
    } else if (dist2 > 0.15) {
      borderLumSum += lum;
      borderCount += 1;
    }

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    satSum += max === 0 ? 0 : (max - min) / max;
    warmSum += (r - b) / 255;
    greenSum += (g - (r + b) / 2) / 255;

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  const meanLum = lumSum / total;
  const variance = Math.max(0, lumSqSum / total - meanLum * meanLum);
  const stdLum = Math.sqrt(variance);
  const meanSat = satSum / total;
  const meanWarm = warmSum / total;
  const meanGreen = greenSum / total;
  const brightFrac = brightCount / total;
  const darkFrac = darkCount / total;
  const centerLum = centerCount ? centerLumSum / centerCount : meanLum;
  const borderLum = borderCount ? borderLumSum / borderCount : meanLum;

  const dominantColors = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((c) => toHex(c.r / c.n, c.g / c.n, c.b / c.n));

  const colorCast =
    meanWarm > 0.04
      ? "warm"
      : meanWarm < -0.04
        ? "cool"
        : meanGreen > 0.03
          ? "green"
          : meanGreen < -0.03
            ? "magenta"
            : "neutral";

  const contrast = clamp(Math.round((stdLum - 0.2) * 320), -100, 100);
  const temperature = clamp(Math.round(meanWarm * 300), -100, 100);
  const tint = clamp(Math.round(-meanGreen * 260), -100, 100);
  const saturation = clamp(Math.round((meanSat - 0.35) * 260), -100, 100);
  const vibrance = clamp(Math.round(saturation * 0.5), -100, 100);
  const highlights = clamp(Math.round((brightFrac - 0.1) * 200), -100, 100);
  const shadows = clamp(Math.round(-contrast * 0.5 + (darkFrac - 0.18) * 120), -100, 100);
  const whites = clamp(Math.round((meanLum - 0.5) * 160 + (brightFrac - 0.1) * 90), -100, 100);
  const blacks = clamp(Math.round(-contrast * 0.45 + (darkFrac - 0.18) * 80), -100, 100);
  const clarity = clamp(Math.round(contrast * 0.5), -100, 100);
  const exposure = Number(clamp((meanLum - 0.5) * 2.0, -1.5, 1.5).toFixed(2));
  const vignette = clamp(Math.round((borderLum - centerLum) * 160), -100, 100);

  const warmthLabel = temperature > 12 ? "Warm" : temperature < -12 ? "Cool" : "Neutral";
  const toneLabel = contrast > 12 ? "High contrast" : contrast < -12 ? "Soft" : "Balanced";
  const colorLabel = saturation > 12 ? "Vivid" : saturation < -12 ? "Muted" : "Natural";
  const summary = `${warmthLabel} · ${toneLabel} · ${colorLabel}`;

  const look: LookProfile = {
    exposure,
    contrast,
    highlights,
    shadows,
    whites,
    blacks,
    temperature,
    tint,
    vibrance,
    saturation,
    clarity,
    vignette,
    summary,
  };

  const analysis: AnalysisResult = {
    lighting: {
      exposure,
      highlights,
      shadows,
      whites,
      blacks,
      dynamicRange: clamp(Math.round(stdLum * 260), 0, 100),
    },
    color: {
      dominantColors: dominantColors.length ? dominantColors : ["#808080"],
      colorTemperature: temperature,
      tint,
      saturation,
      vibrance,
      colorCast,
    },
    photography: {
      environment: meanLum < 0.4 ? "indoor" : "outdoor",
      lighting: "natural",
      subject: "other",
      background: colorCast === "neutral" ? "balanced tones" : `${colorCast} tones`,
    },
    visual: {
      contrast,
      mood: meanLum < 0.35 ? "moody" : meanLum > 0.65 ? "airy" : "balanced",
      atmosphere: contrast > 12 ? "clear" : "soft",
      colorHarmony: colorCast === "neutral" ? "neutral" : `${colorCast} cast`,
      film: meanSat < 0.18 ? "desaturated" : "clean",
    },
    provider: "local",
    model: "canvas-look",
    analyzedAt: Date.now(),
  };

  const stats: ImageStats = {
    brightness: clamp(Math.round(meanLum * 100), 0, 100),
    contrast: clamp(Math.round(stdLum * 220), 0, 100),
    saturation: clamp(Math.round(meanSat * 100), 0, 100),
    warmth: temperature,
    tint,
    dominantColors: analysis.color.dominantColors,
    colorCast,
    lookSummary: summary,
  };

  return { analysis, stats, look };
}
