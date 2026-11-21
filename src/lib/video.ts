import type { Adjustments, VideoClip, VideoDoc, VideoTrack } from "./types";
import { DEFAULT_ADJUSTMENTS } from "./types";
import { resolveAdjustments } from "./presets";

export const ASPECTS = [
  { id: "16:9", label: "16:9", hint: "YouTube", w: 16, h: 9 },
  { id: "9:16", label: "9:16", hint: "TikTok · Reels · Shorts", w: 9, h: 16 },
  { id: "1:1", label: "1:1", hint: "Instagram", w: 1, h: 1 },
  { id: "4:5", label: "4:5", hint: "Instagram Portrait", w: 4, h: 5 },
  { id: "4:3", label: "4:3", hint: "Classic", w: 4, h: 3 },
  { id: "21:9", label: "21:9", hint: "Cinematic", w: 21, h: 9 },
] as const;

export const RESOLUTIONS = [
  { id: "720p", label: "720p HD", height: 720 },
  { id: "1080p", label: "1080p Full HD", height: 1080 },
  { id: "1440p", label: "2K QHD", height: 1440 },
  { id: "2160p", label: "4K UHD", height: 2160 },
] as const;

export const EFFECTS = [
  { id: "freeze", label: "Freeze Frame" },
  { id: "zoomIn", label: "Zoom In" },
  { id: "zoomOut", label: "Zoom Out" },
  { id: "shake", label: "Shake" },
  { id: "glitch", label: "Glitch" },
  { id: "flash", label: "Flash" },
  { id: "blurPulse", label: "Blur Pulse" },
  { id: "panLeft", label: "Pan Left" },
  { id: "panRight", label: "Pan Right" },
] as const;

export const TRANSITIONS = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "dissolve", label: "Cross Dissolve" },
  { id: "slide", label: "Slide" },
  { id: "zoom", label: "Zoom" },
  { id: "wipe", label: "Wipe" },
  { id: "blur", label: "Blur" },
] as const;

export const TEXT_ANIMATIONS = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "slide", label: "Slide" },
  { id: "typewriter", label: "Typewriter" },
  { id: "pop", label: "Pop" },
  { id: "bounce", label: "Bounce" },
  { id: "zoom", label: "Zoom" },
] as const;

export const FONT_FAMILIES = [
  "Inter",
  "Georgia",
  "Arial",
  "Times New Roman",
  "Courier New",
  "Impact",
  "Trebuchet MS",
  "Verdana",
  "system-ui",
];

export const DEFAULT_TEXT_STYLE: NonNullable<VideoClip["textStyle"]> = {
  fontFamily: "Inter",
  fontSize: 64,
  color: "#ffffff",
  background: "transparent",
  bold: true,
  italic: false,
  align: "center",
  stroke: "transparent",
  shadow: true,
  letterSpacing: 0,
  lineHeight: 1.15,
};

export function createTrack(type: VideoTrack["type"], name: string): VideoTrack {
  return {
    id: `trk_${type}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    name,
    muted: false,
    locked: false,
    hidden: false,
  };
}

export function createDefaultTracks(): VideoTrack[] {
  return [
    { ...createTrack("text", "Text"), id: "track_text" },
    { ...createTrack("overlay", "Overlay"), id: "track_overlay" },
    { ...createTrack("video", "Video"), id: "track_video" },
    { ...createTrack("audio", "Audio"), id: "track_audio" },
  ];
}

export function createDefaultVideoDoc(aspect = "16:9"): VideoDoc {
  return {
    tracks: createDefaultTracks(),
    clips: [],
    duration: 15,
    aspect,
    fps: 30,
    background: "#07080c",
  };
}

export function baseClip(partial: Partial<VideoClip>): VideoClip {
  const id = partial.id ?? `clp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    trackId: partial.trackId ?? "track_video",
    name: partial.name ?? "Clip",
    kind: partial.kind ?? "video",
    start: 0,
    duration: 4,
    inPoint: 0,
    speed: 1,
    volume: 100,
    muted: false,
    opacity: 100,
    scale: 100,
    x: 0,
    y: 0,
    rotation: 0,
    flipX: false,
    flipY: false,
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    filterId: null,
    filterIntensity: 100,
    fadeIn: 0,
    fadeOut: 0,
    effect: null,
    transitionIn: { type: "none", duration: 0.6 },
    ...partial,
  };
}

