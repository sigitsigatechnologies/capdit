import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import type { MediaAsset, MediaKind } from "../types";
import { uid } from "./utils";

function mediaDirectory(): Directory {
  const dir = new Directory(Paths.document, "capdit-media");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function extensionFor(name: string | null | undefined, mime: string | undefined, kind: MediaKind): string {
  const fromName = name?.match(/\.[a-z0-9]{2,5}$/i)?.[0];
  if (fromName) return fromName.toLowerCase();
  if (kind === "image") return mime?.includes("png") ? ".png" : ".jpg";
  if (kind === "video") return mime?.includes("quicktime") ? ".mov" : ".mp4";
  return mime?.includes("wav") ? ".wav" : ".mp3";
}

async function persistFile(sourceUri: string, name: string, kind: MediaKind, mime: string | undefined) {
  const dir = mediaDirectory();
  const dest = new File(dir, `${uid("ast")}${extensionFor(name, mime, kind)}`);
  await new File(sourceUri).copy(dest);
  return dest;
}

async function makeVideoThumbnail(file: File) {
  try {
    const thumb = await VideoThumbnails.getThumbnailAsync(file.uri, { time: 0, quality: 0.7 });
    const dir = mediaDirectory();
    const dest = new File(dir, `${uid("thumb")}.jpg`);
    await new File(thumb.uri).copy(dest);
    return dest.uri;
  } catch {
    return undefined;
  }
}

export interface ImportResult {
  assets: MediaAsset[];
  errors: string[];
}

export async function importVisualMedia(): Promise<ImportResult> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    allowsMultipleSelection: true,
    quality: 1,
    orderedSelection: true,
  });
  if (result.canceled) return { assets: [], errors: [] };

  const assets: MediaAsset[] = [];
  const errors: string[] = [];
  for (const picked of result.assets) {
    try {
      const kind: MediaKind = picked.type === "video" ? "video" : "image";
      const mime = picked.mimeType ?? (kind === "video" ? "video/mp4" : "image/jpeg");
      const name = picked.fileName ?? `${kind}-${Date.now()}`;
      const file = await persistFile(picked.uri, name, kind, mime);
      const thumbnailUri = kind === "video" ? await makeVideoThumbnail(file) : file.uri;
      assets.push({
        id: uid("ast"),
        name,
        kind,
        mime,
        uri: file.uri,
        width: picked.width || undefined,
        height: picked.height || undefined,
        duration: picked.duration ? picked.duration / 1000 : undefined,
        thumbnailUri,
        createdAt: Date.now(),
      });
    } catch (error) {
      errors.push(`${picked.fileName ?? "media"}: ${(error as Error).message}`);
    }
  }
  return { assets, errors };
}

export async function importAudioFiles(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return { assets: [], errors: [] };

  const assets: MediaAsset[] = [];
  const errors: string[] = [];
  for (const picked of result.assets) {
    try {
      const mime = picked.mimeType ?? "audio/mpeg";
      const file = await persistFile(picked.uri, picked.name, "audio", mime);
      assets.push({
        id: uid("ast"),
        name: picked.name,
        kind: "audio",
        mime,
        uri: file.uri,
        duration: 30,
        createdAt: Date.now(),
      });
    } catch (error) {
      errors.push(`${picked.name}: ${(error as Error).message}`);
    }
  }
  return { assets, errors };
}

export function deleteAssetFile(uri?: string) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* ignore */
  }
}
