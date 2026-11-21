import type { Adjustments } from "./types";

export interface CustomPhotoPreset {
  id: string;
  name: string;
  adjustments: Adjustments;
  filterId: string | null;
  filterIntensity: number;
  createdAt: number;
}

const KEY = "capdit-photo-presets";

export function listCustomPresets(): CustomPhotoPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: Omit<CustomPhotoPreset, "id" | "createdAt">): CustomPhotoPreset {
  const entry: CustomPhotoPreset = {
    ...preset,
    id: `custom_${Date.now().toString(36)}`,
    createdAt: Date.now(),
  };
  const next = [entry, ...listCustomPresets()].slice(0, 30);
  localStorage.setItem(KEY, JSON.stringify(next));
  return entry;
}

export function deleteCustomPreset(id: string) {
  const next = listCustomPresets().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
}
