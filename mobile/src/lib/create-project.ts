import type { MediaAsset, PhotoDoc, ProjectRecord } from "../types";
import { parseEditingPrompt, type AIIntent } from "./prompt";
import type { StudioTemplate } from "./templates";
import { buildTemplateVideo } from "./templates";
import { computeDuration, createDefaultVideoDoc, createMediaClip } from "./video";
import { useProjectStore, createDefaultPhotoDoc } from "../store/projects";
import { cleanProjectName } from "./utils";

function applyIntent(clip: ReturnType<typeof createMediaClip>, intent: AIIntent) {
  if (intent.filterId) clip.filterId = intent.filterId;
  clip.adjustments = { ...clip.adjustments, ...intent.adjustments };
  if (intent.clipEffect) clip.effect = intent.clipEffect;
}

export function createProjectFromMedia(assets: MediaAsset[], options: { name?: string; aspect?: string } = {}) {
  const store = useProjectStore.getState();
  store.addAssets(assets);
  const visual = assets.filter((a) => a.kind === "image" || a.kind === "video");
  const audio = assets.filter((a) => a.kind === "audio");
  const first = visual[0] ?? assets[0];
  const singlePhoto = assets.length === 1 && visual.length === 1 && visual[0].kind === "image";

  if (singlePhoto) {
    const photo = createDefaultPhotoDoc(options.aspect ?? "16:9");
    photo.assetId = first.id;
    return store.createProject({
      name: options.name ?? cleanProjectName(first.name),
      mode: "photo",
      aspect: photo.aspect,
      thumbnail: first.thumbnailUri ?? first.uri,
      photo,
    });
  }

  const aspect = options.aspect ?? "16:9";
  const doc = createDefaultVideoDoc(aspect);
  let cursor = 0;
  for (const asset of visual) {
    const kind = asset.kind === "image" ? "image" : "video";
    const duration = kind === "image" ? 4 : Math.min(Math.max(asset.duration ?? 5, 1), 10);
    const clip = createMediaClip(asset.id, asset.name, kind, cursor, duration);
    if (visual.indexOf(asset) > 0) clip.transitionIn = { type: "dissolve", duration: 0.7 };
    doc.clips.push(clip);
    cursor += duration;
  }
  for (const track of audio) {
    const duration = Math.min(Math.max(track.duration ?? 10, 1), cursor || 30);
    doc.clips.push(createMediaClip(track.id, track.name, "audio", 0, duration));
  }
  doc.duration = computeDuration(doc.clips);

  return store.createProject({
    name: options.name ?? cleanProjectName(first.name),
    mode: "video",
    aspect,
    thumbnail: first.thumbnailUri ?? first.uri,
    video: doc,
  });
}

export function createProjectFromPrompt(
  assets: MediaAsset[],
  prompt: string,
  options: { name?: string; aspect?: string } = {}
): { project: ProjectRecord; intent: AIIntent } {
  const store = useProjectStore.getState();
  store.addAssets(assets);
  const intent = parseEditingPrompt(prompt);
  const visual = assets.filter((a) => a.kind === "image" || a.kind === "video");
  const audio = assets.filter((a) => a.kind === "audio");
  const first = visual[0] ?? assets[0];
  const singlePhoto = assets.length === 1 && visual.length === 1 && visual[0].kind === "image";

  if (singlePhoto) {
    const photo = createDefaultPhotoDoc(intent.aspect ?? options.aspect ?? "16:9");
    photo.assetId = first.id;
    photo.filterId = intent.filterId ?? null;
    photo.adjustments = { ...photo.adjustments, ...intent.adjustments };
    const project = store.createProject({
      name: options.name ?? cleanProjectName(first.name),
      mode: "photo",
      aspect: photo.aspect,
      thumbnail: first.thumbnailUri ?? first.uri,
      photo,
      template: "assistant",
    });
    return { project, intent };
  }

  const aspect = intent.aspect ?? options.aspect ?? "16:9";
  const doc = createDefaultVideoDoc(aspect);
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
    const clip = createMediaClip(asset.id, asset.name, kind, cursor, duration);
    if (kind === "video") clip.speed = speed;
    applyIntent(clip, intent);
    if (index > 0) clip.transitionIn = { ...transition };
    else clip.fadeIn = Math.min(0.5, duration / 3);
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
    const clip = createMediaClip(track.id, track.name, "audio", audioCursor, duration);
    clip.volume = 75;
    clip.fadeIn = Math.min(0.6, duration / 3);
    clip.fadeOut = Math.min(1.2, duration / 3);
    doc.clips.push(clip);
    audioCursor += duration;
  }

  doc.duration = computeDuration(doc.clips);
  const project = store.createProject({
    name: options.name ?? cleanProjectName(first.name),
    mode: "video",
    aspect,
    thumbnail: first.thumbnailUri ?? first.uri,
    video: doc,
    template: "assistant",
  });
  return { project, intent };
}

export function createProjectFromTemplate(template: StudioTemplate, asset?: MediaAsset): ProjectRecord {
  const store = useProjectStore.getState();
  if (asset) store.addAssets([asset]);

  if (template.mode === "photo") {
    const photo: PhotoDoc = createDefaultPhotoDoc(template.aspect);
    photo.assetId = asset?.id;
    photo.filterId = template.filterId ?? null;
    photo.adjustments = { ...photo.adjustments, ...(template.adjustments ?? {}) };
    return store.createProject({
      name: template.name,
      mode: "photo",
      aspect: template.aspect,
      thumbnail: asset?.thumbnailUri ?? asset?.uri,
      photo,
      template: template.id,
    });
  }

  return store.createProject({
    name: template.name,
    mode: "video",
    aspect: template.aspect,
    thumbnail: asset?.thumbnailUri ?? asset?.uri,
    video: buildTemplateVideo(template),
    template: template.id,
  });
}
