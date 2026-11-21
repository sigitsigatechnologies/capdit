import type { Adjustments, AIProviderSettings, ClipTransition } from "./types";

export interface AITool {
  id: string;
  name: string;
  description: string;
  modes: ("photo" | "video")[];
  kind: "local" | "provider";
  note?: string;
}

export const AI_TOOLS: AITool[] = [
  {
    id: "auto-enhance",
    name: "Auto Enhance",
    description: "Analyzes your image histogram and applies a balanced grade.",
    modes: ["photo", "video"],
    kind: "local",
  },
  {
    id: "auto-color",
    name: "Auto Color Correction",
    description: "Neutralizes white balance using gray-world channel analysis.",
    modes: ["photo", "video"],
    kind: "local",
  },
  {
    id: "smart-crop",
    name: "Smart Crop",
    description: "Centers the subject area and reframes to your target aspect ratio.",
    modes: ["photo"],
    kind: "local",
  },
  {
    id: "denoise",
    name: "Local Denoise",
    description: "Reduces noise with chroma smoothing and detail restoration.",
    modes: ["photo"],
    kind: "local",
  },
  {
    id: "sharpness",
    name: "Detail Boost",
    description: "Adds edge-aware unsharp masking for crisper texture.",
    modes: ["photo", "video"],
    kind: "local",
  },
  {
    id: "bg-remove",
    name: "Background Removal",
    description: "Requires an AI provider (e.g. Replicate / Remove.bg / custom endpoint).",
    modes: ["photo", "video"],
    kind: "provider",
    note: "You can still use the local color-key tool in the Background panel.",
  },
  {
    id: "upscale",
    name: "AI Upscaling",
    description: "Requires an AI super-resolution provider.",
    modes: ["photo"],
    kind: "provider",
  },
  {
    id: "face-enhance",
    name: "Face Enhancement",
    description: "Requires a portrait restoration provider (CodeFormer / GFPGAN).",
    modes: ["photo"],
    kind: "provider",
  },
  {
    id: "object-remove",
    name: "Object Removal",
    description: "Requires an inpainting provider (e.g. LaMa / Replicate).",
    modes: ["photo", "video"],
    kind: "provider",
  },
  {
    id: "restore",
    name: "Image Restoration",
    description: "Requires a restoration model provider.",
    modes: ["photo"],
    kind: "provider",
  },
  {
    id: "relight",
    name: "AI Relighting",
    description: "Requires a relighting provider. Local light controls are available in Adjust.",
    modes: ["photo", "video"],
    kind: "provider",
  },
  {
    id: "subtitles",
    name: "Auto Subtitles",
    description: "Speech-to-text requires a transcription provider API key.",
    modes: ["video"],
    kind: "provider",
    note: "You can add subtitle clips manually with the Text tool.",
  },
  {
    id: "image-gen",
    name: "AI Image Generation",
    description: "Requires an image generation provider API key.",
    modes: ["photo", "video"],
    kind: "provider",
  },
  {
    id: "video-gen",
    name: "AI Video Generation",
    description: "Requires a video generation provider API key.",
    modes: ["video"],
    kind: "provider",
  },
  {
    id: "image-to-video",
    name: "Image to Video",
    description: "Requires an image-to-video provider API key.",
    modes: ["video"],
    kind: "provider",
  },
  {
    id: "stabilize",
    name: "Video Stabilization",
    description: "Requires a video processing provider. Use clip transforms for manual correction.",
    modes: ["video"],
    kind: "provider",
  },
  {
    id: "portrait",
    name: "Smart Portrait",
    description: "Requires a portrait AI provider. Local portrait grade is available in Filters.",
    modes: ["photo"],
    kind: "provider",
  },
];

const PROVIDER_KEY = "capdit-ai-provider";

export const DEFAULT_PROVIDER: AIProviderSettings = {
  provider: "none",
  apiKey: "",
  baseUrl: "",
  model: "",
};

export function getAIProvider(): AIProviderSettings {
  if (typeof window === "undefined") return DEFAULT_PROVIDER;
  try {
    const raw = localStorage.getItem(PROVIDER_KEY);
    if (!raw) return DEFAULT_PROVIDER;
    return { ...DEFAULT_PROVIDER, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROVIDER;
  }
}

export function saveAIProvider(settings: AIProviderSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROVIDER_KEY, JSON.stringify(settings));
}

