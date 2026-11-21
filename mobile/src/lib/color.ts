import type { Adjustments } from "../types";
import { resolveAdjustments } from "./presets";

export function buildColorMatrix(adjustments: Adjustments, filterId: string | null, intensity = 100): number[] {
  const a = resolveAdjustments(adjustments, filterId, intensity);
  const sat = Math.max(0, 1 + a.saturation / 100);
  const contrast = Math.max(0, 1 + a.contrast / 100);
  const brightness = (a.brightness / 100) * 0.55 + (a.exposure / 100) * 0.4;
  const fade = (a.fade / 100) * 0.18;

  const lumR = 0.2126;
  const lumG = 0.7152;
  const lumB = 0.0722;
  const satMatrix = [
    lumR + sat * (1 - lumR),
    lumG - sat * lumG,
    lumB - sat * lumB,
    0,
    0,
    lumR - sat * lumR,
    lumG + sat * (1 - lumG),
    lumB - sat * lumB,
    0,
    0,
    lumR - sat * lumR,
    lumG - sat * lumG,
    lumB + sat * (1 - lumB),
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ];

  const temp = a.temperature / 100;
  const tint = a.tint / 100;
  const offsets = [temp * 0.16 + tint * 0.05, -tint * 0.08, -temp * 0.16 + tint * 0.05];
  const offsetBase = 0.5 * (1 - contrast) + brightness + fade;

  const matrix = satMatrix.slice();
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      matrix[row * 5 + col] *= contrast;
    }
    matrix[row * 5 + 4] = offsetBase + offsets[row];
  }
  return matrix;
}
