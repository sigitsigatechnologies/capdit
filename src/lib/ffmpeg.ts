"use client";

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;
let loaded = false;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

export async function loadFFmpeg(
  onLog?: (message: string) => void
): Promise<import("@ffmpeg/ffmpeg").FFmpeg> {
  if (loaded && ffmpegPromise) return ffmpegPromise;
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => onLog?.(message));
      const coreURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript");
      const wasmURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm");
      await ffmpeg.load({ coreURL, wasmURL });
      loaded = true;
      return ffmpeg;
    })().catch((error) => {
      ffmpegPromise = null;
      throw error;
    });
  }
  return ffmpegPromise;
}

export async function transcodeToMp4(
  input: Blob,
  options: { onProgress?: (ratio: number) => void; onLog?: (message: string) => void } = {}
): Promise<Blob> {
  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await loadFFmpeg(options.onLog);
  ffmpeg.on("progress", ({ progress }) => options.onProgress?.(Math.max(0, Math.min(1, progress))));
  const inputName = "input.webm";
  const outputName = "output.mp4";
  await ffmpeg.writeFile(inputName, await fetchFile(input));
  await ffmpeg.exec([
    "-i",
    inputName,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    outputName,
  ]);
  const data = await ffmpeg.readFile(outputName);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const buffer = new Uint8Array(bytes.length);
  buffer.set(bytes);
  return new Blob([buffer.buffer], { type: "video/mp4" });
}

export function ffmpegAvailable() {
  return typeof window !== "undefined" && typeof WebAssembly === "object";
}