export function isAIReady(): boolean {
  const p = getAIProvider();
  return p.provider !== "none" && Boolean(p.apiKey) && Boolean(p.baseUrl);
}

export async function runRemoteAI(payload: {
  task: string;
  prompt?: string;
  imageDataUrl?: string;
  options?: Record<string, unknown>;
}): Promise<{ ok: boolean; message: string; data?: unknown }> {
  const provider = getAIProvider();
  if (!isAIReady()) {
    return {
      ok: false,
      message:
        "No AI provider configured. Open AI Settings to add your API key and endpoint. Local tools (auto enhance, auto color, smart crop, denoise) work without a provider.",
    };
  }
  try {
    const res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/${payload.task}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({ ...payload, model: provider.model || undefined }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `Provider error ${res.status}: ${text.slice(0, 220)}` };
    }
    return { ok: true, message: "AI request completed.", data: await res.json() };
  } catch (error) {
    return { ok: false, message: `Could not reach AI provider: ${(error as Error).message}` };
  }
}

export interface ImageStats {
  meanLuma: number;
  stdDev: number;
  meanR: number;
  meanG: number;
  meanB: number;
  avgSaturation: number;
  clippedHighlights: number;
  clippedShadows: number;
}

export async function analyzeImageStats(blob: Blob): Promise<ImageStats | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sumL = 0;
    let sumL2 = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let sat = 0;
    let hi = 0;
    let lo = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sumL += l;
      sumL2 += l * l;
      sumR += r;
      sumG += g;
      sumB += b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      sat += max === 0 ? 0 : (max - min) / max;
      if (l > 248) hi++;
      if (l < 8) lo++;
    }
    const meanL = sumL / n;
    return {
      meanLuma: meanL,
      stdDev: Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL)),
      meanR: sumR / n,
      meanG: sumG / n,
      meanB: sumB / n,
      avgSaturation: sat / n,
      clippedHighlights: hi / n,
      clippedShadows: lo / n,
    };
  } catch {
    return null;
  }
}

export function suggestAutoEnhance(stats: ImageStats): Partial<Adjustments> {
  const out: Partial<Adjustments> = {};
  const target = 132;
  out.brightness = Math.round(Math.max(-28, Math.min(34, (target - stats.meanLuma) * 0.32)));
  out.contrast = Math.round(Math.max(-10, Math.min(26, 22 - stats.stdDev * 0.22)));
  out.saturation = Math.round(Math.max(-12, Math.min(24, 14 - stats.avgSaturation * 22)));
  if (stats.clippedHighlights > 0.03) out.highlights = -Math.min(35, Math.round(stats.clippedHighlights * 240));
  if (stats.clippedShadows > 0.03) out.shadows = Math.min(35, Math.round(stats.clippedShadows * 240));
  out.sharpness = 10;
  return out;
}

export function suggestAutoColor(stats: ImageStats): Partial<Adjustments> {
  const avg = (stats.meanR + stats.meanG + stats.meanB) / 3 || 1;
  const temp = ((stats.meanR - stats.meanB) / avg) * 100;
  const tint = ((stats.meanG - (stats.meanR + stats.meanB) / 2) / avg) * 100;
  return {
    temperature: Math.round(Math.max(-30, Math.min(30, -temp * 0.9))),
    tint: Math.round(Math.max(-25, Math.min(25, -tint * 0.9))),
    saturation: 5,
  };
}

export interface AIIntent {
  adjustments: Partial<Adjustments>;
  filterId?: string;
  aspect?: string;
  addSubtitles?: boolean;
  speed?: number;
  transition?: ClipTransition;
  clipEffect?: string | null;
  clipDuration?: number;
  needsProvider?: string;
  actions: string[];
  summary: string;
}

function bumpAdjustment(
  out: Partial<Adjustments>,
  key: keyof Adjustments,
  value: number,
  mode: "add" | "set" = "add"
) {
  out[key] = mode === "set" ? value : (out[key] ?? 0) + value;
}

