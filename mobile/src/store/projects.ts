import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_ADJUSTMENTS } from "../types";
import type { MediaAsset, PhotoDoc, ProjectMode, ProjectRecord, VideoDoc } from "../types";
import { createDefaultVideoDoc } from "../lib/video";
import { uid } from "../lib/utils";

export function createDefaultPhotoDoc(aspect = "16:9"): PhotoDoc {
  return {
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    filterId: null,
    filterIntensity: 100,
    aspect,
    rotation: 0,
    flipX: false,
    flipY: false,
    fit: "cover",
  };
}

interface ProjectStore {
  projects: ProjectRecord[];
  assets: MediaAsset[];
  hydrated: boolean;
  addAssets: (assets: MediaAsset[]) => void;
  assetById: (id?: string) => MediaAsset | undefined;
  createProject: (opts: {
    name: string;
    mode: ProjectMode;
    aspect?: string;
    template?: string;
    photo?: PhotoDoc;
    video?: VideoDoc;
    thumbnail?: string;
  }) => ProjectRecord;
  updateProject: (project: ProjectRecord) => void;
  updatePhoto: (id: string, photo: PhotoDoc) => void;
  updateVideo: (id: string, video: VideoDoc) => void;
  getProject: (id: string) => ProjectRecord | undefined;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => ProjectRecord | undefined;
  deleteProject: (id: string) => void;
  setHydrated: (value: boolean) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      assets: [],
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      addAssets: (assets) => set((state) => ({ assets: [...assets, ...state.assets] })),
      assetById: (id) => (id ? get().assets.find((a) => a.id === id) : undefined),
      createProject: (opts) => {
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
        set((state) => ({ projects: [project, ...state.projects] }));
        return project;
      },
      updateProject: (project) =>
        set((state) => ({
          projects: [{ ...project, updatedAt: Date.now() }, ...state.projects.filter((p) => p.id !== project.id)].sort(
            (a, b) => b.updatedAt - a.updatedAt
          ),
        })),
      updatePhoto: (id, photo) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, photo, updatedAt: Date.now() } : p
          ),
        })),
      updateVideo: (id, video) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, video, updatedAt: Date.now() } : p
          ),
        })),
      getProject: (id) => get().projects.find((p) => p.id === id),
      renameProject: (id, name) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
        })),
      duplicateProject: (id) => {
        const source = get().projects.find((p) => p.id === id);
        if (!source) return undefined;
        const copy: ProjectRecord = {
          ...JSON.parse(JSON.stringify(source)),
          id: uid("prj"),
          name: `${source.name} copy`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({ projects: [copy, ...state.projects] }));
        return copy;
      },
      deleteProject: (id) =>
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),
    }),
    {
      name: "capdit-mobile-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ projects: state.projects, assets: state.assets }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
