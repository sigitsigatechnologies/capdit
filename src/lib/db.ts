import { openDB, type IDBPDatabase } from "idb";
import type { MediaAsset, ProjectRecord } from "./types";

const DB_NAME = "capdit-studio";
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === "undefined") throw new Error("IndexedDB is browser only");
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("projects")) {
          const store = db.createObjectStore("projects", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("assets")) {
          db.createObjectStore("assets", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export interface StoredAsset {
  id: string;
  name: string;
  kind: MediaAsset["kind"];
  mime: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

export async function dbListProjects(): Promise<ProjectRecord[]> {
  const db = await getDB();
  const all = (await db.getAll("projects")) as ProjectRecord[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function dbGetProject(id: string): Promise<ProjectRecord | undefined> {
  const db = await getDB();
  return (await db.get("projects", id)) as ProjectRecord | undefined;
}

export async function dbPutProject(project: ProjectRecord): Promise<void> {
  const db = await getDB();
  await db.put("projects", project);
}

export async function dbDeleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("projects", id);
}

export async function dbDuplicateProject(id: string): Promise<ProjectRecord | undefined> {
  const project = await dbGetProject(id);
  if (!project) return undefined;
  const copy: ProjectRecord = {
    ...structuredClone(project),
    id: `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${project.name} copy`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await dbPutProject(copy);
  return copy;
}

export async function dbPutAsset(asset: StoredAsset): Promise<void> {
  const db = await getDB();
  await db.put("assets", asset);
}

export async function dbGetAsset(id: string): Promise<StoredAsset | undefined> {
  const db = await getDB();
  return (await db.get("assets", id)) as StoredAsset | undefined;
}

export async function dbDeleteAsset(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("assets", id);
}

export async function dbListAssets(): Promise<StoredAsset[]> {
  const db = await getDB();
  return (await db.getAll("assets")) as StoredAsset[];
}
