import { compactLook } from "./style-builder";
import type { FilmCategory, FilmCharacteristics, FilmStyle, HslBias } from "./types";

interface Row {
  id: string;
  name: string;
  category: FilmCategory;
  desc: string;
  sw: [string, string, string];
  e?: number;
  t?: number;
  tn?: number;
  c?: number;
  h?: number;
  s?: number;
  w?: number;
  b?: number;
  v?: number;
  sa?: number;
  cl?: number;
  tx?: number;
  dh?: number;
  g?: number;
  vg?: number;
  sh?: number;
  hsl?: HslBias;
  labels?: Partial<FilmCharacteristics>;
}

const rows: Row[] = [
  { id: "teal-orange-pop", name: "Teal & Orange", category: "Popular", desc: "Blockbuster contrast with teal shadows and warm skin.", sw: ["#0d3b45", "#d98b4a", "#f4d9b8"], t: 8, c: 16, h: -18, s: 12, b: -10, v: 12, sa: 4, cl: 6, vg: -8, hsl: { blue: { saturation: 14 }, orange: { saturation: 8, luminance: 4 } } },
  { id: "golden-hour-pop", name: "Golden Hour", category: "Popular", desc: "Sun-soaked warmth with soft, glowing highlights.", sw: ["#f6c987", "#d98e4a", "#7a4b2a"], e: 0.1, t: 18, c: 8, h: -10, s: 10, v: 10, sa: 6, g: 6, vg: -6, hsl: { orange: { saturation: 10, luminance: 6 }, yellow: { saturation: 8 } } },
  { id: "peach-fade", name: "Peach Fade", category: "Popular", desc: "Soft peach skin tones with a gentle film fade.", sw: ["#f7d9c4", "#e6a98f", "#a97563"], t: 12, c: 4, h: -6, s: 8, b: 6, v: 6, sa: -4, g: 8, hsl: { orange: { saturation: 6, luminance: 8 } } },
  { id: "warm-beige", name: "Warm Beige", category: "Popular", desc: "Creamy neutrals and beige tones for a calm feed.", sw: ["#e8d5bd", "#c9a986", "#7d6653"], t: 14, c: 2, h: -8, s: 6, b: 10, v: 2, sa: -8, cl: -4, g: 8 },
  { id: "clean-airy", name: "Clean Airy", category: "Popular", desc: "Bright, clean whites with airy low contrast.", sw: ["#f2f6f4", "#cfe0dc", "#8ba7a3"], e: 0.2, t: 2, c: -4, h: -10, s: 12, w: 6, v: 4, sa: -6, cl: -2 },
  { id: "soft-pastel", name: "Soft Pastel", category: "Popular", desc: "Pastel wash with lifted shadows and muted color.", sw: ["#f4d9e3", "#cbb6d9", "#8a9bc4"], t: 4, c: -8, h: -12, s: 14, w: 4, b: 8, v: 6, sa: -10, cl: -6, g: 6 },
  { id: "chocolate-film", name: "Chocolate", category: "Popular", desc: "Deep cocoa tones with rich, earthy shadows.", sw: ["#4a2f24", "#8a5a3c", "#d2a679"], t: 12, c: 10, h: -10, s: 6, b: -6, v: 4, sa: -6, cl: 4, g: 12, vg: -10, hsl: { orange: { saturation: -4, luminance: -4 } } },
  { id: "creamy-neutral", name: "Creamy Neutral", category: "Popular", desc: "Warm neutrals with smooth, low-contrast skin.", sw: ["#f1e6d6", "#d9c3a9", "#9a8570"], t: 8, c: 2, h: -8, s: 8, b: 8, v: 2, sa: -10, cl: -4, g: 6 },
  { id: "urban-shadow", name: "Urban Shadow", category: "Popular", desc: "City grit with cool shadows and muted color.", sw: ["#2f3437", "#5d6b70", "#a8b3b3"], t: -6, c: 14, h: -12, s: -6, b: -12, v: 4, sa: -10, cl: 8, vg: -12, hsl: { blue: { saturation: 4, luminance: -6 } } },
  { id: "desert-sun", name: "Desert Sun", category: "Popular", desc: "Sandy warmth with strong sunlit contrast.", sw: ["#e3a25f", "#b96f3d", "#5b3a26"], t: 20, c: 12, h: -14, s: 8, b: -8, v: 8, sa: 6, cl: 6, g: 10, vg: -10 },
  { id: "tropical-punch", name: "Tropical Punch", category: "Popular", desc: "Vivid greens and aqua with punchy color.", sw: ["#1f7a5c", "#3fb7a0", "#f2c14e"], t: 4, c: 14, h: -10, s: 8, v: 18, sa: 14, cl: 6, hsl: { green: { saturation: 16 }, aqua: { saturation: 14 } } },
  { id: "ocean-breeze", name: "Ocean Breeze", category: "Popular", desc: "Cool ocean blues with fresh, clean highlights.", sw: ["#2a6f8e", "#6fb3c9", "#d9eef2"], t: -10, c: 8, h: -8, s: 10, b: 4, v: 8, sa: 2, hsl: { blue: { saturation: 12, luminance: 4 }, aqua: { saturation: 10 } } },
  { id: "sunset-glow", name: "Sunset Glow", category: "Popular", desc: "Red-orange sunset haze with glowing skies.", sw: ["#e86a4a", "#f2a65a", "#7a3b4a"], t: 16, tn: 6, c: 10, h: -12, s: 8, v: 10, sa: 8, g: 6, vg: -8, hsl: { orange: { saturation: 12, luminance: 4 }, red: { saturation: 8 } } },
  { id: "street-chrome", name: "Street Chrome", category: "Popular", desc: "Desaturated documentary color with crisp edges.", sw: ["#a9b4b8", "#6c7a80", "#30383c"], t: -4, c: 16, h: -14, s: -8, b: -10, v: 2, sa: -16, cl: 10, vg: -12, hsl: { blue: { saturation: 6 } } },
  { id: "nordic-cool", name: "Nordic", category: "Popular", desc: "Scandinavian cool tones with soft light.", sw: ["#cfd9d9", "#8fa3a6", "#4a5a60"], t: -14, c: 4, h: -6, s: 10, b: 8, v: 2, sa: -12, cl: 2, g: 4 },
  { id: "minimal-white", name: "Minimal White", category: "Popular", desc: "High-key whites with minimal color.", sw: ["#fbfaf7", "#e6e2da", "#a8a49b"], e: 0.25, c: -6, h: -10, s: 12, w: 8, sa: -12, cl: -2 },
  { id: "latte-warm", name: "Latte", category: "Popular", desc: "Milky coffee tones with a soft matte finish.", sw: ["#d8b894", "#b08a64", "#6e523d"], t: 14, c: 4, h: -8, s: 6, b: 8, v: 2, sa: -8, g: 6 },
  { id: "cappuccino", name: "Cappuccino", category: "Popular", desc: "Rich brown warmth with gentle grain.", sw: ["#c9a887", "#9a7554", "#5c402f"], t: 12, c: 8, h: -10, s: 4, b: -4, v: 4, sa: -6, g: 10, vg: -8 },
  { id: "sakura-soft", name: "Sakura", category: "Popular", desc: "Pink blossoms and soft spring light.", sw: ["#f6d7de", "#e6b3c3", "#b98aa0"], t: 6, c: -6, h: -14, s: 12, b: 8, v: 4, sa: -6, g: 4, hsl: { magenta: { saturation: 6, luminance: 8 } } },
  { id: "kyoto-quiet", name: "Kyoto Quiet", category: "Popular", desc: "Muted greens and quiet, filmic contrast.", sw: ["#7d8c7a", "#b5a58a", "#4c5a4c"], t: 2, c: 6, h: -10, s: 6, b: 8, v: 2, sa: -12, cl: 2, g: 8, hsl: { green: { saturation: -6 } } },
  { id: "bali-gold", name: "Bali Gold", category: "Popular", desc: "Tropical gold with lush green balance.", sw: ["#e0a55c", "#3f8a72", "#f2d7a6"], t: 12, c: 12, h: -10, s: 8, v: 12, sa: 6, cl: 4, g: 6, hsl: { green: { saturation: 8, luminance: 4 }, orange: { saturation: 8 } } },
  { id: "santorini-blue", name: "Santorini", category: "Popular", desc: "Bright Aegean blues with clean white walls.", sw: ["#2f6fb0", "#bfe0f2", "#f5f1e8"], e: 0.1, t: -6, c: 10, h: -10, s: 8, v: 10, sa: 4, cl: 4, hsl: { blue: { saturation: 14, luminance: 6 } } },
  { id: "neon-night", name: "Neon Night", category: "Popular", desc: "Magenta and cyan nightlife with deep blacks.", sw: ["#1b1035", "#b33bd6", "#22d3ee"], t: -8, tn: 10, c: 18, h: -10, s: -12, b: -16, v: 20, sa: 10, cl: 8, vg: -16, g: 8, hsl: { magenta: { saturation: 16 }, blue: { saturation: 14 } } },
  { id: "feed-classic", name: "Feed Classic", category: "Popular", desc: "Balanced social-feed color with soft film grain.", sw: ["#d9c7b2", "#9aa8a1", "#5c6b68"], t: 2, c: 6, h: -8, s: 6, v: 4, sa: -6, g: 8 },
  { id: "faded-pop", name: "Faded Pop", category: "Popular", desc: "Washed-out pop color with open shadows.", sw: ["#e8b4a0", "#9fc4b8", "#6d7f8c"], c: -4, h: -8, s: 10, b: 10, v: 6, sa: -4, g: 10, hsl: { red: { saturation: 6, luminance: 4 } } },
  { id: "retro-pop", name: "Retro Pop", category: "Popular", desc: "Bold retro color with warm, punchy grain.", sw: ["#e05d3f", "#f2b84b", "#3c7a89"], t: 10, c: 12, h: -12, s: 6, v: 10, sa: 8, g: 12, vg: -8 },
  { id: "film-fade", name: "Film Fade", category: "Popular", desc: "Classic matte fade with relaxed contrast.", sw: ["#cfc6b8", "#9e9487", "#5f5a52"], c: -6, h: -10, s: 10, b: 14, w: -4, sa: -10, cl: -2, g: 14 },
  { id: "muted-earth", name: "Muted Earth", category: "Popular", desc: "Earthy desaturation with natural texture.", sw: ["#8a7a63", "#b5a48a", "#5f5a4c"], t: 6, c: 2, h: -8, s: 6, b: 8, sa: -16, cl: -2, g: 10, hsl: { green: { saturation: -10 }, yellow: { saturation: -8 } } },
  { id: "high-key-clean", name: "High Key", category: "Popular", desc: "Airy high-key exposure with delicate color.", sw: ["#f7f6f2", "#d8dedb", "#a3aeaa"], e: 0.3, c: -8, h: -14, s: 14, w: 10, sa: -10 },
  { id: "low-key-warm", name: "Low Key Warm", category: "Popular", desc: "Dark, warm and dramatic with glowing midtones.", sw: ["#2a1e18", "#7a4a2e", "#d19a63"], e: -0.2, t: 12, c: 16, h: -10, s: -10, b: -18, v: 4, sa: -6, vg: -14, g: 8 },

  { id: "portrait-natural", name: "Natural Skin", category: "Portrait", desc: "Clean, believable skin with gentle warmth.", sw: ["#f2d3bd", "#d3a184", "#8c6552"], t: 6, c: 4, h: -10, s: 10, b: 6, v: 6, sa: -4, cl: -2, hsl: { orange: { saturation: 4, luminance: 8 } } },
  { id: "portrait-peach", name: "Peach Skin", category: "Portrait", desc: "Peachy complexion with soft highlights.", sw: ["#f7d4c2", "#e0a48c", "#a87560"], t: 10, c: 2, h: -12, s: 12, b: 8, v: 4, sa: -6, hsl: { orange: { saturation: 6, luminance: 10 } } },
  { id: "portrait-editorial", name: "Editorial Warm", category: "Portrait", desc: "Magazine warmth with sculpted contrast.", sw: ["#d8b49a", "#9c7258", "#4f3a30"], t: 10, c: 14, h: -14, s: 8, b: -6, v: 4, sa: -8, cl: 6, vg: -8 },
  { id: "portrait-studio", name: "Studio Neutral", category: "Portrait", desc: "Neutral studio color with clean detail.", sw: ["#e8ded2", "#c4b6a6", "#7d7266"], t: 2, c: 8, h: -8, s: 6, v: 2, sa: -6, cl: 4 },
  { id: "portrait-golden", name: "Golden Portrait", category: "Portrait", desc: "Golden light with glowing skin tones.", sw: ["#f2c58f", "#d99a5c", "#7a4f2e"], t: 16, c: 8, h: -12, s: 8, v: 8, sa: 2, g: 4, hsl: { orange: { saturation: 8, luminance: 6 } } },
  { id: "portrait-glow", name: "Soft Glow", category: "Portrait", desc: "Luminous, low-contrast glow for flattering skin.", sw: ["#f7e2d8", "#e9c4b6", "#b58f83"], e: 0.1, t: 6, c: -6, h: -16, s: 14, w: 4, v: 4, sa: -8, cl: -8 },
  { id: "portrait-bridal", name: "Bridal Soft", category: "Portrait", desc: "Bright bridal whites with delicate warmth.", sw: ["#fbf3ea", "#e8d8c8", "#b9a696"], e: 0.15, c: -6, h: -14, s: 12, w: 6, sa: -12, cl: -4 },
  { id: "portrait-beauty", name: "Beauty Clean", category: "Portrait", desc: "Clean beauty color with smooth, neutral skin.", sw: ["#f4ddd0", "#dbb4a1", "#9a7767"], t: 4, h: -10, s: 10, v: 4, sa: -4, cl: 2 },
  { id: "portrait-olive", name: "Olive Glow", category: "Portrait", desc: "Warm olive skin tones with golden balance.", sw: ["#c9a26f", "#9a7448", "#5c4a32"], t: 10, c: 8, h: -10, s: 6, v: 6, sa: -2, hsl: { yellow: { saturation: 6, luminance: 4 }, green: { saturation: -4 } } },
  { id: "portrait-bronze", name: "Bronze Skin", category: "Portrait", desc: "Rich bronze depth with sculpted light.", sw: ["#b0784f", "#8a5535", "#4f3020"], t: 14, c: 12, h: -12, s: 4, b: -6, v: 6, cl: 4, hsl: { orange: { saturation: 8, luminance: -2 } } },
  { id: "portrait-fair", name: "Fair Skin Soft", category: "Portrait", desc: "Gentle tone curve that protects fair skin.", sw: ["#f8e6db", "#e6c4b2", "#b39485"], t: 2, c: -2, h: -12, s: 12, w: 4, v: 2, sa: -10, cl: -4 },
  { id: "portrait-contrast", name: "Contrast Portrait", category: "Portrait", desc: "Bold, dramatic portrait contrast.", sw: ["#d9b49a", "#8f6a52", "#3f2d24"], t: 6, c: 18, h: -16, s: 6, b: -10, v: 2, sa: -10, cl: 8, vg: -10 },
  { id: "portrait-window", name: "Window Light", category: "Portrait", desc: "Soft window light with lifted shadows.", sw: ["#efe2d4", "#c9b6a3", "#857466"], e: 0.12, t: 4, c: 4, h: -12, s: 12, b: 6, v: 2, sa: -8, cl: -2 },
  { id: "portrait-film", name: "Film Portrait", category: "Portrait", desc: "Analogue portrait look with warm grain.", sw: ["#e6cdb2", "#c49a72", "#6e4f38"], t: 12, c: 8, h: -10, s: 8, b: 2, v: 4, sa: -6, g: 12, vg: -6 },

  { id: "moody-forest", name: "Moody Forest", category: "Moody", desc: "Dark forest greens with deep, damp shadows.", sw: ["#1f3b2c", "#4a6b52", "#9aa88a"], t: -6, c: 16, h: -14, s: -8, b: -14, v: 8, sa: -10, cl: 6, vg: -14, hsl: { green: { saturation: 8, luminance: -8 } } },
  { id: "moody-dark", name: "Dark & Dramatic", category: "Moody", desc: "Heavy blacks and dramatic tonal separation.", sw: ["#17181a", "#3c4046", "#8a8f96"], t: -4, c: 22, h: -18, s: -12, b: -20, w: -6, sa: -14, cl: 10, vg: -18 },
  { id: "moody-midnight", name: "Midnight Blue", category: "Moody", desc: "Cold midnight blues with cinematic depth.", sw: ["#101a2e", "#2c4a6e", "#7c9bc0"], t: -18, tn: 6, c: 18, h: -12, s: -10, b: -18, v: 6, sa: -8, cl: 6, vg: -16, hsl: { blue: { saturation: 12, luminance: -4 } } },
  { id: "moody-brown", name: "Moody Brown", category: "Moody", desc: "Brown-toned shadows with muted warmth.", sw: ["#2a1f18", "#6a4a32", "#b48a62"], t: 8, c: 14, h: -14, s: -8, b: -14, v: 4, sa: -14, g: 8, vg: -12 },
  { id: "moody-concrete", name: "Concrete", category: "Moody", desc: "Urban concrete grays with restrained color.", sw: ["#4a4c4a", "#7d7f7a", "#b5b5ad"], t: -2, c: 12, h: -10, s: 4, b: 6, sa: -20, cl: 4, g: 6 },
  { id: "moody-noir", name: "Cinema Noir", category: "Moody", desc: "Near-monochrome noir with hard contrast.", sw: ["#0f1114", "#2e3338", "#6f7a80"], t: -8, c: 24, h: -20, s: -14, b: -22, sa: -20, cl: 10, vg: -20, g: 10 },
  { id: "moody-storm", name: "Stormy Sky", category: "Moody", desc: "Overcast, cool and quietly dramatic.", sw: ["#3c4954", "#6b7c88", "#aab6bd"], t: -12, c: 14, h: -10, s: -6, b: -10, v: 4, sa: -12, cl: 6, vg: -12 },
  { id: "moody-amber", name: "Low Key Amber", category: "Moody", desc: "Amber lamps against deep low-key shadow.", sw: ["#2a1a10", "#7a4a20", "#d99a4a"], e: -0.15, t: 14, c: 18, h: -12, s: -8, b: -18, v: 6, sa: -6, vg: -16, g: 8 },
  { id: "moody-muddy-green", name: "Muddy Green", category: "Moody", desc: "Desaturated greens with an overcast mood.", sw: ["#2e3a2a", "#5c6b4a", "#9aa07a"], t: -2, c: 12, h: -12, s: -6, b: -12, v: 2, sa: -16, cl: 2, g: 8, hsl: { green: { saturation: -8, luminance: -6 } } },
  { id: "moody-faded-shadow", name: "Faded Shadows", category: "Moody", desc: "Matte black lift with muted contrast.", sw: ["#3a3833", "#6f6a60", "#a8a093"], c: -2, h: -10, s: 8, b: 16, sa: -14, g: 14, vg: -10 },
  { id: "moody-cold", name: "Cold Moody", category: "Moody", desc: "Cold blue-gray light with soft blacks.", sw: ["#2a3a44", "#5c7480", "#a8bcc4"], t: -16, c: 14, h: -10, s: -4, b: -12, sa: -12, cl: 4, vg: -12 },
  { id: "moody-deep-teal", name: "Deep Teal", category: "Moody", desc: "Deep teal shadows with a cinematic edge.", sw: ["#0e3a3f", "#2f6b6e", "#8fb8b5"], t: -6, c: 16, h: -14, s: -8, b: -16, v: 8, sa: -8, cl: 6, hsl: { aqua: { saturation: 14 }, blue: { saturation: 10 } } },
  { id: "moody-bronze", name: "Bronze Mood", category: "Moody", desc: "Bronze highlights with dark, warm depth.", sw: ["#2e2018", "#7a5232", "#c99a6a"], t: 12, c: 14, h: -14, s: -6, b: -12, v: 4, sa: -10, g: 8, vg: -12 },
  { id: "moody-charcoal", name: "Charcoal", category: "Moody", desc: "Charcoal tones with clean modern contrast.", sw: ["#222426", "#4a4e52", "#8a9096"], t: -4, c: 18, h: -12, s: -6, b: -16, sa: -18, cl: 6, vg: -14 },

  { id: "bw-classic", name: "Classic B&W", category: "Black & White", desc: "Balanced black and white with gentle contrast.", sw: ["#efefef", "#9a9a9a", "#2a2a2a"], sa: -100, c: 12, h: -14, s: 8, b: -8, cl: 6, g: 8 },
  { id: "bw-high-contrast", name: "High Contrast B&W", category: "Black & White", desc: "Punchy monochrome with bright whites and deep blacks.", sw: ["#ffffff", "#8a8a8a", "#0a0a0a"], sa: -100, c: 26, h: -20, s: -6, b: -18, w: 6, cl: 12, g: 10, vg: -12 },
  { id: "bw-silver", name: "Silver Gelatin", category: "Black & White", desc: "Silver-rich tonal range inspired by darkroom prints.", sw: ["#f2f2f2", "#a8a8a8", "#333333"], sa: -100, c: 16, h: -12, s: 6, b: -6, cl: 8, g: 14, vg: -8 },
  { id: "bw-hp5", name: "Ilford HP5", category: "Black & White", desc: "Grainy, contrasty black and white film character.", sw: ["#ececec", "#8f8f8f", "#242424"], sa: -100, c: 18, h: -10, s: 4, b: -10, cl: 6, g: 18, vg: -10 },
  { id: "bw-delta", name: "Ilford Delta 100", category: "Black & White", desc: "Fine-grain monochrome with smooth midtones.", sw: ["#f4f4f4", "#a5a5a5", "#303030"], sa: -100, c: 14, h: -14, s: 8, b: -4, cl: 10, g: 8 },
  { id: "bw-trix", name: "Kodak Tri-X", category: "Black & White", desc: "Classic photojournalism monochrome with bite.", sw: ["#ededed", "#858585", "#1a1a1a"], sa: -100, c: 22, h: -16, s: 2, b: -14, w: 4, cl: 10, g: 16, vg: -12 },
  { id: "bw-faded", name: "Faded Mono", category: "Black & White", desc: "Soft, lifted monochrome with a matte finish.", sw: ["#e5e5e5", "#a3a3a3", "#4a4a4a"], sa: -100, c: -4, h: -8, s: 10, b: 16, cl: -4, g: 16 },
  { id: "bw-warm", name: "Warm Mono", category: "Black & White", desc: "Warm-toned monochrome with gentle blacks.", sw: ["#f0e8dc", "#a89a88", "#403830"], sa: -100, t: 8, c: 10, h: -12, s: 6, b: 6, cl: 4, g: 12 },
  { id: "bw-cool", name: "Cool Mono", category: "Black & White", desc: "Cool-toned monochrome with crisp contrast.", sw: ["#e8eef0", "#94a0a4", "#2c3438"], sa: -100, t: -10, c: 12, h: -10, s: 4, b: -6, cl: 6, g: 10 },
  { id: "bw-matte", name: "Matte Mono", category: "Black & White", desc: "Matte black and white with muted highlights.", sw: ["#dedede", "#9a9a9a", "#5a5a5a"], sa: -100, c: 0, h: -6, s: 12, b: 20, w: -6, cl: -6, g: 14 },

  { id: "vintage-70s", name: "70s Fade", category: "Vintage", desc: "Warm, faded 1970s color with lifted blacks.", sw: ["#e0c9a6", "#b58a5e", "#6e5238"], t: 12, c: -4, h: -10, s: 10, b: 14, v: 2, sa: -10, g: 16, vg: -10 },
  { id: "vintage-80s", name: "80s Neon", category: "Vintage", desc: "Magenta and cyan nostalgia with punch.", sw: ["#7a2a8a", "#e04a8a", "#2ab5c9"], t: -4, tn: 12, c: 14, h: -12, s: -4, v: 16, sa: 8, g: 12, vg: -10, hsl: { magenta: { saturation: 14 }, aqua: { saturation: 12 } } },
  { id: "vintage-90s", name: "90s Disposable", category: "Vintage", desc: "Point-and-shoot color with heavy grain.", sw: ["#d9c7a8", "#c98a5a", "#5c6e5a"], t: 10, c: 6, h: -10, s: 6, b: 8, v: 4, sa: -6, g: 20, vg: -12 },
  { id: "vintage-kodachrome", name: "Retro Kodachrome", category: "Vintage", desc: "Rich reds and yellows with classic slide depth.", sw: ["#b53a2e", "#d99a3c", "#3c5a6e"], t: 8, c: 14, h: -12, s: 4, b: -6, v: 8, sa: 6, g: 10, hsl: { red: { saturation: 10 }, yellow: { saturation: 8 } } },
  { id: "vintage-polaroid", name: "Polaroid 600", category: "Vintage", desc: "Instant-film softness with milky highlights.", sw: ["#e6dccb", "#b8a98f", "#7d8a7a"], t: 6, c: -8, h: -8, s: 12, b: 14, w: -4, sa: -14, g: 18, vg: -14 },
  { id: "vintage-lomo", name: "Lomo", category: "Vintage", desc: "Heavy vignette with saturated toy-camera color.", sw: ["#2a6a5a", "#d9b03c", "#8a2a4a"], t: 4, tn: 8, c: 18, h: -10, s: -8, b: -14, v: 10, sa: 8, vg: -22, g: 12, hsl: { green: { saturation: 10 }, red: { saturation: 10 } } },
  { id: "vintage-cross", name: "Cross Process", category: "Vintage", desc: "Cross-processed color shift with cyan shadows.", sw: ["#3a8a8a", "#e0c04a", "#7a2a6a"], t: -2, tn: 10, c: 16, h: -12, s: -6, v: 12, sa: 10, g: 10, vg: -10 },
  { id: "vintage-sepia", name: "Sepia Memory", category: "Vintage", desc: "Warm sepia with soft, nostalgic contrast.", sw: ["#c9a87c", "#9a7448", "#5c442e"], t: 18, sa: -60, c: 8, h: -10, s: 4, b: 8, g: 14, vg: -12 },
  { id: "vintage-old-print", name: "Old Print", category: "Vintage", desc: "Faded print color with low saturation.", sw: ["#d9cfb8", "#a89a7d", "#6e6552"], t: 8, c: -2, h: -8, s: 8, b: 12, sa: -20, g: 16, vg: -8 },
  { id: "vintage-dusty", name: "Dusty Film", category: "Vintage", desc: "Dusty, muted film with a vintage cast.", sw: ["#c4b5a0", "#94856f", "#5c5347"], t: 4, c: 4, h: -10, s: 6, b: 8, sa: -12, g: 18, vg: -10 },

  { id: "nature-forest", name: "Forest Green", category: "Nature", desc: "Deep forest greens with crisp detail.", sw: ["#1f4a2e", "#4a7a4a", "#a8c48a"], t: -2, c: 12, h: -10, s: 8, v: 10, sa: 4, cl: 6, hsl: { green: { saturation: 14, luminance: -2 } } },
  { id: "nature-autumn", name: "Autumn Warmth", category: "Nature", desc: "Burnt orange and gold autumn color.", sw: ["#c96a2e", "#d9a03c", "#5c4a2e"], t: 16, c: 10, h: -12, s: 6, v: 8, sa: 6, hsl: { orange: { saturation: 10 }, yellow: { saturation: 8 } } },
  { id: "nature-ocean", name: "Ocean Blue", category: "Nature", desc: "Clean coastal blues with bright water.", sw: ["#1f5a7a", "#4a9ab5", "#b5dde6"], t: -8, c: 12, h: -10, s: 6, v: 8, sa: 2, hsl: { blue: { saturation: 12, luminance: 2 }, aqua: { saturation: 10 } } },
  { id: "nature-desert", name: "Desert Sand", category: "Nature", desc: "Sun-baked sand with soft warm contrast.", sw: ["#d9a86a", "#b57a4a", "#6e4a2e"], t: 18, c: 6, h: -10, s: 8, v: 4, sa: -4, g: 8, vg: -8 },
  { id: "nature-mountain", name: "Mountain Cool", category: "Nature", desc: "Crisp alpine air with cool rock tones.", sw: ["#3a5a6e", "#7a9aa8", "#c4d4d9"], t: -12, c: 14, h: -12, s: 6, v: 4, sa: -6, cl: 8, hsl: { blue: { saturation: 8 } } },
  { id: "nature-alpine", name: "Alpine Fresh", category: "Nature", desc: "Fresh green and clean blue mountain light.", sw: ["#2e6e5a", "#8ab5a0", "#e0eee8"], e: 0.1, t: -6, c: 10, h: -10, s: 8, v: 8, cl: 6, hsl: { green: { saturation: 8 }, aqua: { saturation: 8 } } },
  { id: "nature-jungle", name: "Jungle Vivid", category: "Nature", desc: "Lush, humid greens with vivid depth.", sw: ["#1a5a2e", "#3c8a4a", "#a8c44a"], t: 2, c: 16, h: -12, s: 6, v: 16, sa: 10, cl: 8, hsl: { green: { saturation: 18 }, aqua: { saturation: 8 } } },
  { id: "nature-golden-field", name: "Golden Field", category: "Nature", desc: "Golden crops with warm late-day light.", sw: ["#d9b04a", "#b58a3c", "#6e5a2e"], t: 14, c: 8, h: -10, s: 8, v: 6, sa: 2, hsl: { yellow: { saturation: 10, luminance: 4 } } },
];

export const EXTRA_STYLES: FilmStyle[] = rows.map((row) =>
  compactLook({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.desc,
    swatch: row.sw,
    exposure: row.e,
    temperature: row.t,
    tint: row.tn,
    contrast: row.c,
    highlights: row.h,
    shadows: row.s,
    whites: row.w,
    blacks: row.b,
    vibrance: row.v,
    saturation: row.sa,
    clarity: row.cl,
    texture: row.tx,
    dehaze: row.dh,
    grain: row.g,
    vignette: row.vg,
    sharpening: row.sh,
    hslBias: row.hsl,
    labels: row.labels,
  })
);
