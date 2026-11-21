import * as MediaLibrary from "expo-media-library";
import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { FFmpegKit, ReturnCode } from "@wekor/ffmpeg-kit-react-native";
import type { MediaAsset, VideoClip, VideoDoc } from "../types";
import { resolveAdjustments } from "./presets";
import { computeDuration } from "./video";
import { safeFileName } from "./utils";

interface ExportOptions {
  doc: VideoDoc;
  assets: MediaAsset[];
  name: string;
  onProgress?: (progress: number) => void;
}

const XFADE: Record<string, string> = {
  none: "fade",
  fade: "fade",
  dissolve: "dissolve",
  slide: "slideleft",
  zoom: "zoomin",
  wipe: "wipeleft",
  blur: "pixelize",
};

function outputSize(aspect: string): { w: number; h: number } {
  const [aw, ah] = aspect.split(":").map(Number);
  const ratio = aw && ah ? aw / ah : 16 / 9;
  if (ratio >= 1) {
    const h = 720;
    const w = Math.round((h * ratio) / 2) * 2;
    return { w, h };
  }
  const w = 720;
  const h = Math.round(w / ratio / 2) * 2;
  return { w, h };
}

function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

function p(path: string): string {
  return path.replace(/^file:\/\//, "");
}

function gradeFilter(clip: VideoClip): string {
  const a = resolveAdjustments(clip.adjustments, clip.filterId, clip.filterIntensity);
  const brightness = Math.max(-1, Math.min(1, (a.brightness / 100) * 0.5 + (a.exposure / 100) * 0.35));
  const contrast = Math.max(0.1, 1 + a.contrast / 100);
  const saturation = Math.max(0, 1 + a.saturation / 100);
  const parts = [`eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}`];
  if (a.temperature !== 0) {
    const warm = Math.max(-0.6, Math.min(0.6, a.temperature / 160));
    parts.push(`colorbalance=rs=${warm.toFixed(2)}:bs=${(-warm).toFixed(2)}`);
  }
  if (a.blur > 0) parts.push(`gblur=sigma=${((a.blur / 100) * 6).toFixed(2)}`);
  return parts.join(",");
}

export async function exportVideo({ doc, assets, name, onProgress }: ExportOptions): Promise<{ uri: string; saved: boolean }> {
  const visual = doc.clips
    .filter((c) => c.kind === "video" || c.kind === "image")
    .sort((a, b) => a.start - b.start);
  if (!visual.length) throw new Error("Add at least one video or photo before exporting.");

  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const { w, h } = outputSize(doc.aspect);
  const inputs: string[] = [];
  const chains: string[] = [];
  const labels: string[] = [];
  let inputIndex = 0;

  for (const clip of visual) {
    const asset = clip.assetId ? assetMap.get(clip.assetId) : undefined;
    if (!asset) continue;
    const duration = Math.max(0.4, clip.duration);
    if (clip.kind === "image") {
      inputs.push(`-loop 1 -t ${duration.toFixed(3)} -i "${p(asset.uri)}"`);
      chains.push(
        `[${inputIndex}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=30,format=yuv420p,trim=duration=${duration.toFixed(
          3
        )},setpts=PTS-STARTPTS,${gradeFilter(clip)}[v${inputIndex}]`
      );
    } else {
      inputs.push(`-i "${p(asset.uri)}"`);
      const sourceDuration = clip.inPoint + duration * clip.speed;
      chains.push(
        `[${inputIndex}:v]trim=start=${clip.inPoint.toFixed(3)}:end=${sourceDuration.toFixed(
          3
        )},setpts=(PTS-STARTPTS)/${clip.speed},scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=30,format=yuv420p,${gradeFilter(
          clip
        )}[v${inputIndex}]`
      );
    }
    labels.push(`[v${inputIndex}]`);
    inputIndex += 1;
  }

  let videoOut = labels[0]?.replace(/[\[\]]/g, "");
  if (!videoOut) throw new Error("No readable media found in this project.");

  if (labels.length > 1) {
    let current = videoOut;
    let offset = 0;
    for (let i = 1; i < visual.length; i += 1) {
      const previous = visual[i - 1];
      const transition = visual[i].transitionIn;
      const td = transition.type === "none" ? 0.01 : Math.min(transition.duration, previous.duration / 2, visual[i].duration / 2);
      offset += Math.max(0.05, previous.duration - td);
      const next = `x${i}`;
      chains.push(
        `[${current}][v${i}]xfade=transition=${XFADE[transition.type] ?? "fade"}:duration=${td.toFixed(
          3
        )}:offset=${offset.toFixed(3)}[${next}]`
      );
      current = next;
    }
    videoOut = current;
  }

  let textOut = videoOut;
  const textClips = doc.clips.filter((c) => c.kind === "text" && (c.text ?? "").trim());
  textClips.forEach((clip, index) => {
    const style = clip.textStyle;
    const fontSize = Math.max(12, Math.round(((style?.fontSize ?? 56) / 720) * h));
    const color = (style?.color ?? "#ffffff").replace("#", "0x");
    const text = escapeDrawText(clip.text ?? "");
    const fontfile = Platform.OS === "android" ? "/system/fonts/Roboto-Regular.ttf" : "/System/Library/Fonts/Helvetica.ttc";
    const next = `t${index}`;
    chains.push(
      `[${textOut}]drawtext=fontfile='${fontfile}':text='${text}':fontcolor=${color}:fontsize=${fontSize}:x=(w-text_w)/2:y=h*0.72:borderw=2:bordercolor=black@0.55:enable='between(t,${clip.start.toFixed(
        3
      )},${(clip.start + clip.duration).toFixed(3)})'[${next}]`
    );
    textOut = next;
  });

  let audioMap = "";
  const audioClip = doc.clips
    .filter((c) => c.kind === "audio" && c.assetId)
    .sort((a, b) => a.start - b.start)[0];
  const audioAsset = audioClip?.assetId ? assetMap.get(audioClip.assetId) : undefined;
  if (audioClip && audioAsset) {
    const audioInput = inputIndex;
    inputs.push(`-i "${p(audioAsset.uri)}"`);
    const delay = Math.round(audioClip.start * 1000);
    chains.push(
      `[${audioInput}:a]atrim=duration=${Math.max(0.5, audioClip.duration).toFixed(3)},asetpts=PTS-STARTPTS,volume=${(
        audioClip.volume / 100
      ).toFixed(2)},adelay=${delay}|${delay}[aout]`
    );
    audioMap = `-map "[aout]" -c:a aac -b:a 160k`;
  }

  const outDir = new Directory(Paths.document, "exports");
  if (!outDir.exists) outDir.create({ intermediates: true, idempotent: true });
  const outFile = new File(outDir, `${safeFileName(name) || "capdit-export"}.mp4`);
  const outPath = p(outFile.uri);
  const totalDuration = computeDuration(doc.clips) || doc.duration || 1;

  const command = [
    "-y",
    ...inputs,
    `-filter_complex "${chains.join(";")}"`,
    `-map "[${textOut}]"`,
    audioMap,
    `-c:v ${Platform.OS === "android" ? "h264_mediacodec" : "h264_videotoolbox"}` ,
    "-preset veryfast",
    "-crf 21",
    "-pix_fmt yuv420p",
    "-r 30",
    "-movflags +faststart",
    `"${outPath}"`,
  ]
    .filter(Boolean)
    .join(" ");

  await new Promise<void>((resolve, reject) => {
    FFmpegKit.executeAsync(
      command,
      async (session) => {
        const returnCode = await session.getReturnCode();
        if (ReturnCode.isSuccess(returnCode)) {
          resolve();
        } else {
          const output = await session.getFailStackTrace();
          reject(new Error(output || "FFmpeg could not render this timeline."));
        }
      },
      undefined,
      (statistics) => {
        const time = statistics.getTime();
        if (time > 0) onProgress?.(Math.min(0.98, time / 1000 / totalDuration));
      }
    ).catch(reject);
  });

  onProgress?.(1);
  let saved = false;
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (permission.granted) {
      await MediaLibrary.saveToLibraryAsync(outFile.uri);
      saved = true;
    }
  } catch {
    saved = false;
  }
  return { uri: outFile.uri, saved };
}
