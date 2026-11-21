import type { Adjustments, ProjectMode, VideoDoc } from "./types";
import { baseClip, createDefaultTracks, createTextClip } from "./video";

export interface StudioTemplate {
  id: string;
  name: string;
  category: string;
  mode: ProjectMode;
  aspect: string;
  description: string;
  gradient: string;
  filterId?: string;
  adjustments?: Partial<Adjustments>;
  background?: string;
  buildVideo?: (duration: number) => VideoDoc;
  titleStyle?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    background: string;
    bold: boolean;
    italic: boolean;
    align: "left" | "center" | "right";
    stroke: string;
    shadow: boolean;
    letterSpacing: number;
    lineHeight: number;
  };
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "tiktok",
    name: "TikTok Viral",
    category: "Social",
    mode: "video",
    aspect: "9:16",
    description: "Punchy text hooks, fast cuts and bold captions for TikTok.",
    gradient: "linear-gradient(135deg,#111827,#7c3aed)",
    background: "#0b0b12",
    filterId: "retro",
    buildVideo: (duration) => buildTextTemplate(duration, "YOUR HOOK HERE", "Add your punchy caption", {
      fontSize: 76,
      color: "#ffffff",
      bold: true,
      align: "center",
      fontFamily: "Impact",
      stroke: "#101010",
    }),
  },
  {
    id: "reels",
    name: "Instagram Reels",
    category: "Social",
    mode: "video",
    aspect: "9:16",
    description: "Clean vertical layout with animated caption bar.",
    gradient: "linear-gradient(135deg,#312e81,#db2777)",
    filterId: "warm",
    buildVideo: (duration) => buildTextTemplate(duration, "NEW DROP", "Tap to shop the collection", {
      fontSize: 68,
      color: "#ffffff",
      bold: true,
      align: "center",
      background: "rgba(219,39,119,0.85)",
    }),
  },
  {
    id: "shorts",
    name: "YouTube Shorts",
    category: "Social",
    mode: "video",
    aspect: "9:16",
    description: "Vertical title card built for retention.",
    gradient: "linear-gradient(135deg,#7f1d1d,#ef4444)",
    filterId: "cinematic",
    buildVideo: (duration) => buildTextTemplate(duration, "WATCH THIS", "3 tips in 30 seconds", {
      fontSize: 82,
      color: "#ffffff",
      bold: true,
      align: "center",
      fontFamily: "Impact",
    }),
  },
  {
    id: "youtube-intro",
    name: "YouTube Intro",
    category: "YouTube",
    mode: "video",
    aspect: "16:9",
    description: "Cinematic widescreen opener with title and tagline.",
    gradient: "linear-gradient(135deg,#0f172a,#0ea5e9)",
    filterId: "cinematic",
    background: "#05070d",
    buildVideo: (duration) => buildTextTemplate(duration, "YOUR CHANNEL", "Every week · New videos", {
      fontSize: 96,
      color: "#f8fafc",
      bold: true,
      align: "center",
      fontFamily: "Georgia",
      letterSpacing: 6,
    }),
  },
  {
    id: "cinematic",
    name: "Cinematic",
    category: "Film",
    mode: "video",
    aspect: "21:9",
    description: "Letterbox feel with slow fades and warm highlights.",
    gradient: "linear-gradient(135deg,#0b0b0b,#b45309)",
    filterId: "film",
    background: "#000000",
    buildVideo: (duration) =>
      buildTextTemplate(duration, "A FILM BY YOU", "Chapter One", {
        fontSize: 58,
        color: "#f4ead8",
        bold: false,
        align: "center",
        fontFamily: "Georgia",
        letterSpacing: 12,
      }),
  },
  {
    id: "travel",
    name: "Travel",
    category: "Lifestyle",
    mode: "video",
    aspect: "16:9",
    description: "Warm, airy look with location title cards.",
    gradient: "linear-gradient(135deg,#0e7490,#f59e0b)",
    filterId: "landscape",
    buildVideo: (duration) => buildTextTemplate(duration, "WANDERLUST", "Location · Date", {
      fontSize: 72,
      color: "#ffffff",
      bold: true,
      align: "center",
      fontFamily: "Georgia",
      letterSpacing: 4,
    }),
  },
  {
    id: "wedding",
    name: "Wedding",
    category: "Lifestyle",
    mode: "video",
    aspect: "16:9",
    description: "Soft romantic tones and elegant serif type.",
    gradient: "linear-gradient(135deg,#831843,#f9a8d4)",
    filterId: "portrait",
    background: "#1a0a12",
    buildVideo: (duration) => buildTextTemplate(duration, "The Wedding", "Names · Date", {
      fontSize: 64,
      color: "#fff7ed",
      bold: false,
      align: "center",
      fontFamily: "Georgia",
      letterSpacing: 6,
    }),
  },
  {
    id: "birthday",
    name: "Birthday",
    category: "Lifestyle",
    mode: "video",
    aspect: "1:1",
    description: "Playful colors with animated headline.",
    gradient: "linear-gradient(135deg,#be185d,#facc15)",
    filterId: "warm",
    buildVideo: (duration) => buildTextTemplate(duration, "HAPPY BIRTHDAY!", "Make a wish", {
      fontSize: 64,
      color: "#ffffff",
      bold: true,
      align: "center",
      fontFamily: "Inter",
      background: "rgba(190,24,93,0.8)",
    }),
  },
  {
    id: "product",
    name: "Product Promo",
    category: "Business",
    mode: "video",
    aspect: "1:1",
    description: "Product launch layout with clean tags.",
    gradient: "linear-gradient(135deg,#1e293b,#38bdf8)",
    filterId: "clean",
    buildVideo: (duration) => buildTextTemplate(duration, "NEW COLLECTION", "Shop now →", {
      fontSize: 58,
      color: "#ffffff",
      bold: true,
      align: "center",
      fontFamily: "Inter",
    }),
  },
  {
    id: "business",
    name: "Business Ad",
    category: "Business",
    mode: "video",
    aspect: "16:9",
    description: "Professional promo with tagline and CTA.",
    gradient: "linear-gradient(135deg,#0f172a,#2563eb)",
    filterId: "clean",
    background: "#070b14",
    buildVideo: (duration) => buildTextTemplate(duration, "GROW FASTER", "Book a demo today", {
      fontSize: 72,
      color: "#f8fafc",
      bold: true,
      align: "center",
      fontFamily: "Inter",
    }),
  },
  {
    id: "slideshow",
    name: "Photo Slideshow",
    category: "Photo",
    mode: "video",
    aspect: "16:9",
    description: "Add photos and let slow cross dissolves carry the story.",
    gradient: "linear-gradient(135deg,#44403c,#d6d3d1)",
    filterId: "film",
    buildVideo: () => {
      const doc = emptyDoc("16:9");
      const title = createTextClip("track_text", 0, "Our Memories", 5, {
        fontFamily: "Georgia",
        fontSize: 64,
        letterSpacing: 6,
        color: "#f8f1e4",
      });
      title.animation = "fade";
      doc.clips.push(title);
      return doc;
    },
  },
  {
    id: "portrait-glow",
    name: "Portrait Glow",
    category: "Photo",
    mode: "photo",
    aspect: "4:5",
    description: "Soft skin tones, lifted shadows and subtle grain.",
    gradient: "linear-gradient(135deg,#4c1d95,#f0abfc)",
    filterId: "portrait",
    adjustments: { brightness: 6, contrast: 4, shadows: 8, grain: 4 },
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    category: "Photo",
    mode: "photo",
    aspect: "16:9",
    description: "Warm cinematic grade inspired by sunset light.",
    gradient: "linear-gradient(135deg,#92400e,#fbbf24)",
    filterId: "cinematic",
    adjustments: { temperature: 18, exposure: 6, highlights: -8, contrast: 8 },
  },
  {
    id: "moody-film",
    name: "Moody Film",
    category: "Photo",
    mode: "photo",
    aspect: "1:1",
    description: "Desaturated shadows and rich contrast.",
    gradient: "linear-gradient(135deg,#111827,#4b5563)",
    filterId: "moody",
    adjustments: { grain: 12, vignette: 16 },
  },
  {
    id: "mono",
    name: "Mono Editorial",
    category: "Photo",
    mode: "photo",
    aspect: "4:5",
    description: "High-contrast black and white for editorial portraits.",
    gradient: "linear-gradient(135deg,#18181b,#d4d4d8)",
    filterId: "bw",
    adjustments: { contrast: 14, brightness: 3 },
  },
];

