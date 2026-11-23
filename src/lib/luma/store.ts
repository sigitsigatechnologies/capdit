"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HistoryItem, SavedPreset } from "./types";

interface LumaSettings {
  provider: "gemini" | "openai";
  model: string;
  adaptiveDefault: boolean;
}

interface LumaState {
  presets: SavedPreset[];
  history: HistoryItem[];
  settings: LumaSettings;
  savePreset: (preset: SavedPreset) => void;
  removePreset: (id: string) => void;
  addHistory: (item: HistoryItem) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  clearPresets: () => void;
  updateSettings: (settings: Partial<LumaSettings>) => void;
}

export const useLumaStore = create<LumaState>()(
  persist(
    (set) => ({
      presets: [],
      history: [],
      settings: { provider: "gemini", model: "gemini-flash-lite-latest", adaptiveDefault: true },
      savePreset: (preset) =>
        set((state) => ({
          presets: [preset, ...state.presets.filter((item) => item.id !== preset.id)].slice(0, 100),
        })),
      removePreset: (id) =>
        set((state) => ({ presets: state.presets.filter((item) => item.id !== id) })),
      addHistory: (item) =>
        set((state) => ({
          history: [item, ...state.history.filter((entry) => entry.id !== item.id)].slice(0, 100),
        })),
      removeHistory: (id) =>
        set((state) => ({ history: state.history.filter((item) => item.id !== id) })),
      clearHistory: () => set({ history: [] }),
      clearPresets: () => set({ presets: [] }),
      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),
    }),
    { name: "luma-presets-v1" }
  )
);
