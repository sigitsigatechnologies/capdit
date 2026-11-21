import type { Adjustments, ClipTransition, VideoClip, VideoDoc, VideoTrack } from "../types";
import { DEFAULT_ADJUSTMENTS } from "../types";
import { uid } from "./utils";

export const ASPECTS = [
  { id: "16:9", label: "16:9", hint: "YouTube", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", hint: "TikTok · Reels", ratio: 9 / 16 },
  { id: "1:1", label: "1:1", hint: "Instagram", ratio: 1 },
  { id: "4:5", label: "4:5", hint: "Portrait", ratio: 4 / 5 },
  { id: "4:3", label: "4:3", hint: "Classic", ratio: 4 / 3 },
  { id: "21:9", label: "21:9", hint: "Cinematic", ratio: 21 / 9 },
] as const;

export function aspectRatio(aspect: string): number {
  return ASPECTS.find((a) => a.id === aspect)?.ratio ?? 16 / 9;
}

export const EFFECTS = [
  { id: "none", label: "None" },
  { id: "zoomIn", label: "Zoom In" },
  { id: "zoomOut", label: "Zoom Out" },
  { id: "shake", label: "Shake" },
  { id: "glitch", label: "Glitch" },
  { id: "flash", label: "Flash" },
  { id: "panLeft", label: "Pan Left" },
  { id: "panRight", label: "Pan Right" },
] as const;

export const TRANSITIONS = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "dissolve", label: "Dissolve" },
  { id: "slide", label: "Slide" },
  { id: "zoom", label: "Zoom" },
  { id: "wipe", label: "Wipe" },
  { id: "blur", label: "Blur" },
] as const;

export const TEXT_ANIMATIONS = ["none", "fade", "slide", "typewriter", "pop", "bounce", "zoom"] as const;

export function createDefaultTracks(): VideoTrack[] {
  return [
    { id: "track_text", type: "text", name: "Text", muted: false, locked: false, hidden: false },
    { id: "track_overlay", type: "overlay", name: "Overlay", muted: false, locked: false, hidden: false },
    { id: "track_video", type: "video", name: "Video", muted: false, locked: false, hidden: false },
    { id: "track_audio", type: "audio", name: "Audio", muted: false, locked: false, hidden: false },
  ];
}

export function createDefaultVideoDoc(aspect = "16:9"): VideoDoc {
  return {
    tracks: createDefaultTracks(),
    clips: [],
    duration: 0,
    aspect,
    fps: 30,
    background: "#07080c",
  };
}

export function baseClip(partial: Partial<VideoClip>): VideoClip {
  return {
    id: partial.id ?? uid("clp"),
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

export function createMediaClip(
  assetId: string,
  name: string,
  kind: "video" | "image" | "audio",
  start: number,
  duration: number
): VideoClip {
  return baseClip({
    trackId: kind === "audio" ? "track_audio" : "track_video",
    assetId,
    kind,
    name,
    start,
    duration,
    volume: kind === "audio" ? 80 : kind === "video" ? 60 : 100,
  });
}

export function createTextClip(start: number, text: string, duration = 4): VideoClip {
  return baseClip({
    trackId: "track_text",
    kind: "text",
    name: text.slice(0, 24) || "Text",
    text,
    start,
    duration,
    animation: "fade",
    textStyle: {
      fontFamily: "Inter",
      fontSize: 58,
      color: "#ffffff",
      background: "transparent",
      bold: true,
      italic: false,
      align: "center",
      letterSpacing: 0,
      lineHeight: 1.2,
    },
  });
}

export function computeDuration(clips: VideoClip[]): number {
  return Math.max(0, Math.ceil(Math.max(0, ...clips.map((c) => c.start + c.duration)) * 10) / 10);
}

export function clipAt(clips: VideoClip[], time: number): VideoClip | undefined {
  return [...clips]
    .filter((c) => c.trackId !== "track_audio" && time >= c.start && time < c.start + c.duration)
    .sort((a, b) => b.start - a.start)[0];
}

export function applyIntentToClip(
  clip: VideoClip,
  intent: { filterId?: string; adjustments: Partial<Adjustments>; clipEffect?: string | null }
) {
  if (intent.filterId) clip.filterId = intent.filterId;
  clip.adjustments = { ...clip.adjustments, ...intent.adjustments };
  if (intent.clipEffect) clip.effect = intent.clipEffect;
}

export function slotByIndex(doc: VideoDoc, clipId: string, direction: -1 | 1): VideoDoc {
  const visual = doc.clips.filter((c) => c.trackId === "track_video").sort((a, b) => a.start - b.start);
  const index = visual.findIndex((c) => c.id === clipId);
  const swap = index + direction;
  if (index < 0 || swap < 0 || swap >= visual.length) return doc;
  const a = visual[index];
  const b = visual[swap];
  const aStart = a.start;
  a.start = b.start;
  b.start = aStart;
  return { ...doc, clips: doc.clips.map((c) => (c.id === a.id ? { ...a } : c.id === b.id ? { ...b } : c)) };
}

export function transitionLabel(transition: ClipTransition): string {
  if (transition.type === "none") return "";
  return `${transition.type} ${transition.duration.toFixed(1)}s`;
}
