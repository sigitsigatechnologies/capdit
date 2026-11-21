import type { Adjustments, ClipTransition } from "../types";

export interface AIIntent {
  adjustments: Partial<Adjustments>;
  filterId?: string;
  aspect?: string;
  speed?: number;
  transition?: ClipTransition;
  clipEffect?: string | null;
  clipDuration?: number;
  needsProvider?: string;
  actions: string[];
  summary: string;
}

function bump(out: Partial<Adjustments>, key: keyof Adjustments, value: number) {
  out[key] = (out[key] ?? 0) + value;
}

export function parseEditingPrompt(promptRaw: string): AIIntent {
  const prompt = promptRaw.toLowerCase();
  const out: Partial<Adjustments> = {};
  const actions: string[] = [];
  let filterId: string | undefined;
  let aspect: string | undefined;
  let transition: ClipTransition | undefined;
  let clipEffect: string | null | undefined;
  let clipDuration: number | undefined;

  const pickTransition = (type: ClipTransition["type"], duration: number, label: string) => {
    if (transition) return;
    transition = { type, duration };
    actions.push(label);
  };

  if (/(cinematic|movie|film look)/.test(prompt)) {
    filterId = "cinematic";
    bump(out, "contrast", 8);
    bump(out, "shadows", -6);
    actions.push("Applied cinematic grade");
  }
  if (/(vintage|retro|old|analog)/.test(prompt)) {
    filterId = "vintage";
    bump(out, "grain", 12);
    actions.push("Applied vintage film look");
  }
  if (/(warm|golden|sunset|cozy)/.test(prompt)) {
    filterId = filterId ?? "warm";
    bump(out, "temperature", 22);
    bump(out, "saturation", 6);
    actions.push("Warmed color temperature");
  }
  if (/(cool|cold|blue tone|teal)/.test(prompt)) {
    filterId = filterId ?? "cool";
    bump(out, "temperature", -20);
    actions.push("Cooled color temperature");
  }
  if (/(moody|dramatic|dark and)/.test(prompt)) {
    filterId = "moody";
    bump(out, "contrast", 10);
    bump(out, "saturation", -12);
    actions.push("Added moody contrast");
  }
  if (/(black and white|black & white|b&w|monochrome|mono)/.test(prompt)) {
    filterId = "bw";
    bump(out, "contrast", 8);
    actions.push("Converted to black & white");
  }
  if (/(bright|brighter|lighten|improve the lighting|lighting)/.test(prompt)) {
    bump(out, "brightness", 14);
    bump(out, "exposure", 8);
    actions.push("Lifted exposure and brightness");
  }
  if (/(darker|darken|reduce light)/.test(prompt)) {
    bump(out, "brightness", -14);
    bump(out, "exposure", -8);
    actions.push("Reduced brightness");
  }
  if (/(hdr|high dynamic|contrast)/.test(prompt) && !filterId) {
    filterId = "hdr";
    actions.push("Expanded dynamic range");
  }
  if (/(sharpen|sharp|crisp|clarity)/.test(prompt)) {
    bump(out, "sharpness", 18);
    actions.push("Increased sharpness");
  }
  if (/(blur|dreamy|soft focus)/.test(prompt)) {
    bump(out, "blur", 12);
    actions.push("Added soft blur");
  }
  if (/(noisy|noise|denoise)/.test(prompt)) {
    bump(out, "grain", -10);
    bump(out, "sharpness", 8);
    actions.push("Reduced noise and recovered detail");
  }
  if (/(vignette|dark edges)/.test(prompt)) {
    bump(out, "vignette", 18);
    actions.push("Added vignette");
  }
  if (/(portrait|skin|selfie)/.test(prompt)) {
    filterId = filterId ?? "portrait";
    bump(out, "shadows", 8);
    actions.push("Applied portrait grade");
  }
  if (/(landscape|nature|outdoor|travel)/.test(prompt)) {
    filterId = filterId ?? "landscape";
    bump(out, "saturation", 10);
    actions.push("Enhanced landscape colors");
  }

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

  if (/(subtitle|caption|transcri|speech)/.test(prompt)) actions.push("Add text or subtitle clips");

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
    speed,
    transition,
    clipEffect,
    clipDuration,
    needsProvider,
    actions,
    summary: actions.join(" · "),
  };
}
