import { create } from "xmlbuilder2";
import { clamp } from "@/lib/utils";
import { clampAdjustments, type Adjustments } from "@/lib/adjustments";
import { generatePresetFromAdjustments } from "@/lib/generation";
import type { HLSLookupKey, HSLParams, LightroomPreset } from "@/lib/types";
import type { FilmStyle } from "./types";

const CAMERA_RAW_NS = "http://ns.adobe.com/camera-raw-settings/1.0/";
const GROUP_NAME = "LUMA CAPDIT Studio Presets";
const HSL_ATTR: Record<HLSLookupKey, string> = {
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  aqua: "Aqua",
  blue: "Blue",
  purple: "Purple",
  magenta: "Magenta",
};

function n(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "0";
  return String(Number(value.toFixed(decimals)));
}

function hashHex(input: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function toUuid(raw: string): string {
  const valid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (valid.test(raw)) return raw.toUpperCase();
  const hex = [1, 2, 3, 4].map((seed) => hashHex(raw, seed * 2654435761)).join("");
  const chars = hex.split("");
  chars[12] = "4";
  chars[16] = "8";
  const s = chars.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`.toUpperCase();
}

export function buildPreset(adjust: Adjustments, name: string, style?: FilmStyle): LightroomPreset {
  const safeName = name.trim() || "LUMA Preset";
  const preset = generatePresetFromAdjustments(clampAdjustments(adjust), safeName);
  preset.id = `luma_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  preset.name = safeName;
  preset.sourceFileName = safeName;

  if (style?.hslBias) {
    (Object.keys(style.hslBias) as Array<keyof NonNullable<FilmStyle["hslBias"]>>).forEach((key) => {
      const bias = style.hslBias?.[key];
      if (!bias) return;
      const current: HSLParams = preset.hsl[key as HLSLookupKey];
      preset.hsl[key as HLSLookupKey] = {
        hue: current.hue,
        saturation: clamp(50 + (bias.saturation ?? 0), 0, 100),
        luminance: clamp(50 + (bias.luminance ?? 0), 0, 100),
      };
    });
  }

  return preset;
}

export function buildXmpXml(preset: LightroomPreset): string {
  const presetName = preset.name.replace(/\.[^.]+$/, "");
  const uuid = toUuid(preset.id);
  const b = preset.basic;
  const d = preset.detail;
  const e = preset.effects;
  const cal = preset.calibration;
  const isBW = b.saturation <= -99;
  const kelvin = Math.round(clamp(5500 + b.temperature * 35, 2000, 12000));

  const attrs: Record<string, string> = {
    "rdf:about": "",
    "xmlns:crs": CAMERA_RAW_NS,
    "crs:PresetType": "Normal",
    "crs:Cluster": "",
    "crs:UUID": uuid,
    "crs:SupportsAmount": "True",
    "crs:SupportsColor": "True",
    "crs:SupportsMonochrome": "True",
    "crs:SupportsHighDynamicRange": "True",
    "crs:SupportsNormalDynamicRange": "True",
    "crs:SupportsSceneReferred": "True",
    "crs:SupportsOutputReferred": "True",
    "crs:CameraModelRestriction": "",
    "crs:Copyright": "LUMA CAPDIT Studio Presets (c) 2026",
    "crs:ContactInfo": "",
    "crs:Version": "16.0",
    "crs:ProcessVersion": "11.0",
    "crs:ConvertToGrayscale": isBW ? "True" : "False",
    "crs:Treatment": isBW ? "Black and White" : "Color",
    "crs:WhiteBalance": "Custom",
    "crs:Temperature": String(kelvin),
    "crs:Tint": n(clamp(Math.round(b.tint), -150, 150)),
    "crs:Exposure2012": n(b.exposure, 2),
    "crs:Contrast2012": n(b.contrast),
    "crs:Highlights2012": n(b.highlights),
    "crs:Shadows2012": n(b.shadows),
    "crs:Whites2012": n(b.whites),
    "crs:Blacks2012": n(b.blacks),
    "crs:Texture": n(b.texture),
    "crs:Clarity2012": n(b.clarity),
    "crs:Dehaze": n(b.dehaze),
    "crs:Vibrance": n(b.vibrance),
    "crs:Saturation": n(b.saturation),
    "crs:ParametricShadows": "0",
    "crs:ParametricDarks": "0",
    "crs:ParametricLights": "0",
    "crs:ParametricHighlights": "0",
    "crs:ParametricShadowSplit": "25",
    "crs:ParametricMidtoneSplit": "50",
    "crs:ParametricHighlightSplit": "75",
    "crs:Sharpness": n(d.sharpening),
    "crs:SharpenRadius": n(d.radius, 1),
    "crs:SharpenDetail": n(d.detail),
    "crs:SharpenEdgeMasking": n(d.masking),
    "crs:LuminanceSmoothing": n(d.noiseReduction),
    "crs:ColorNoiseReduction": "25",
    "crs:ColorNoiseReductionDetail": "50",
    "crs:ColorNoiseReductionSmoothness": "50",
    "crs:SplitToningShadowHue": "0",
    "crs:SplitToningShadowSaturation": "0",
    "crs:SplitToningHighlightHue": "0",
    "crs:SplitToningHighlightSaturation": "0",
    "crs:SplitToningBalance": "0",
    "crs:ColorGradeMidtoneHue": "0",
    "crs:ColorGradeMidtoneSat": "0",
    "crs:ColorGradeMidtoneLum": "0",
    "crs:ColorGradeShadowLum": "0",
    "crs:ColorGradeHighlightLum": "0",
    "crs:ColorGradeBlending": "50",
    "crs:ColorGradeGlobalHue": "0",
    "crs:ColorGradeGlobalSat": "0",
    "crs:ColorGradeGlobalLum": "0",
    "crs:AutoLateralCA": "0",
    "crs:LensProfileEnable": "0",
    "crs:LensProfileSetup": "LensDefaults",
    "crs:DefringePurpleAmount": "0",
    "crs:DefringePurpleHueLo": "30",
    "crs:DefringePurpleHueHi": "70",
    "crs:DefringeGreenAmount": "0",
    "crs:DefringeGreenHueLo": "40",
    "crs:DefringeGreenHueHi": "60",
    "crs:GrainAmount": n(e.grain),
    "crs:GrainSize": n(e.grainSize),
    "crs:GrainFrequency": n(e.grainRoughness),
    "crs:PostCropVignetteAmount": n(e.vignette),
    "crs:PostCropVignetteMidpoint": "50",
    "crs:PostCropVignetteFeather": "50",
    "crs:PostCropVignetteRoundness": "0",
    "crs:PostCropVignetteStyle": "1",
    "crs:ShadowTint": "0",
    "crs:RedHue": "0",
    "crs:RedSaturation": n(clamp(cal.red.saturation - 50, -100, 100)),
    "crs:GreenHue": "0",
    "crs:GreenSaturation": n(clamp(cal.green.saturation - 50, -100, 100)),
    "crs:BlueHue": "0",
    "crs:BlueSaturation": n(clamp(cal.blue.saturation - 50, -100, 100)),
    "crs:RawFileName": "",
    "crs:OverrideLookVignette": "False",
    "crs:ToneCurveName2012": "Custom",
    "crs:CameraProfile": "Adobe Standard",
    "crs:HasSettings": "True",
    "crs:HasCrop": "False",
    "crs:AlreadyApplied": "False",
  };

  (Object.keys(HSL_ATTR) as HLSLookupKey[]).forEach((key) => {
    const suffix = HSL_ATTR[key];
    const p = preset.hsl[key];
    attrs[`crs:HueAdjustment${suffix}`] = "0";
    attrs[`crs:SaturationAdjustment${suffix}`] = n(clamp(p.saturation - 50, -100, 100));
    attrs[`crs:LuminanceAdjustment${suffix}`] = n(clamp(p.luminance - 50, -100, 100));
  });

  const doc = create({ version: "1.0", encoding: "UTF-8" });
  const xmpmeta = doc.ele("x:xmpmeta", {
    "xmlns:x": "adobe:ns:meta/",
    "x:xmptk": "Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00",
  });
  const rdf = xmpmeta.ele("rdf:RDF", { "xmlns:rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#" });
  const desc = rdf.ele("rdf:Description", attrs);

  desc.ele("crs:Name").ele("rdf:Alt").ele("rdf:li", { "xml:lang": "x-default" }).txt(presetName);
  desc.ele("crs:ShortName").ele("rdf:Alt").ele("rdf:li", { "xml:lang": "x-default" }).txt(presetName);
  desc.ele("crs:Group").ele("rdf:Alt").ele("rdf:li", { "xml:lang": "x-default" }).txt(GROUP_NAME);

  const curve = desc.ele("crs:ToneCurvePV2012").ele("rdf:Seq");
  preset.toneCurve.rgb.forEach((point) => {
    curve
      .ele("rdf:li")
      .txt(`${Math.round(clamp(point.x, 0, 1) * 255)}, ${Math.round(clamp(point.y, 0, 1) * 255)}`);
  });

  const raw = doc.end({ prettyPrint: true, indent: "  " });
  const body = raw.replace(/^<\?xml[^?]*\?>\s*/, "");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>\n${body}\n<?xpacket end="w"?>\n`;
}

export interface XmpValidation {
  valid: boolean;
  errors: string[];
}

export function validateXmp(xml: string): XmpValidation {
  const errors: string[] = [];
  try {
    create(xml);
  } catch {
    errors.push("Malformed XML");
  }
  if (!xml.includes(CAMERA_RAW_NS)) errors.push("Missing Adobe Camera Raw namespace");
  ["crs:UUID", "crs:Version", "crs:ProcessVersion", "crs:Name", "crs:Exposure2012"].forEach((attr) => {
    if (!xml.includes(attr)) errors.push(`Missing ${attr}`);
  });
  if (!/crs:UUID="[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}"/.test(xml)) {
    errors.push("Invalid preset UUID");
  }
  const number = (attr: string): number | null => {
    const match = xml.match(new RegExp(`${attr}="(-?\\d+(?:\\.\\d+)?)"`));
    return match ? Number(match[1]) : null;
  };
  const ranges: Array<[string, number, number]> = [
    ["crs:Exposure2012", -5, 5],
    ["crs:Contrast2012", -100, 100],
    ["crs:Highlights2012", -100, 100],
    ["crs:Shadows2012", -100, 100],
    ["crs:Vibrance", -100, 100],
    ["crs:Saturation", -100, 100],
    ["crs:Temperature", 2000, 12000],
  ];
  ranges.forEach(([attr, min, max]) => {
    const value = number(attr);
    if (value !== null && (value < min || value > max)) errors.push(`${attr} out of range`);
  });
  return { valid: errors.length === 0, errors };
}

export function xmpFileName(name: string): string {
  const base = name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Preset";
  return base.startsWith("LUMA") ? `${base}.xmp` : `LUMA_${base}.xmp`;
}
