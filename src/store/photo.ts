"use client";

import { create } from "zustand";
import type { Adjustments, PhotoDoc, PhotoBackground, SerializedObject } from "@/lib/types";
import { DEFAULT_ADJUSTMENTS } from "@/lib/types";
import { createDefaultPhotoDoc } from "./projects";

const MAX_HISTORY = 30;

interface PhotoStore {
  doc: PhotoDoc;
  history: PhotoDoc[];
  future: PhotoDoc[];
  dirty: boolean;
  init: (doc: PhotoDoc) => void;
  snapshot: () => void;
  setAdjustment: (key: keyof Adjustments, value: number) => void;
  setAdjustments: (patch: Partial<Adjustments>) => void;
  resetAdjustments: () => void;
  setFilter: (id: string | null) => void;
  setFilterIntensity: (value: number) => void;
  setBackground: (patch: Partial<PhotoBackground>) => void;
  setAspect: (aspect: string) => void;
  setCrop: (crop: PhotoDoc["crop"]) => void;
  setObjects: (objects: SerializedObject[]) => void;
  setCanvasSize: (width: number, height: number) => void;
  setDoc: (doc: PhotoDoc, record?: boolean) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  markSaved: () => void;
}

function pushHistory(state: PhotoStore, next: PhotoDoc): Partial<PhotoStore> {
  return {
    doc: next,
    history: [...state.history, state.doc].slice(-MAX_HISTORY),
    future: [],
    dirty: true,
  };
}

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  doc: createDefaultPhotoDoc(),
  history: [],
  future: [],
  dirty: false,
  init: (doc) =>
    set({
      doc: { ...createDefaultPhotoDoc(doc.aspect), ...doc },
      history: [],
      future: [],
      dirty: false,
    }),
  snapshot: () => {
    const state = get();
    set({ history: [...state.history, state.doc].slice(-MAX_HISTORY), future: [] });
  },
  setAdjustment: (key, value) => {
    const state = get();
    const next = { ...state.doc, adjustments: { ...state.doc.adjustments, [key]: value } };
    const now = Date.now();
    const last = (get() as unknown as { _lastAdjust?: number })._lastAdjust ?? 0;
    if (now - last > 700) {
      set({ ...pushHistory(state, next), ...({ _lastAdjust: now } as object) });
    } else {
      set({ doc: next, dirty: true, ...({ _lastAdjust: now } as object) });
    }
  },
  setAdjustments: (patch) => {
    const state = get();
    const next = {
      ...state.doc,
      adjustments: { ...state.doc.adjustments, ...patch },
    };
    set(pushHistory(state, next));
  },
  resetAdjustments: () => {
    const state = get();
    set(pushHistory(state, { ...state.doc, adjustments: { ...DEFAULT_ADJUSTMENTS } }));
  },
  setFilter: (id) => {
    const state = get();
    set(pushHistory(state, { ...state.doc, filterId: id, filterIntensity: 100 }));
  },
  setFilterIntensity: (value) => {
    const state = get();
    set({ doc: { ...state.doc, filterIntensity: value }, dirty: true });
  },
  setBackground: (patch) => {
    const state = get();
    set(pushHistory(state, { ...state.doc, background: { ...state.doc.background, ...patch } }));
  },
  setAspect: (aspect) => {
    const state = get();
    set(pushHistory(state, { ...state.doc, aspect }));
  },
  setCrop: (crop) => {
    const state = get();
    set(pushHistory(state, { ...state.doc, crop }));
  },
  setObjects: (objects) => {
    const state = get();
    set({ doc: { ...state.doc, objects }, dirty: true });
  },
  setCanvasSize: (canvasWidth, canvasHeight) => {
    const state = get();
    set({ doc: { ...state.doc, canvasWidth, canvasHeight } });
  },
  setDoc: (doc, record = true) => {
    const state = get();
    if (record) set(pushHistory(state, doc));
    else set({ doc, dirty: true });
  },
  undo: () => {
    const state = get();
    if (!state.history.length) return;
    const prev = state.history[state.history.length - 1];
    set({
      doc: prev,
      history: state.history.slice(0, -1),
      future: [state.doc, ...state.future].slice(0, MAX_HISTORY),
      dirty: true,
    });
  },
  redo: () => {
    const state = get();
    if (!state.future.length) return;
    const next = state.future[0];
    set({
      doc: next,
      history: [...state.history, state.doc].slice(-MAX_HISTORY),
      future: state.future.slice(1),
      dirty: true,
    });
  },
  reset: () => {
    const state = get();
    set(
      pushHistory(state, {
        ...createDefaultPhotoDoc(state.doc.aspect),
        assetId: state.doc.assetId,
        canvasWidth: state.doc.canvasWidth,
        canvasHeight: state.doc.canvasHeight,
      })
    );
  },
  markSaved: () => set({ dirty: false }),
}));
