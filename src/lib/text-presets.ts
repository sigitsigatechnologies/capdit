export interface TextStylePreset {
  id: string;
  name: string;
  preview: string;
  style: {
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
  animation: string;
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    id: "subtitle",
    name: "Subtitle",
    preview: "Aa",
    style: {
      fontFamily: "Inter",
      fontSize: 34,
      color: "#ffffff",
      background: "rgba(0,0,0,0.55)",
      bold: false,
      italic: false,
      align: "center",
      stroke: "transparent",
      shadow: false,
      letterSpacing: 0,
      lineHeight: 1.2,
    },
    animation: "fade",
  },
  {
    id: "cinematic",
    name: "Cinematic Title",
    preview: "CINEMA",
    style: {
      fontFamily: "Georgia",
      fontSize: 72,
      color: "#f5f0e6",
      background: "transparent",
      bold: false,
      italic: false,
      align: "center",
      stroke: "transparent",
      shadow: true,
      letterSpacing: 10,
      lineHeight: 1.1,
    },
    animation: "fade",
  },
  {
    id: "social",
    name: "Social Caption",
    preview: "Caption",
    style: {
      fontFamily: "Inter",
      fontSize: 44,
      color: "#ffffff",
      background: "rgba(124,58,237,0.9)",
      bold: true,
      italic: false,
      align: "center",
      stroke: "transparent",
      shadow: false,
      letterSpacing: 0,
      lineHeight: 1.2,
    },
    animation: "slide",
  },
  {
    id: "bold",
    name: "Bold Headline",
    preview: "BOLD",
    style: {
      fontFamily: "Impact",
      fontSize: 92,
      color: "#ffffff",
      background: "transparent",
      bold: true,
      italic: false,
      align: "center",
      stroke: "#111111",
      shadow: true,
      letterSpacing: 2,
      lineHeight: 1,
    },
    animation: "pop",
  },
  {
    id: "minimal",
    name: "Minimal Title",
    preview: "minimal",
    style: {
      fontFamily: "Inter",
      fontSize: 56,
      color: "#ffffff",
      background: "transparent",
      bold: false,
      italic: false,
      align: "left",
      stroke: "transparent",
      shadow: false,
      letterSpacing: 2,
      lineHeight: 1.2,
    },
    animation: "typewriter",
  },
  {
    id: "neon",
    name: "Neon",
    preview: "NEON",
    style: {
      fontFamily: "Verdana",
      fontSize: 78,
      color: "#67e8f9",
      background: "transparent",
      bold: true,
      italic: false,
      align: "center",
      stroke: "#22d3ee",
      shadow: true,
      letterSpacing: 4,
      lineHeight: 1.1,
    },
    animation: "zoom",
  },
  {
    id: "vintage",
    name: "Vintage",
    preview: "Vintage",
    style: {
      fontFamily: "Georgia",
      fontSize: 64,
      color: "#f3e6c8",
      background: "rgba(60,42,22,0.45)",
      bold: false,
      italic: true,
      align: "center",
      stroke: "#2a1b0c",
      shadow: true,
      letterSpacing: 3,
      lineHeight: 1.2,
    },
    animation: "fade",
  },
];
