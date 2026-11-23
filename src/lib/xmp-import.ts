import { DEFAULT_ADJUSTMENTS, clampAdjustments, type Adjustments } from "./adjustments";
import { clamp } from "./utils";

export interface ImportedPreset {
  name: string;
  adjust: Adjustments;
}

function kelvinToRelative(value: number): number {
  if (Math.abs(value) > 1000) return clamp(Math.round((value - 5500) / 35), -100, 100);
  return clamp(Math.round(value), -100, 100);
}

export function parseXmp(text: string): ImportedPreset {
  if (typeof DOMParser === "undefined") throw new Error("Import requires a browser");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Not a valid XMP/XML file");
  }

  const attrs = new Map<string, string>();
  const elements = doc.getElementsByTagName("*");
  for (let i = 0; i < elements.length; i += 1) {
    const element = elements[i];
    for (let j = 0; j < element.attributes.length; j += 1) {
      const attr = element.attributes[j];
      const local = attr.localName || attr.name.split(":").pop() || "";
      if (local && !attrs.has(local)) attrs.set(local, attr.value);
    }
  }

  const number = (key: string, fallback = 0): number => {
    const raw = attrs.get(key);
    if (raw === undefined) return fallback;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const adjust = clampAdjustments({
    exposure: number("Exposure2012", 0),
    contrast: number("Contrast2012", 0),
    highlights: number("Highlights2012", 0),
    shadows: number("Shadows2012", 0),
    whites: number("Whites2012", 0),
    blacks: number("Blacks2012", 0),
    temperature: kelvinToRelative(number("Temperature", 5500)),
    tint: number("Tint", 0),
    vibrance: number("Vibrance", 0),
    saturation: number("Saturation", 0),
    clarity: number("Clarity2012", 0),
    texture: number("Texture", 0),
    dehaze: number("Dehaze", 0),
    sharpening: number("Sharpness", DEFAULT_ADJUSTMENTS.sharpening),
    vignette: number("PostCropVignetteAmount", 0),
    grain: number("GrainAmount", 0),
  });

  const nameEl = doc.getElementsByTagNameNS("*", "li")[0];
  const name = nameEl?.textContent?.trim() || attrs.get("PresetName") || "Imported preset";

  return { name, adjust };
}
