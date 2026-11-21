"use client";

import { analyzeImageStats, parseEditingPrompt, suggestAutoColor, suggestAutoEnhance, type AIIntent } from "@/lib/ai";
import { getAssetRecord } from "@/lib/media";
import type { Adjustments, ProjectMode, ProjectRecord } from "@/lib/types";
import { computeDuration, createDefaultTracks, createMediaClip } from "@/lib/video";
import { useProjectStore, createDefaultPhotoDoc } from "@/store/projects";
import { createDefaultVideoDoc } from "@/lib/video";
import { STUDIO_TEMPLATES } from "@/lib/templates";

export interface CreateOptions {
  name?: string;
  mode?: ProjectMode;
  aspect?: string;
  presetId?: string;
  filterId?: string;
  adjustments?: Partial<Adjustments>;
  autoEnhance?: "enhance" | "color" | "crop";
  sourcePrompt?: string;
}

export async function createProjectFromFiles(
  files: File[],
  options: CreateOptions = {}
): Promise<{ project?: ProjectRecord; errors: string[] }> {
  const store = useProjectStore.getState();
  const { assets, errors } = await store.importFiles(files);
  if (!assets.length) return { errors };

  const first = assets[0];
  const hasVideo = assets.some((a) => a.kind === "video");
  const hasAudio = assets.some((a) => a.kind === "audio");
  const onlyImages = assets.every((a) => a.kind === "image");
  const mode: ProjectMode = options.mode ?? (onlyImages && assets.length === 1 ? "photo" : hasVideo || hasAudio ? "video" : "video");

  let name = options.name ?? first.name.replace(/\.[^.]+$/, "");
  if (!options.name) name = name.replace(/[_-]+/g, " ").trim() || "Untitled project";

  if (mode === "photo") {
    let adjustments: Partial<Adjustments> = options.adjustments ?? {};
    if (options.autoEnhance && assets[0].kind === "image") {
      const record = await getAssetRecord(assets[0].id);
      if (record) {
        const stats = await analyzeImageStats(record.blob);
        if (stats) {
          adjustments =
            options.autoEnhance === "enhance" ? suggestAutoEnhance(stats) : suggestAutoColor(stats);
        }
      }
    }
    const photo = createDefaultPhotoDoc(options.aspect ?? "16:9");
    photo.assetId = first.id;
    photo.filterId = options.filterId ?? null;
    Object.assign(photo.adjustments, adjustments);
    const project = await store.createProject({
      name,
      mode: "photo",
      aspect: photo.aspect,
      thumbnail: first.thumbnail,
      photo,
      template: options.presetId,
    });
    return { project, errors };
  }

  const doc = createDefaultVideoDoc(options.aspect ?? "16:9");
  doc.tracks = createDefaultTracks();
  const filterId = options.filterId ?? null;
  const videoAssets = assets.filter((a) => a.kind !== "audio");
  const audioAssets = assets.filter((a) => a.kind === "audio");

  if (videoAssets.length === 1) {
    const a = videoAssets[0];
    const duration = a.kind === "image" ? 4 : Math.min(Math.max(a.duration ?? 5, 1), 30);
    const clip = createMediaClip(
      "track_video",
      a.id,
      a.name,
      a.kind as "video" | "image",
      0,
      duration
    );
    if (filterId) clip.filterId = filterId;
    if (options.adjustments) Object.assign(clip.adjustments, options.adjustments);
    doc.clips.push(clip);
  } else {
    let cursor = 0;
    for (const a of videoAssets) {
      const duration = a.kind === "image" ? 4 : Math.min(Math.max(a.duration ?? 5, 1), 15);
      const clip = createMediaClip("track_video", a.id, a.name, a.kind as "video" | "image", cursor, duration);
      clip.transitionIn = { type: "dissolve", duration: 0.7 };
      if (filterId) clip.filterId = filterId;
      doc.clips.push(clip);
      cursor += duration;
    }
  }

  let audioCursor = 0;
  for (const a of audioAssets) {
    const duration = Math.min(Math.max(a.duration ?? 10, 1), 120);
    const clip = createMediaClip("track_audio", a.id, a.name, "audio", audioCursor, duration);
    doc.clips.push(clip);
    audioCursor += duration;
  }

  doc.duration = Math.max(12, videoAssets.reduce((acc, a) => acc + (a.kind === "image" ? 4 : Math.min(a.duration ?? 5, 15)), 0), audioCursor);

  let thumbnail = first.thumbnail;
  if (!thumbnail && first.kind === "video") thumbnail = first.thumbnail;

  const project = await store.createProject({
    name,
    mode: "video",
    aspect: doc.aspect,
    thumbnail,
    video: doc,
    template: options.presetId,
  });
  return { project, errors };
}

function cleanProjectName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled project";
}

