import { clamp } from "./utils";
import type { HLSLookupKey, HSLParams, LightroomPreset } from "./types";

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

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

function toUuid(raw: string): string {
  const valid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (valid.test(raw)) return raw.toUpperCase();
  const hex = [1, 2, 3, 4].map((s) => hashHex(raw, s * 2654435761)).join("");
  const chars = hex.split("");
  chars[12] = "4";
  chars[16] = "8";
  const s = chars.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`.toUpperCase();
}

function hslAttrs(hsl: Record<HLSLookupKey, HSLParams>): string[] {
  const out: string[] = [];
  (Object.keys(HSL_ATTR) as HLSLookupKey[]).forEach((key) => {
    const suffix = HSL_ATTR[key];
    const p = hsl[key];
    out.push(`    crs:HueAdjustment${suffix}="0"`);
    out.push(`    crs:SaturationAdjustment${suffix}="${n(clamp(p.saturation - 50, -100, 100))}"`);
    out.push(`    crs:LuminanceAdjustment${suffix}="${n(clamp(p.luminance - 50, -100, 100))}"`);
  });
  return out;
}

function toneCurveSeq(points: { x: number; y: number }[]): string {
  const li = points
    .map((p) => `      <rdf:li>${Math.round(clamp(p.x, 0, 1) * 255)}, ${Math.round(clamp(p.y, 0, 1) * 255)}</rdf:li>`)
    .join("\n");
  return `   <crs:ToneCurvePV2012>\n    <rdf:Seq>\n${li}\n    </rdf:Seq>\n   </crs:ToneCurvePV2012>`;
}

export function buildXmpXml(preset: LightroomPreset): string {
  const presetName = esc(preset.name.replace(/\.[^.]+$/, ""));
  const group = "CAPDIT Presets";
  const uuid = toUuid(preset.id);
  const b = preset.basic;
  const d = preset.detail;
  const e = preset.effects;
  const cal = preset.calibration;
  const kelvin = Math.round(clamp(5500 + b.temperature * 35, 2000, 12000));
  const tint = clamp(Math.round(b.tint), -150, 150);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>');
  lines.push('<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00">');
  lines.push(' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">');
  lines.push('  <rdf:Description rdf:about=""');
  lines.push('    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"');
  lines.push('    crs:PresetType="Normal"');
  lines.push('    crs:Cluster=""');
  lines.push(`    crs:UUID="${uuid}"`);
  lines.push('    crs:SupportsAmount="True"');
  lines.push('    crs:SupportsColor="True"');
  lines.push('    crs:SupportsMonochrome="True"');
  lines.push('    crs:SupportsHighDynamicRange="True"');
  lines.push('    crs:SupportsNormalDynamicRange="True"');
  lines.push('    crs:SupportsSceneReferred="True"');
  lines.push('    crs:SupportsOutputReferred="True"');
  lines.push('    crs:CameraModelRestriction=""');
  lines.push('    crs:Copyright="CAPDIT Presets (c) 2026"');
  lines.push('    crs:ContactInfo=""');
  lines.push('    crs:Version="16.0"');
  lines.push('    crs:ProcessVersion="11.0"');
  lines.push('    crs:ConvertToGrayscale="False"');
  lines.push('    crs:WhiteBalance="Custom"');
  lines.push(`    crs:Temperature="${kelvin}"`);
  lines.push(`    crs:Tint="${tint}"`);
  lines.push(`    crs:Exposure2012="${n(b.exposure, 2)}"`);
  lines.push(`    crs:Contrast2012="${n(b.contrast)}"`);
  lines.push(`    crs:Highlights2012="${n(b.highlights)}"`);
  lines.push(`    crs:Shadows2012="${n(b.shadows)}"`);
  lines.push(`    crs:Whites2012="${n(b.whites)}"`);
  lines.push(`    crs:Blacks2012="${n(b.blacks)}"`);
  lines.push(`    crs:Texture="${n(b.texture)}"`);
  lines.push(`    crs:Clarity2012="${n(b.clarity)}"`);
  lines.push(`    crs:Dehaze="${n(b.dehaze)}"`);
  lines.push(`    crs:Vibrance="${n(b.vibrance)}"`);
  lines.push(`    crs:Saturation="${n(b.saturation)}"`);
  lines.push('    crs:ParametricShadows="0"');
  lines.push('    crs:ParametricDarks="0"');
  lines.push('    crs:ParametricLights="0"');
  lines.push('    crs:ParametricHighlights="0"');
  lines.push('    crs:ParametricShadowSplit="25"');
  lines.push('    crs:ParametricMidtoneSplit="50"');
  lines.push('    crs:ParametricHighlightSplit="75"');
  lines.push(`    crs:Sharpness="${n(d.sharpening)}"`);
  lines.push(`    crs:SharpenRadius="${n(d.radius, 1)}"`);
  lines.push(`    crs:SharpenDetail="${n(d.detail)}"`);
  lines.push(`    crs:SharpenEdgeMasking="${n(d.masking)}"`);
  lines.push(`    crs:LuminanceSmoothing="${n(d.noiseReduction)}"`);
  lines.push('    crs:ColorNoiseReduction="25"');
  lines.push('    crs:ColorNoiseReductionDetail="50"');
  lines.push('    crs:ColorNoiseReductionSmoothness="50"');
  hslAttrs(preset.hsl).forEach((line) => lines.push(line));
  lines.push('    crs:SplitToningShadowHue="0"');
  lines.push('    crs:SplitToningShadowSaturation="0"');
  lines.push('    crs:SplitToningHighlightHue="0"');
  lines.push('    crs:SplitToningHighlightSaturation="0"');
  lines.push('    crs:SplitToningBalance="0"');
  lines.push('    crs:ColorGradeMidtoneHue="0"');
  lines.push('    crs:ColorGradeMidtoneSat="0"');
  lines.push('    crs:ColorGradeMidtoneLum="0"');
  lines.push('    crs:ColorGradeShadowLum="0"');
  lines.push('    crs:ColorGradeHighlightLum="0"');
  lines.push('    crs:ColorGradeBlending="50"');
  lines.push('    crs:ColorGradeGlobalHue="0"');
  lines.push('    crs:ColorGradeGlobalSat="0"');
  lines.push('    crs:ColorGradeGlobalLum="0"');
  lines.push('    crs:AutoLateralCA="0"');
  lines.push('    crs:LensProfileEnable="0"');
  lines.push('    crs:LensProfileSetup="LensDefaults"');
  lines.push('    crs:DefringePurpleAmount="0"');
  lines.push('    crs:DefringePurpleHueLo="30"');
  lines.push('    crs:DefringePurpleHueHi="70"');
  lines.push('    crs:DefringeGreenAmount="0"');
  lines.push('    crs:DefringeGreenHueLo="40"');
  lines.push('    crs:DefringeGreenHueHi="60"');
  lines.push(`    crs:GrainAmount="${n(e.grain)}"`);
  lines.push(`    crs:GrainSize="${n(e.grainSize)}"`);
  lines.push(`    crs:GrainFrequency="${n(e.grainRoughness)}"`);
  lines.push(`    crs:PostCropVignetteAmount="${n(e.vignette)}"`);
  lines.push('    crs:PostCropVignetteMidpoint="50"');
  lines.push('    crs:PostCropVignetteFeather="50"');
  lines.push('    crs:PostCropVignetteRoundness="0"');
  lines.push('    crs:PostCropVignetteStyle="1"');
  lines.push('    crs:ShadowTint="0"');
  lines.push('    crs:RedHue="0"');
  lines.push(`    crs:RedSaturation="${n(clamp(cal.red.saturation - 50, -100, 100))}"`);
  lines.push('    crs:GreenHue="0"');
  lines.push(`    crs:GreenSaturation="${n(clamp(cal.green.saturation - 50, -100, 100))}"`);
  lines.push('    crs:BlueHue="0"');
  lines.push(`    crs:BlueSaturation="${n(clamp(cal.blue.saturation - 50, -100, 100))}"`);
  lines.push('    crs:RawFileName=""');
  lines.push('    crs:OverrideLookVignette="False"');
  lines.push('    crs:ToneCurveName2012="Custom"');
  lines.push('    crs:CameraProfile="Adobe Standard"');
  lines.push('    crs:HasSettings="True"');
  lines.push('    crs:HasCrop="False"');
  lines.push('    crs:AlreadyApplied="False">');
  lines.push('   <crs:Name>');
  lines.push('    <rdf:Alt>');
  lines.push(`     <rdf:li xml:lang="x-default">${presetName}</rdf:li>`);
  lines.push('    </rdf:Alt>');
  lines.push('   </crs:Name>');
  lines.push('   <crs:ShortName>');
  lines.push('    <rdf:Alt>');
  lines.push(`     <rdf:li xml:lang="x-default">${presetName}</rdf:li>`);
  lines.push('    </rdf:Alt>');
  lines.push('   </crs:ShortName>');
  lines.push('   <crs:Group>');
  lines.push('    <rdf:Alt>');
  lines.push(`     <rdf:li xml:lang="x-default">${group}</rdf:li>`);
  lines.push('    </rdf:Alt>');
  lines.push('   </crs:Group>');
  lines.push(toneCurveSeq(preset.toneCurve.rgb));
  lines.push('  </rdf:Description>');
  lines.push(' </rdf:RDF>');
  lines.push('</x:xmpmeta>');
  lines.push('<?xpacket end="w"?>');
  return lines.join("\n") + "\n";
}

export async function generateXmpBlob(preset: LightroomPreset): Promise<Blob> {
  const xml = buildXmpXml(preset);
  return new Blob([xml], { type: "application/xml;charset=utf-8" });
}

export function downloadXmp(preset: LightroomPreset): Promise<void> {
  const fileName = `${preset.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xmp`;
  return generateXmpBlob(preset).then((blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
}
