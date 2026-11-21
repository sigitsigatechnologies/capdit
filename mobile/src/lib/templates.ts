import type { Adjustments, ProjectMode } from "../types";
import { createDefaultVideoDoc, createTextClip } from "./video";

export interface StudioTemplate {
  id: string;
  name: string;
  category: string;
  mode: ProjectMode;
  aspect: string;
  description: string;
  gradient: [string, string];
  filterId?: string;
  adjustments?: Partial<Adjustments>;
  title?: string;
  subtitle?: string;
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "tiktok",
    name: "TikTok Viral",
    category: "Social",
    mode: "video",
    aspect: "9:16",
    description: "Fast vertical cuts with a bold hook.",
    gradient: ["#111827", "#7c3aed"],
    filterId: "retro",
    title: "YOUR HOOK HERE",
    subtitle: "Add your punchy caption",
  },
  {
    id: "reels",
    name: "Instagram Reels",
    category: "Social",
    mode: "video",
    aspect: "9:16",
    description: "Clean vertical layout with a caption bar.",
    gradient: ["#312e81", "#db2777"],
    filterId: "warm",
    title: "NEW DROP",
    subtitle: "Tap to shop the collection",
  },
  {
    id: "shorts",
    name: "YouTube Shorts",
    category: "Social",
    mode: "video",
    aspect: "9:16",
    description: "Vertical title card built for retention.",
    gradient: ["#7f1d1d", "#ef4444"],
    filterId: "cinematic",
    title: "WATCH THIS",
    subtitle: "3 tips in 30 seconds",
  },
  {
    id: "youtube-intro",
    name: "YouTube Intro",
    category: "YouTube",
    mode: "video",
    aspect: "16:9",
    description: "Cinematic widescreen opener.",
    gradient: ["#0f172a", "#0ea5e9"],
    filterId: "cinematic",
    title: "YOUR CHANNEL",
    subtitle: "Every week · New videos",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    category: "Film",
    mode: "video",
    aspect: "21:9",
    description: "Letterbox feel with slow fades.",
    gradient: ["#0b0b0b", "#b45309"],
    filterId: "film",
    title: "A FILM BY YOU",
    subtitle: "Chapter One",
  },
  {
    id: "travel",
    name: "Travel",
    category: "Lifestyle",
    mode: "video",
    aspect: "16:9",
    description: "Warm, airy look with location title cards.",
    gradient: ["#0e7490", "#f59e0b"],
    filterId: "landscape",
    title: "WANDERLUST",
    subtitle: "Location · Date",
  },
  {
    id: "slideshow",
    name: "Photo Slideshow",
    category: "Photo",
    mode: "video",
    aspect: "16:9",
    description: "Slow cross dissolves between your photos.",
    gradient: ["#44403c", "#d6d3d1"],
    filterId: "film",
    title: "Our Memories",
  },
  {
    id: "portrait-glow",
    name: "Portrait Glow",
    category: "Photo",
    mode: "photo",
    aspect: "4:5",
    description: "Soft skin tones and lifted shadows.",
    gradient: ["#4c1d95", "#f0abfc"],
    filterId: "portrait",
    adjustments: { brightness: 6, contrast: 4, shadows: 8, grain: 4 },
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    category: "Photo",
    mode: "photo",
    aspect: "4:5",
    description: "Warm highlights with a filmic glow.",
    gradient: ["#78350f", "#fbbf24"],
    filterId: "warm",
    adjustments: { temperature: 14, highlights: -8, grain: 6 },
  },
  {
    id: "moody-film",
    name: "Moody Film",
    category: "Photo",
    mode: "photo",
    aspect: "16:9",
    description: "Deep shadows and muted color.",
    gradient: ["#111827", "#374151"],
    filterId: "moody",
    adjustments: { contrast: 10, saturation: -10 },
  },
  {
    id: "mono",
    name: "Mono Editorial",
    category: "Photo",
    mode: "photo",
    aspect: "1:1",
    description: "High-contrast black and white.",
    gradient: ["#1f1f1f", "#d4d4d8"],
    filterId: "bw",
    adjustments: { contrast: 12 },
  },
];

export function buildTemplateVideo(template: StudioTemplate) {
  const doc = createDefaultVideoDoc(template.aspect);
  const title = createTextClip(0, template.title ?? template.name, 4.5);
  if (template.filterId) title.filterId = template.filterId;
  doc.clips.push(title);
  if (template.subtitle) {
    const subtitle = createTextClip(4.5, template.subtitle, 3.5);
    subtitle.textStyle = { ...subtitle.textStyle!, fontSize: 30, bold: false };
    subtitle.animation = "slide";
    doc.clips.push(subtitle);
  }
  doc.duration = template.subtitle ? 8 : 4.5;
  doc.template = template.id;
  return doc;
}