function emptyDoc(aspect: string): VideoDoc {
  return {
    tracks: createDefaultTracks(),
    clips: [],
    duration: 15,
    aspect,
    fps: 30,
    background: "#07080c",
  };
}

function buildTextTemplate(
  duration: number,
  title: string,
  subtitle: string,
  style: Partial<NonNullable<Parameters<typeof createTextClip>[4]>>
): VideoDoc {
  const doc = emptyDoc("16:9");
  const titleClip = createTextClip("track_text", 0, title, Math.min(4.5, duration), {
    ...style,
    preset: "template",
  });
  titleClip.animation = "fade";
  const subtitleClip = createTextClip("track_text", Math.min(4.5, duration), subtitle, Math.max(2, duration - 4.5), {
    fontSize: 34,
    fontFamily: "Inter",
    color: "#e2e8f0",
    bold: false,
    background: "transparent",
    shadow: true,
  });
  subtitleClip.animation = "slide";
  doc.clips.push(titleClip, subtitleClip);
  doc.duration = Math.max(duration, 12);
  return doc;
}

export function buildTemplateVideo(template: StudioTemplate): VideoDoc {
  if (!template.buildVideo) return emptyDoc(template.aspect);
  const doc = template.buildVideo(14);
  doc.aspect = template.aspect;
  doc.template = template.id;
  doc.background = template.background ?? "#07080c";
  return doc;
}

export function buildEmptyVideo(aspect = "16:9"): VideoDoc {
  const doc = emptyDoc(aspect);
  doc.clips.push(baseClip({ kind: "text", trackId: "track_text", text: "", name: "empty" }));
  doc.clips = [];
  return doc;
}
