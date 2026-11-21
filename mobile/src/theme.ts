export const colors = {
  bg: "#07080c",
  panel: "#0f1118",
  panelAlt: "#12141d",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  text: "#f4f4f5",
  muted: "#8b8e9c",
  violet: "#8b5cf6",
  violetSoft: "rgba(139,92,246,0.16)",
  violetBorder: "rgba(167,139,250,0.35)",
  cyan: "#22d3ee",
  emerald: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
};

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
