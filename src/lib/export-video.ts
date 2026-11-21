"use client";

export interface RecordingOptions {
  canvas: HTMLCanvasElement;
  fps: number;
  duration: number;
  audioStream?: MediaStream | null;
  preferMp4?: boolean;
  videoBitsPerSecond?: number;
  onProgress?: (progress: number, elapsed: number) => void;
  onStart?: () => void;
  onStop?: () => void;
}

export interface RecordingResult {
  blob: Blob;
  mime: string;
  extension: "mp4" | "webm";
}

const MP4_CANDIDATES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  "video/mp4;codecs=h264,aac",
  "video/mp4",
];
const WEBM_CANDIDATES = [
  'video/webm;codecs="vp9,opus"',
  'video/webm;codecs="vp8,opus"',
  "video/webm",
];

export function pickRecorderMime(preferMp4: boolean): { mime: string; extension: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const order = preferMp4 ? [...MP4_CANDIDATES, ...WEBM_CANDIDATES] : [...WEBM_CANDIDATES, ...MP4_CANDIDATES];
  for (const mime of order) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return { mime, extension: mime.includes("mp4") ? "mp4" : "webm" };
    }
  }
  return null;
}

export function recorderSupported() {
  return typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

export async function recordTimeline(options: RecordingOptions): Promise<RecordingResult> {
  const { canvas, fps, duration, audioStream, onProgress, onStart, onStop } = options;
  if (!recorderSupported()) {
    throw new Error("Your browser does not support canvas recording. Try Chrome or Edge.");
  }
  const picked = pickRecorderMime(Boolean(options.preferMp4));
  if (!picked) throw new Error("No supported video recorder format found in this browser.");

  const stream = canvas.captureStream(fps);
  if (audioStream) {
    for (const track of audioStream.getAudioTracks()) stream.addTrack(track);
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: picked.mime,
    videoBitsPerSecond: options.videoBitsPerSecond ?? 8_000_000,
    audioBitsPerSecond: 160_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);
  onStart?.();
  const started = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - started) / 1000;
      onProgress?.(Math.min(1, elapsed / duration), elapsed);
      if (elapsed >= duration) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

  recorder.stop();
  await stopped;
  onStop?.();
  for (const track of stream.getVideoTracks()) track.stop();

  const blob = new Blob(chunks, { type: picked.mime });
  return { blob, mime: picked.mime, extension: picked.extension };
}

export function estimateVideoSize(duration: number, bitrate: number) {
  return Math.round((duration * bitrate) / 8);
}