export function parseEditingPrompt(promptRaw: string): AIIntent {
  const prompt = promptRaw.toLowerCase();
  const out: Partial<Adjustments> = {};
  const actions: string[] = [];
  let filterId: string | undefined;
  let aspect: string | undefined;

  if (/(cinematic|movie|film look)/.test(prompt)) {
    filterId = "cinematic";
    bumpAdjustment(out, "contrast", 8);
    bumpAdjustment(out, "shadows", -6);
    actions.push("Applied cinematic grade");
  }
  if (/(vintage|retro|old|analog)/.test(prompt)) {
    filterId = "vintage";
    bumpAdjustment(out, "grain", 12);
    actions.push("Applied vintage film look");
  }
  if (/(warm|golden|sunset|cozy)/.test(prompt)) {
    filterId = filterId ?? "warm";
    bumpAdjustment(out, "temperature", 22);
    bumpAdjustment(out, "saturation", 6);
    actions.push("Warmed color temperature");
  }
  if (/(cool|cold|blue tone|teal)/.test(prompt)) {
    filterId = filterId ?? "cool";
    bumpAdjustment(out, "temperature", -20);
    actions.push("Cooled color temperature");
  }
  if (/(moody|dramatic|dark and|moody)/.test(prompt)) {
    filterId = "moody";
    bumpAdjustment(out, "contrast", 10);
    bumpAdjustment(out, "saturation", -12);
    actions.push("Added moody contrast");
  }
  if (/(black and white|black & white|b&w|monochrome|mono)/.test(prompt)) {
    filterId = "bw";
    bumpAdjustment(out, "contrast", 8);
    actions.push("Converted to black & white");
  }
  if (/(bright|brighter|lighten|improve the lighting|lighting)/.test(prompt)) {
    bumpAdjustment(out, "brightness", 14);
    bumpAdjustment(out, "exposure", 8);
    actions.push("Lifted exposure and brightness");
  }
  if (/(darker|darken|reduce light)/.test(prompt)) {
    bumpAdjustment(out, "brightness", -14);
    bumpAdjustment(out, "exposure", -8);
    actions.push("Reduced brightness");
  }
  if (/(hdr|high dynamic|contrast)/.test(prompt) && !filterId) {
    filterId = "hdr";
    actions.push("Expanded dynamic range");
  }
  if (/(sharpen|sharp|crisp|clarity)/.test(prompt)) {
    bumpAdjustment(out, "sharpness", 18);
    actions.push("Increased sharpness");
  }
  if (/(blur|dreamy|soft focus)/.test(prompt)) {
    bumpAdjustment(out, "blur", 12);
    actions.push("Added soft blur");
  }
  if (/(noisy|noise|denoise)/.test(prompt)) {
    bumpAdjustment(out, "grain", -10);
    bumpAdjustment(out, "sharpness", 8);
    actions.push("Reduced noise and recovered detail");
  }
  if (/(vignette|dark edges)/.test(prompt)) {
    bumpAdjustment(out, "vignette", 18);
    actions.push("Added vignette");
  }
  if (/(portrait|skin|selfie)/.test(prompt)) {
    filterId = filterId ?? "portrait";
    bumpAdjustment(out, "shadows", 8);
    actions.push("Applied portrait grade");
  }
  if (/(landscape|nature|outdoor)/.test(prompt)) {
    filterId = filterId ?? "landscape";
    bumpAdjustment(out, "saturation", 10);
    actions.push("Enhanced landscape colors");
  }

  let transition: ClipTransition | undefined;
  let clipEffect: string | null | undefined;
  let clipDuration: number | undefined;

  const pickTransition = (type: ClipTransition["type"], duration: number, label: string) => {
    if (transition) return;
    transition = { type, duration };
    actions.push(label);
  };

  if (/(glitch|datamosh)/.test(prompt)) {
    clipEffect = clipEffect ?? "glitch";
    pickTransition("none", 0.15, "Used glitch cuts");
  }
  if (/(shake|handheld)/.test(prompt)) {
    clipEffect = clipEffect ?? "shake";
    actions.push("Added handheld shake");
  }
  if (/(flash|strobe)/.test(prompt)) {
    clipEffect = clipEffect ?? "flash";
    actions.push("Added flash accents");
  }
  if (/(ken burns|panning|\bpan\b|drift)/.test(prompt)) {
    clipEffect = clipEffect ?? "zoomIn";
    actions.push("Added slow camera drift");
  }

  if (/(zoom transition|punch in)/.test(prompt)) {
    pickTransition("zoom", 0.5, "Used zoom transitions");
  } else if (/wipe/.test(prompt)) {
    pickTransition("wipe", 0.6, "Used wipe transitions");
  } else if (/(slide|swipe)/.test(prompt)) {
    pickTransition("slide", 0.55, "Used slide transitions");
  } else if (/(dissolve|cross ?fade|crossfade|smooth transition)/.test(prompt)) {
    pickTransition("dissolve", 0.9, "Used cross dissolves");
  } else if (/(fade|blend)/.test(prompt)) {
    pickTransition("fade", 0.8, "Used fades between clips");
  } else if (/(dreamy|soft focus|blur transition)/.test(prompt)) {
    pickTransition("blur", 1, "Used blur transitions");
  }

  if (/(slow|calm|relax|chill|gentle|ambient)/.test(prompt)) {
    clipDuration = clipDuration ?? 5.5;
    clipEffect = clipEffect ?? "zoomIn";
    pickTransition("fade", 1.2, "Set a slow, relaxed pace");
  } else if (/(fast|energetic|upbeat|punchy|viral|hype|dynamic)/.test(prompt)) {
    clipDuration = clipDuration ?? 2.5;
    pickTransition("zoom", 0.4, "Set a fast, energetic pace");
  } else if (/(aesthetic|smooth|elegant|slideshow|montage)/.test(prompt)) {
    clipDuration = clipDuration ?? 4.5;
    pickTransition("dissolve", 0.9, "Built a smooth montage flow");
  }

  if (!transition && /(cinematic|movie|film look)/.test(prompt)) {
    clipDuration = clipDuration ?? 5;
    clipEffect = clipEffect ?? "zoomIn";
    pickTransition("fade", 1, "Used cinematic fades");
  } else if (!transition && /(vintage|retro|old|analog)/.test(prompt)) {
    pickTransition("fade", 0.8, "Used analog fades");
  }

  if (/(tiktok|reels|shorts|vertical)/.test(prompt)) {
    aspect = "9:16";
    actions.push("Set aspect ratio to 9:16");
  } else if (/youtube/.test(prompt)) {
    aspect = "16:9";
    actions.push("Set aspect ratio to 16:9");
  } else if (/instagram (post|square)/.test(prompt)) {
    aspect = "1:1";
    actions.push("Set aspect ratio to 1:1");
  } else if (/instagram portrait/.test(prompt)) {
    aspect = "4:5";
    actions.push("Set aspect ratio to 4:5");
  }

  const addSubtitles = /(subtitle|caption|transcri|speech)/.test(prompt);
  if (addSubtitles) actions.push("Add text or subtitle clips");

  let speed: number | undefined;
  if (/(slow motion|slowmo|slow down)/.test(prompt)) {
    speed = 0.5;
    actions.push("Set clip speed to 0.5x");
  } else if (/(fast motion|speed up|faster)/.test(prompt)) {
    speed = 2;
    actions.push("Set clip speed to 2x");
  }

  let needsProvider: string | undefined;
  if (/(remove (the )?background|cutout)/.test(prompt)) needsProvider = "background removal";
  else if (/(generate|create an image|imagine)/.test(prompt)) needsProvider = "image generation";
  else if (/(upscale|super resolution)/.test(prompt)) needsProvider = "AI upscaling";
  else if (/(remove (the )?object|erase)/.test(prompt)) needsProvider = "object removal";
  else if (/(face enhance|restore face)/.test(prompt)) needsProvider = "face enhancement";
  else if (/(relight|relighting)/.test(prompt)) needsProvider = "AI relighting";

  if (actions.length === 0 && !needsProvider) {
    actions.push("Applied a balanced auto grade");
    out.brightness = 8;
    out.contrast = 8;
    out.saturation = 6;
  }

  return {
    adjustments: out,
    filterId,
    aspect,
    addSubtitles,
    speed,
    transition,
    clipEffect,
    clipDuration,
    needsProvider,
    actions,
    summary: actions.join(" · "),
  };
}
