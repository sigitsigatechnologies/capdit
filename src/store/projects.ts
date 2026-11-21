"use client";

import { create } from "zustand";
import {
  dbDeleteProject,
  dbDuplicateProject,
  dbGetProject,
  dbListAssets,
  dbListProjects,
  dbPutProject,
} from "@/lib/db";
import { importFile } from "@/lib/media";
import type { MediaAsset, PhotoDoc, ProjectMode, ProjectRecord, VideoDoc } from "@/lib/types";
import type { StoredAsset } from "@/lib/db";
import { DEFAULT_ADJUSTMENTS } from "@/lib/types";
import { createDefaultVideoDoc } from "@/lib/video";
import { uid } from "@/lib/utils";

export function createDefaultPhotoDoc(aspect = "16:9"): PhotoDoc {
  return {
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    filterId: null,
    filterIntensity: 100,
    background: {
      type: "none",
      color: "#111827",
      gradientFrom: "#7c3aed",
      gradientTo: "#22d3ee",
      blurAmount: 40,
      keyed: false,
      keyTolerance: 28,
    },
    objects: [],
    aspect,
    rotation: 0,
    flipX: false,
    flipY: false,
    crop: null,
  };
}

interface ProjectStore {
  projects: ProjectRecord[];
  assets: MediaAsset[];
  ready: boolean;
  loading: boolean;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  importFiles: (files: File[]) => Promise<{ assets: MediaAsset[]; errors: string[] }>;
  createProject: (opts: {
    name: string;
    mode: ProjectMode;
    aspect?: string;
    template?: string;
    photo?: PhotoDoc;
    video?: VideoDoc;
    thumbnail?: string;
  }) => Promise<ProjectRecord>;
  getProject: (id: string) => Promise<ProjectRecord | undefined>;
  saveProject: (project: ProjectRecord) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<ProjectRecord | undefined>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  assets: [],
  ready: false,
  loading: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const [projects, assets] = await Promise.all([dbListProjects(), dbListAssets()]);
      set({
        projects,
        assets: assets.map((record) => {
          const clone = { ...record } as StoredAsset & MediaAsset;
          delete (clone as { blob?: Blob }).blob;
          return clone as MediaAsset;
        }),
        ready: true,
      });
    } finally {
      set({ loading: false });
    }
  },
  refresh: async () => {
    const [projects, assets] = await Promise.all([dbListProjects(), dbListAssets()]);
    set({
      projects,
      assets: assets.map((record) => {
        const clone = { ...record } as StoredAsset & MediaAsset;
        delete (clone as { blob?: Blob }).blob;
        return clone as MediaAsset;
      }),
    });
  },
  importFiles: async (files) => {
    const created: MediaAsset[] = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        const { asset } = await importFile(file);
        created.push(asset);
      } catch (error) {
        errors.push(`${file.name}: ${(error as Error).message}`);
      }
    }
    if (created.length) {
      set((state) => ({ assets: [...created, ...state.assets] }));
    }
    return { assets: created, errors };
  },
  createProject: async (opts) => {
    const now = Date.now();
    const project: ProjectRecord = {
      id: uid("prj"),
      name: opts.name.trim() || "Untitled project",
      mode: opts.mode,
      aspect: opts.aspect ?? "16:9",
      thumbnail: opts.thumbnail,
      createdAt: now,
      updatedAt: now,
      template: opts.template,
      photo: opts.mode === "photo" ? opts.photo ?? createDefaultPhotoDoc(opts.aspect) : undefined,
      video: opts.mode === "video" ? opts.video ?? createDefaultVideoDoc(opts.aspect) : undefined,
    };
    await dbPutProject(project);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },
  getProject: async (id) => {
    const fromState = get().projects.find((p) => p.id === id);
    if (fromState) return fromState;
    return dbGetProject(id);
  },
  saveProject: async (project) => {
    const updated = { ...project, updatedAt: Date.now() };
    await dbPutProject(updated);
    set((state) => ({
      projects: [updated, ...state.projects.filter((p) => p.id !== project.id)].sort(
        (a, b) => b.updatedAt - a.updatedAt
      ),
    }));
  },
  renameProject: async (id, name) => {
    const project = await dbGetProject(id);
    if (!project) return;
    const updated = { ...project, name, updatedAt: Date.now() };
    await dbPutProject(updated);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },
  deleteProject: async (id) => {
    await dbDeleteProject(id);
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
  },
  duplicateProject: async (id) => {
    const copy = await dbDuplicateProject(id);
    if (copy) set((state) => ({ projects: [copy, ...state.projects] }));
    return copy;
  },
}));
