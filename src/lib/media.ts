import { dbGetAsset, dbPutAsset, type StoredAsset } from "./db";
import type { MediaAsset, MediaKind } from "./types";
import { uid } from "./utils";

const urlCache = new Map<string, string>();
const blobCache = new Map<string, Blob>();

export const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,.webm,.m4v,.mp3,.wav,.aac,.m4a,.ogg";

export function detectKind(file: File): MediaKind | null {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "m4v", "ogv"].includes(ext)) return "video";
  if (["mp3", "wav", "aac", "m4a", "ogg", "flac"].includes(ext)) return "audio";
  return null;
}

export function fileSupportMessage(file: File): string | null {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime === "image/heic" || mime === "image/heif" || ext === "heic" || ext === "heif") {
    if (typeof document === "undefined") return null;
    const can = document.createElement("canvas").toDataURL("image/png");
    if (!can) return "HEIC decoding is not supported in this browser.";
  }
  if (mime === "video/quicktime" || ext === "mov") {
    const video = document.createElement("video");
    if (!video.canPlayType("video/quicktime")) {
      return "This browser may not decode MOV files. Convert to MP4/WebM if preview fails.";
    }
  }
  if (mime === "audio/aac" || ext === "aac") {
    const audio = document.createElement("audio");
    if (!audio.canPlayType("audio/aac")) return "AAC decoding may be unsupported in this browser.";
  }
  return null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

function loadVideoMetadata(url: string): Promise<{ duration: number; width: number; height: number; video: HTMLVideoElement }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    let settled = false;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out reading video metadata"));
    }, 20000);

    function cleanup() {
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeEventListener("durationchange", discoverDuration);
      video.removeEventListener("timeupdate", discoverDuration);
    }

    function finish() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        duration: Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight,
        video,
      });
    }

    // MediaRecorder WebM files often report Infinity until the browser scans
    // to the end of the stream. Seeking far forward forces duration discovery.
    function discoverDuration() {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        try {
          video.currentTime = 0;
        } catch {
          /* noop */
        }
        finish();
      }
    }

    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        finish();
        return;
      }
      video.addEventListener("durationchange", discoverDuration);
      video.addEventListener("timeupdate", discoverDuration);
      try {
        video.currentTime = 1e7;
      } catch {
        finish();
      }
      window.setTimeout(finish, 3500);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Unsupported or corrupt video file"));
    };
  });
}

export async function makeThumbnail(
  source: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number,
  max = 420
): Promise<string | undefined> {
  try {
    const scale = Math.min(1, max / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}

export async function importFile(file: File): Promise<{ asset: MediaAsset; stored: StoredAsset }> {
  const kind = detectKind(file);
  if (!kind) throw new Error(`Unsupported file type: ${file.name}`);
  const mime = file.type || (kind === "image" ? "image/jpeg" : kind === "video" ? "video/mp4" : "audio/mpeg");
  const id = uid("ast");
  let width: number | undefined;
  let height: number | undefined;
  let duration: number | undefined;
  let thumbnail: string | undefined;
  const url = URL.createObjectURL(file);
  try {
    if (kind === "image") {
      const img = await loadImage(url);
      width = img.naturalWidth;
      height = img.naturalHeight;
      thumbnail = await makeThumbnail(img, width, height);
    } else if (kind === "video") {
      const meta = await loadVideoMetadata(url);
      width = meta.width;
      height = meta.height;
      duration = meta.duration;
      await new Promise<void>((resolve) => {
        const v = meta.video;
        const done = () => resolve();
        v.onseeked = done;
        v.currentTime = Math.min(0.2, (duration ?? 1) * 0.1);
        setTimeout(done, 3000);
      });
      thumbnail = await makeThumbnail(meta.video, width || 320, height || 180);
    } else {
      duration = await probeAudioDuration(url);
      thumbnail = undefined;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
  if (kind === "video" && !duration) throw new Error("Video has no readable duration");
  const asset: MediaAsset = {
    id,
    name: file.name,
    kind,
    mime,
    size: file.size,
    width,
    height,
    duration,
    thumbnail,
    createdAt: Date.now(),
  };
  const stored: StoredAsset = { ...asset, blob: file };
  await dbPutAsset(stored);
  blobCache.set(id, file);
  return { asset, stored };
}

function probeAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;
    const timer = setTimeout(() => reject(new Error("Timed out reading audio metadata")), 12000);
    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Unsupported audio format"));
    };
  });
}

export async function getAssetBlob(id: string): Promise<Blob | undefined> {
  const cached = blobCache.get(id);
  if (cached) return cached;
  const stored = await dbGetAsset(id);
  if (!stored) return undefined;
  blobCache.set(id, stored.blob);
  return stored.blob;
}

export async function getAssetUrl(id: string): Promise<string | undefined> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const blob = await getAssetBlob(id);
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export async function getAssetRecord(id: string): Promise<StoredAsset | undefined> {
  return dbGetAsset(id);
}

export function releaseAssetUrl(id: string) {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

export async function generateWaveform(blob: Blob, buckets = 240): Promise<number[]> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = buffer.getChannelData(0);
    const size = Math.max(1, Math.floor(channel.length / buckets));
    const peaks: number[] = [];
    let max = 0.0001;
    for (let i = 0; i < buckets; i++) {
      let sum = 0;
      const start = i * size;
      const end = Math.min(channel.length, start + size);
      for (let j = start; j < end; j += Math.max(1, Math.floor(size / 200))) {
        sum = Math.max(sum, Math.abs(channel[j]));
      }
      peaks.push(sum);
      max = Math.max(max, sum);
    }
    return peaks.map((p) => Math.min(1, p / max));
  } catch {
    return [];
  }
}

export function aspectToRatio(aspect: string): number {
  const [w, h] = aspect.split(":").map(Number);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return w / h;
  return 16 / 9;
}