export function createTextClip(
  trackId: string,
  start: number,
  text: string,
  duration = 4,
  style?: Partial<NonNullable<VideoClip["textStyle"]>>
): VideoClip {
  return baseClip({
    trackId,
    kind: "text",
    name: text.slice(0, 24) || "Text",
    text,
    start,
    duration,
    textStyle: { ...DEFAULT_TEXT_STYLE, ...style },
    animation: "fade",
  });
}

export function createMediaClip(
  trackId: string,
  assetId: string,
  name: string,
  kind: "video" | "image" | "audio",
  start: number,
  duration: number
): VideoClip {
  return baseClip({
    trackId,
    assetId,
    kind,
    name,
    start,
    duration,
    inPoint: 0,
    volume: kind === "audio" ? 80 : kind === "video" ? 60 : 100,
  });
}

export function computeDuration(clips: VideoClip[]): number {
  let max = 0;
  for (const c of clips) max = Math.max(max, c.start + c.duration);
  return Math.max(1, Math.ceil(max * 10) / 10);
}

export function clipAt(clips: VideoClip[], trackId: string, time: number): VideoClip | undefined {
  return clips.find((c) => c.trackId === trackId && time >= c.start && time < c.start + c.duration);
}

export function clipEnd(c: VideoClip) {
  return c.start + c.duration;
}

export function sourceDuration(c: VideoClip, assetDuration?: number): number {
  if (c.kind === "image" || c.kind === "text") return c.duration * c.speed;
  return Math.max(0.1, (assetDuration ?? c.duration) - c.inPoint);
}

export function splitClip(clip: VideoClip, time: number): [VideoClip, VideoClip] | null {
  if (time <= clip.start + 0.05 || time >= clip.start + clip.duration - 0.05) return null;
  const offset = time - clip.start;
  const left: VideoClip = { ...clip, duration: offset };
  const right: VideoClip = {
    ...clip,
    id: `clp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    start: time,
    inPoint: clip.inPoint + offset * clip.speed,
    duration: clip.duration - offset,
    transitionIn: { type: "none", duration: 0.4 },
  };
  return [left, right];
}

export function snapTo(value: number, points: number[], threshold = 0.12): number {
  let closest = value;
  let best = threshold;
  for (const p of points) {
    const d = Math.abs(p - value);
    if (d < best) {
      best = d;
      closest = p;
    }
  }
  return Math.round(closest * 100) / 100;
}

export function buildCanvasFilter(base: Adjustments, filterId: string | null, intensity: number, blurStrength = 0): string {
  const { adjustments } = resolveAdjustments(base, filterId, intensity);
  const b = 1 + adjustments.brightness / 90 + adjustments.exposure / 100;
  const c = 1 + adjustments.contrast / 100;
  const s = Math.max(0, 1 + adjustments.saturation / 100);
  const sepia = adjustments.temperature > 0 ? Math.min(0.32, adjustments.temperature / 320) : 0;
  const hue = adjustments.temperature < 0 ? -8 : 4;
  const blur = blurStrength > 0 ? blurStrength : adjustments.blur / 100 * 6;
  return `brightness(${b.toFixed(3)}) contrast(${c.toFixed(3)}) saturate(${s.toFixed(3)}) sepia(${sepia.toFixed(
    3
  )}) hue-rotate(${hue}deg) blur(${blur.toFixed(2)}px)`;
}

export function transitionProgress(clip: VideoClip, time: number): number {
  if (clip.transitionIn.type === "none" || clip.transitionIn.duration <= 0) return 1;
  const t = (time - clip.start) / clip.transitionIn.duration;
  return Math.max(0, Math.min(1, t));
}

export function getPreviousClip(clips: VideoClip[], clip: VideoClip): VideoClip | undefined {
  return clips
    .filter((c) => c.trackId === clip.trackId && c.id !== clip.id && Math.abs(clipEnd(c) - clip.start) < 0.06)
    .sort((a, b) => b.start - a.start)[0];
}

