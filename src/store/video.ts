"use client";

import { create } from "zustand";
import type { VideoClip, VideoDoc, VideoTrack } from "@/lib/types";
import { computeDuration, createDefaultVideoDoc, splitClip } from "@/lib/video";
import { uid } from "@/lib/utils";

const MAX_HISTORY = 40;

interface VideoStore {
  doc: VideoDoc;
  history: VideoDoc[];
  future: VideoDoc[];
  selectedClipId: string | null;
  selectedTrackId: string | null;
  playhead: number;
  playing: boolean;
  zoom: number;
  snap: boolean;
  dirty: boolean;
  init: (doc: VideoDoc) => void;
  snapshot: () => void;
  setDoc: (doc: VideoDoc, record?: boolean) => void;
  addClip: (clip: VideoClip) => void;
  updateClip: (id: string, patch: Partial<VideoClip>, record?: boolean) => void;
  removeClip: (id: string) => void;
  duplicateClip: (id: string) => void;
  splitSelected: () => void;
  selectClip: (id: string | null) => void;
  setPlayhead: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  setSnap: (snap: boolean) => void;
  updateTrack: (id: string, patch: Partial<VideoTrack>) => void;
  setAspect: (aspect: string) => void;
  setFps: (fps: number) => void;
  setBackground: (color: string) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  markSaved: () => void;
}

function withClips(state: VideoStore, next: VideoDoc, record = true): Partial<VideoStore> {
  const doc = {
    ...next,
    duration: next.duration,
    clips: [...next.clips],
  };
  doc.duration = computeDuration(doc.clips);
  if (!record) return { doc, dirty: true };
  return {
    doc,
    history: [...state.history, state.doc].slice(-MAX_HISTORY),
    future: [],
    dirty: true,
  };
}

export const useVideoStore = create<VideoStore>((set, get) => ({
  doc: createDefaultVideoDoc(),
  history: [],
  future: [],
  selectedClipId: null,
  selectedTrackId: null,
  playhead: 0,
  playing: false,
  zoom: 1,
  snap: true,
  dirty: false,
  init: (doc) =>
    set({
      doc: { ...createDefaultVideoDoc(doc.aspect), ...doc },
      history: [],
      future: [],
      selectedClipId: null,
      playhead: 0,
      playing: false,
      dirty: false,
    }),
  snapshot: () => {
    const state = get();
    set({ history: [...state.history, state.doc].slice(-MAX_HISTORY), future: [] });
  },
  setDoc: (doc, record = true) => {
    const state = get();
    if (record) {
      set({
        doc,
        history: [...state.history, state.doc].slice(-MAX_HISTORY),
        future: [],
        dirty: true,
      });
    } else {
      set({ doc, dirty: true });
    }
  },
  addClip: (clip) => {
    const state = get();
    set(withClips(state, { ...state.doc, clips: [...state.doc.clips, clip] }));
    set({ selectedClipId: clip.id, selectedTrackId: clip.trackId });
  },
  updateClip: (id, patch, record = false) => {
    const state = get();
    const clips = state.doc.clips.map((c) => (c.id === id ? { ...c, ...patch } : c));
    set(withClips(state, { ...state.doc, clips }, record));
  },
  removeClip: (id) => {
    const state = get();
    set(
      withClips(state, {
        ...state.doc,
        clips: state.doc.clips.filter((c) => c.id !== id),
      })
    );
    if (state.selectedClipId === id) set({ selectedClipId: null });
  },
  duplicateClip: (id) => {
    const state = get();
    const clip = state.doc.clips.find((c) => c.id === id);
    if (!clip) return;
    const copy: VideoClip = {
      ...clip,
      id: uid("clp"),
      start: clip.start + clip.duration,
      transitionIn: { type: "none", duration: 0.4 },
    };
    set(withClips(state, { ...state.doc, clips: [...state.doc.clips, copy] }));
    set({ selectedClipId: copy.id });
  },
  splitSelected: () => {
    const state = get();
    const clip = state.doc.clips.find((c) => c.id === state.selectedClipId);
    if (!clip) return;
    const parts = splitClip(clip, state.playhead);
    if (!parts) return;
    const clips = state.doc.clips.flatMap((c) => (c.id === clip.id ? parts : [c]));
    set(withClips(state, { ...state.doc, clips }));
    set({ selectedClipId: parts[1].id });
  },
  selectClip: (id) => {
    const clip = id ? get().doc.clips.find((c) => c.id === id) : null;
    set({ selectedClipId: id, selectedTrackId: clip?.trackId ?? get().selectedTrackId });
  },
  setPlayhead: (time) => {
    const duration = computeDuration(get().doc.clips);
    set({ playhead: Math.max(0, Math.min(duration, time)) });
  },
  setPlaying: (playing) => set({ playing }),
  setZoom: (zoom) => set({ zoom: Math.max(0.35, Math.min(6, zoom)) }),
  setSnap: (snap) => set({ snap }),
  updateTrack: (id, patch) => {
    const state = get();
    set(
      withClips(state, {
        ...state.doc,
        tracks: state.doc.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })
    );
  },
  setAspect: (aspect) => {
    const state = get();
    set(withClips(state, { ...state.doc, aspect }));
  },
  setFps: (fps) => {
    const state = get();
    set({ doc: { ...state.doc, fps }, dirty: true });
  },
  setBackground: (background) => {
    const state = get();
    set(withClips(state, { ...state.doc, background }));
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
    set({
      doc: createDefaultVideoDoc(state.doc.aspect),
      history: [...state.history, state.doc].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    });
  },
  markSaved: () => set({ dirty: false }),
}));