function applyIntent(clip: ReturnType<typeof createMediaClip>, intent: AIIntent, extra?: Partial<Adjustments>) {
  clip.filterId = intent.filterId ?? clip.filterId;
  Object.assign(clip.adjustments, extra ?? {}, intent.adjustments);
  if (intent.clipEffect) clip.effect = intent.clipEffect;
}

export async function createProjectFromPrompt(
  files: File[],
  prompt: string,
  options: { name?: string; aspect?: string } = {}
): Promise<{ project?: ProjectRecord; errors: string[]; intent: AIIntent }> {
  const store = useProjectStore.getState();
  const intent = parseEditingPrompt(prompt);
  const { assets, errors } = await store.importFiles(files);
  if (!assets.length) return { errors, intent };

  const visual = assets.filter((a) => a.kind === "image" || a.kind === "video");
  const audio = assets.filter((a) => a.kind === "audio");
  const first = visual[0] ?? assets[0];
  const singlePhoto = assets.length === 1 && visual.length === 1 && visual[0].kind === "image";

  if (singlePhoto) {
    const aspect = intent.aspect ?? options.aspect ?? "16:9";
    const photo = createDefaultPhotoDoc(aspect);
    photo.assetId = first.id;
    photo.filterId = intent.filterId ?? null;
    Object.assign(photo.adjustments, intent.adjustments);
    const project = await store.createProject({
      name: options.name ?? cleanProjectName(first.name),
      mode: "photo",
      aspect,
      thumbnail: first.thumbnail,
      photo,
      template: "assistant",
    });
    return { project, errors, intent };
  }

  const aspect = intent.aspect ?? options.aspect ?? "16:9";
  const doc = createDefaultVideoDoc(aspect);
  doc.tracks = createDefaultTracks();
  doc.template = "assistant";

  const speed = intent.speed ?? 1;
  const pace = intent.clipDuration;
  const transition = intent.transition ?? { type: "dissolve" as const, duration: 0.7 };

  let cursor = 0;
  let index = 0;
  for (const asset of visual) {
    const kind = asset.kind === "image" ? "image" : "video";
    let duration: number;
    if (kind === "image") {
      duration = pace ?? 4;
    } else {
      const source = Math.max(1, asset.duration ?? 5);
      const scaled = source / speed;
      duration = pace ? Math.min(scaled, pace) : Math.min(scaled, 10);
    }
    duration = Math.max(1.2, duration);

    const clip = createMediaClip("track_video", asset.id, asset.name, kind, cursor, duration);
    if (kind === "video") clip.speed = speed;
    applyIntent(clip, intent);
    if (index > 0) {
      clip.transitionIn = { ...transition };
    } else {
      clip.fadeIn = Math.min(0.5, duration / 3);
    }
    doc.clips.push(clip);
    cursor += duration;
    index += 1;
  }

  const totalVisual = cursor;
  let audioCursor = 0;
  for (const track of audio) {
    const available = Math.max(0.5, (track.duration ?? 10) - audioCursor);
    if (totalVisual > 0 && audioCursor >= totalVisual) break;
    const duration = totalVisual > 0 ? Math.min(available, totalVisual - audioCursor) : available;
    if (duration <= 0.2) break;
    const clip = createMediaClip("track_audio", track.id, track.name, "audio", audioCursor, duration);
    clip.volume = 75;
    clip.fadeIn = Math.min(0.6, duration / 3);
    clip.fadeOut = Math.min(1.2, duration / 3);
    doc.clips.push(clip);
    audioCursor += duration;
  }

  doc.duration = computeDuration(doc.clips);

  const project = await store.createProject({
    name: options.name ?? cleanProjectName(first.name),
    mode: "video",
    aspect,
    thumbnail: first.thumbnail,
    video: doc,
    template: "assistant",
  });
  return { project, errors, intent };
}

export async function createProjectFromTemplate(templateId: string): Promise<ProjectRecord | undefined> {
  const template = STUDIO_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return undefined;
  const store = useProjectStore.getState();
  if (template.mode === "photo") {
    const photo = createDefaultPhotoDoc(template.aspect);
    photo.filterId = template.filterId ?? null;
    if (template.adjustments) Object.assign(photo.adjustments, template.adjustments);
    return store.createProject({
      name: template.name,
      mode: "photo",
      aspect: template.aspect,
      template: template.id,
      photo,
    });
  }
  const doc = createDefaultVideoDoc(template.aspect);
  if (template.buildVideo) {
    const built = template.buildVideo(14);
    doc.clips = built.clips;
    doc.tracks = built.tracks;
    doc.background = template.background ?? doc.background;
    doc.template = template.id;
  }
  return store.createProject({
    name: template.name,
    mode: "video",
    aspect: template.aspect,
    template: template.id,
    video: doc,
  });
}

