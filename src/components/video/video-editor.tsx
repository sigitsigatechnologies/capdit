"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Loader2,
  Film,
  Music2,
  Sparkles,
  MonitorPlay,
  Volume2,
  VolumeX,
  ImageIcon,
  Upload,
  Type,
  Wand2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useProjectStore } from "@/store/projects";
import { useVideoStore } from "@/store/video";
import { getAssetUrl, aspectToRatio } from "@/lib/media";
import { analyzeImageStats, runRemoteAI, suggestAutoColor, suggestAutoEnhance, type AIIntent, type AITool } from "@/lib/ai";
import { renderVideoFrame } from "@/lib/render-video";
import { buildTemplateVideo, STUDIO_TEMPLATES } from "@/lib/templates";
import { recordTimeline } from "@/lib/export-video";
import {
  computeDuration,
  createMediaClip,
  createTextClip,
  DEFAULT_TEXT_STYLE,
  getPreviousClip,
} from "@/lib/video";
import type { MediaAsset, ProjectRecord, VideoClip, VideoDoc } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { EditorTopBar } from "@/components/editor/top-bar";
import { LeftRail, type RailItem } from "@/components/editor/left-rail";
import { AISettingsDialog } from "@/components/ai-settings";
import { VideoExportDialog, type VideoExportConfig } from "@/components/editor/export-dialogs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/shell";
import { Timeline } from "./timeline";
import { VideoInspector } from "./inspector";
import { VideoToolPanel } from "./tool-panel";
import { TEXT_STYLE_PRESETS } from "@/lib/text-presets";

const RAIL: RailItem[] = [
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "text", label: "Text", icon: Type },
  { id: "audio", label: "Audio", icon: Music2 },
  { id: "filters", label: "Filters", icon: Sparkles },
  { id: "effects", label: "Effects", icon: MonitorPlay },
  { id: "transitions", label: "Transitions", icon: Wand2 },
  { id: "templates", label: "Templates", icon: Layers },
  { id: "ai", label: "AI Tools", icon: Sparkles },
];

const PREVIEW_MAX = 960;

function previewDims(aspect: string) {
  const ratio = aspectToRatio(aspect);
  if (ratio >= 1) return { width: PREVIEW_MAX, height: Math.round(PREVIEW_MAX / ratio) };
  return { width: Math.round(PREVIEW_MAX * ratio), height: PREVIEW_MAX };
}

export function VideoEditor({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { getProject, saveProject } = useProjectStore();
  const doc = useVideoStore((s) => s.doc);
  const playing = useVideoStore((s) => s.playing);
  const dirty = useVideoStore((s) => s.dirty);
  const history = useVideoStore((s) => s.history);
  const future = useVideoStore((s) => s.future);
  const selectedClipId = useVideoStore((s) => s.selectedClipId);
  const { init, setPlayhead, undo, redo, markSaved, setAspect } = useVideoStore();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("Untitled video");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [activeTool, setActiveTool] = useState("media");
  const [exportOpen, setExportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [busyAI, setBusyAI] = useState<string | null>(null);
  const [mediaVersion, setMediaVersion] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const creatingRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const gainsRef = useRef<Map<string, GainNode>>(new Map());
  const rafRef = useRef<number | null>(null);
  const drawRafRef = useRef<number | null>(null);
  const autosaveRef = useRef<number | null>(null);
  const projectRef = useRef<ProjectRecord | null>(null);
  const saveStateMounted = useRef(true);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await getProject(projectId);
      if (cancelled) return;
      if (!found || found.mode !== "video" || !found.video) {
        setNotFound(true);
        return;
      }
      setProject(found);
      projectRef.current = found;
      setName(found.name);
      init(found.video);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    return () => {
      saveStateMounted.current = false;
    };
  }, []);

  const dimensions = useMemo(() => previewDims(doc.aspect), [doc.aspect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    drawAt(useVideoStore.getState().playhead);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions.width, dimensions.height]);

  const drawAt = useCallback((time: number, target?: HTMLCanvasElement) => {
    const canvas = target ?? canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const currentDoc = useVideoStore.getState().doc;
    renderVideoFrame(ctx, currentDoc, time, canvas.width, canvas.height, (clip) => {
      if (clip.kind === "video") return videosRef.current.get(clip.id) ?? null;
      if (clip.kind === "image") return clip.assetId ? imagesRef.current.get(clip.assetId) ?? null : null;
      return null;
    });
  }, []);

  const requestDraw = useCallback(() => {
    if (drawRafRef.current) return;
    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = null;
      if (!useVideoStore.getState().playing) drawAt(useVideoStore.getState().playhead);
    });
  }, [drawAt]);

  async function ensureClipElement(clip: VideoClip): Promise<void> {
    if (!clip.assetId) return;
    if (clip.kind === "video") {
      if (videosRef.current.has(clip.id) || creatingRef.current.has(`v:${clip.id}`)) return;
      creatingRef.current.add(`v:${clip.id}`);
      const url = await getAssetUrl(clip.assetId);
      creatingRef.current.delete(`v:${clip.id}`);
      if (!url || videosRef.current.has(clip.id)) return;
      const video = document.createElement("video");
      video.preload = "auto";
      video.playsInline = true;
      video.muted = false;
      video.volume = 1;
      video.crossOrigin = "anonymous";
      video.src = url;
      video.addEventListener("loadeddata", () => {
        setMediaVersion((v) => v + 1);
        requestDraw();
      });
      video.addEventListener("seeked", requestDraw);
      videosRef.current.set(clip.id, video);
      try {
        video.currentTime = clip.inPoint;
      } catch {
        /* noop */
      }
      return;
    }
    if (clip.kind === "audio") {
      if (audiosRef.current.has(clip.id) || creatingRef.current.has(`a:${clip.id}`)) return;
      creatingRef.current.add(`a:${clip.id}`);
      const url = await getAssetUrl(clip.assetId);
      creatingRef.current.delete(`a:${clip.id}`);
      if (!url || audiosRef.current.has(clip.id)) return;
      const audio = document.createElement("audio");
      audio.preload = "auto";
      audio.volume = 1;
      audio.crossOrigin = "anonymous";
      audio.src = url;
      audio.addEventListener("loadeddata", () => setMediaVersion((v) => v + 1));
      audiosRef.current.set(clip.id, audio);
      return;
    }
    if (clip.kind === "image") {
      if (imagesRef.current.has(clip.assetId) || creatingRef.current.has(`i:${clip.assetId}`)) return;
      creatingRef.current.add(`i:${clip.assetId}`);
      const url = await getAssetUrl(clip.assetId);
      creatingRef.current.delete(`i:${clip.assetId}`);
      if (!url || imagesRef.current.has(clip.assetId)) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.addEventListener("load", () => {
        setMediaVersion((v) => v + 1);
        requestDraw();
      });
      imagesRef.current.set(clip.assetId, img);
    }
  }

  useEffect(() => {
    const clips = doc.clips;
    const videoIds = new Set(clips.filter((c) => c.kind === "video").map((c) => c.id));
    const audioIds = new Set(clips.filter((c) => c.kind === "audio").map((c) => c.id));
    const imageIds = new Set(clips.filter((c) => c.kind === "image" && c.assetId).map((c) => c.assetId!));
    for (const [id, el] of videosRef.current) {
      if (!videoIds.has(id)) {
        el.pause();
        el.src = "";
        videosRef.current.delete(id);
        gainsRef.current.delete(id);
      }
    }
    for (const [id, el] of audiosRef.current) {
      if (!audioIds.has(id)) {
        el.pause();
        el.src = "";
        audiosRef.current.delete(id);
        gainsRef.current.delete(id);
      }
    }
    for (const [id] of imagesRef.current) {
      if (!imageIds.has(id)) imagesRef.current.delete(id);
    }
    clips.forEach((clip) => {
      if (clip.assetId) ensureClipElement(clip);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.clips]);

  function ensureAudioGraph(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = mutedRef.current ? 0 : 1;
      master.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterRef.current = master;
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => undefined);
    }
    return audioCtxRef.current;
  }

  function connectElement(key: string, el: HTMLMediaElement): GainNode | null {
    const existing = gainsRef.current.get(key);
    if (existing) return existing;
    const ctx = ensureAudioGraph();
    if (!ctx || !masterRef.current) return null;
    try {
      const source = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(masterRef.current);
      gainsRef.current.set(key, gain);
      return gain;
    } catch {
      return null;
    }
  }

  function gainFor(clip: VideoClip, currentDoc: VideoDoc, time: number, helper = false) {
    const track = currentDoc.tracks.find((t) => t.id === clip.trackId);
    if (helper || muted || clip.muted || track?.muted) return 0;
    let gain = clip.volume / 100;
    const local = time - clip.start;
    if (clip.fadeIn > 0 && local < clip.fadeIn) gain *= Math.max(0, local / clip.fadeIn);
    if (clip.fadeOut > 0) {
      const remain = clip.duration - local;
      if (remain < clip.fadeOut) gain *= Math.max(0, remain / clip.fadeOut);
    }
    return Math.max(0, Math.min(1.5, gain));
  }

  function expectedSourceTime(clip: VideoClip, time: number) {
    return Math.max(0, clip.inPoint + Math.max(0, time - clip.start) * clip.speed);
  }

  function syncPlayback(time: number, currentDoc: VideoDoc) {
    const helpers = new Set<string>();
    for (const clip of currentDoc.clips) {
      if (clip.transitionIn.type === "none") continue;
      if (time < clip.start || time > clip.start + clip.transitionIn.duration) continue;
      const prev = getPreviousClip(currentDoc.clips, clip);
      if (prev) helpers.add(prev.id);
    }
    for (const clip of currentDoc.clips) {
      const track = currentDoc.tracks.find((t) => t.id === clip.trackId);
      const active = !track?.hidden && time >= clip.start && time < clip.start + clip.duration;
      const helper = helpers.has(clip.id);
      if (clip.kind === "video") {
        const el = videosRef.current.get(clip.id);
        if (!el) continue;
        const gain = connectElement(clip.id, el);
        if (clip.effect === "freeze" && active) {
          el.pause();
          try {
            el.currentTime = clip.inPoint;
          } catch {
            /* noop */
          }
          if (gain) gain.gain.value = 0;
          continue;
        }
        if (active || helper) {
          if (helper) {
            el.pause();
            try {
              el.currentTime = Math.max(0, clip.inPoint + clip.duration * clip.speed - 0.05);
            } catch {
              /* noop */
            }
            if (gain) gain.gain.value = 0;
            continue;
          }
          if (el.playbackRate !== clip.speed) el.playbackRate = Math.max(0.1, clip.speed);
          const expected = expectedSourceTime(clip, time);
          if (Math.abs(el.currentTime - expected) > 0.35) {
            try {
              el.currentTime = expected;
            } catch {
              /* noop */
            }
          }
          if (el.paused) el.play().catch(() => undefined);
          if (gain) gain.gain.value = gainFor(clip, currentDoc, time);
        } else {
          if (!el.paused) el.pause();
          if (gain) gain.gain.value = 0;
        }
      } else if (clip.kind === "audio") {
        const el = audiosRef.current.get(clip.id);
        if (!el) continue;
        const gain = connectElement(clip.id, el);
        if (active) {
          const expected = expectedSourceTime(clip, time);
          if (Math.abs(el.currentTime - expected) > 0.35) {
            try {
              el.currentTime = expected;
            } catch {
              /* noop */
            }
          }
          if (el.playbackRate !== clip.speed) el.playbackRate = Math.max(0.1, clip.speed);
          if (el.paused) el.play().catch(() => undefined);
          if (gain) gain.gain.value = gainFor(clip, currentDoc, time);
        } else {
          if (!el.paused) el.pause();
          if (gain) gain.gain.value = 0;
        }
      }
    }
  }

  function pauseAllMedia() {
    videosRef.current.forEach((el) => el.pause());
    audiosRef.current.forEach((el) => el.pause());
    gainsRef.current.forEach((gain) => {
      gain.gain.value = 0;
    });
  }

  function seekMedia(time: number) {
    const currentDoc = useVideoStore.getState().doc;
    videosRef.current.forEach((el) => el.pause());
    audiosRef.current.forEach((el) => el.pause());
    for (const clip of currentDoc.clips) {
      if (time >= clip.start && time < clip.start + clip.duration) {
        const el = clip.kind === "video" ? videosRef.current.get(clip.id) : clip.kind === "audio" ? audiosRef.current.get(clip.id) : null;
        if (el) {
          try {
            el.currentTime = expectedSourceTime(clip, time);
          } catch {
            /* noop */
          }
        }
      }
    }
    gainsRef.current.forEach((gain) => {
      gain.gain.value = 0;
    });
  }

  useEffect(() => {
    const update = () => {
      const state = useVideoStore.getState();
      if (!state.playing) {
        seekMedia(state.playhead);
        drawAt(state.playhead);
      }
    };
    update();
    const unsub = useVideoStore.subscribe((state, prev) => {
      if (!state.playing && (state.playhead !== prev.playhead || state.doc !== prev.doc || state.playing !== prev.playing)) {
        seekMedia(state.playhead);
        drawAt(state.playhead);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawAt]);

  useEffect(() => {
    drawAt(useVideoStore.getState().playhead);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaVersion, dimensions.width, dimensions.height, doc]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      pauseAllMedia();
      return;
    }
    if (muted) {
      /* gains still respect volume; master muted via element mute below */
    }
    const state = useVideoStore.getState();
    const duration = Math.max(0.2, computeDuration(state.doc.clips));
    let startTime = state.playhead;
    if (startTime >= duration - 0.05) {
      startTime = 0;
      state.setPlayhead(0);
    }
    const wall = performance.now();
    let lastStore = 0;
    syncPlayback(startTime, state.doc);
    const tick = () => {
      const st = useVideoStore.getState();
      if (!st.playing) return;
      const t = startTime + (performance.now() - wall) / 1000;
      if (t >= duration) {
        pauseAllMedia();
        st.setPlayhead(duration);
        st.setPlaying(false);
        drawAt(duration);
        return;
      }
      syncPlayback(t, st.doc);
      drawAt(t);
      if (performance.now() - lastStore > 70) {
        st.setPlayhead(t);
        lastStore = performance.now();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      pauseAllMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    mutedRef.current = muted;
    if (masterRef.current && audioCtxRef.current) {
      masterRef.current.gain.setTargetAtTime(muted ? 0 : 1, audioCtxRef.current.currentTime, 0.05);
    }
  }, [muted]);

  const save = useCallback(
    async (silent = false) => {
      const current = projectRef.current;
      if (!current) return;
      setSaveState("saving");
      try {
        const docNow = useVideoStore.getState().doc;
        const firstAsset = docNow.clips.find((c) => c.assetId)?.assetId;
        const thumb =
          canvasRef.current && docNow.clips.length
            ? canvasRef.current.toDataURL("image/jpeg", 0.6)
            : firstAsset
              ? (useProjectStore.getState().assets.find((a) => a.id === firstAsset)?.thumbnail ?? current.thumbnail)
              : current.thumbnail;
        const updated: ProjectRecord = {
          ...current,
          name,
          aspect: docNow.aspect,
          video: { ...docNow },
          thumbnail: thumb,
          updatedAt: Date.now(),
        };
        await saveProject(updated);
        setProject(updated);
        projectRef.current = updated;
        markSaved();
        setSaveState("saved");
        if (!silent) toast.success("Project saved");
      } catch (error) {
        setSaveState("error");
        toast.error(`Save failed: ${(error as Error).message}`);
      }
    },
    [name, saveProject, markSaved]
  );

  useEffect(() => {
    if (!dirty || !projectRef.current) return;
    setSaveState("dirty");
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => save(true), 1800);
    return () => {
      if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (typing) return;
      if (e.code === "Space") {
        e.preventDefault();
        useVideoStore.getState().setPlaying(!useVideoStore.getState().playing);
      } else if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        useVideoStore.getState().splitSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const clip = useVideoStore.getState().doc.clips.find((c) => c.id === useVideoStore.getState().selectedClipId);
        if (clip) {
          e.preventDefault();
          useVideoStore.getState().removeClip(clip.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  useEffect(() => {
    const videos = videosRef.current;
    const audios = audiosRef.current;
    const images = imagesRef.current;
    return () => {
      pauseAllMedia();
      videos.clear();
      audios.clear();
      images.clear();
    };
  }, []);

  function addAsset(asset: MediaAsset) {
    const state = useVideoStore.getState();
    const currentDoc = state.doc;
    const isAudio = asset.kind === "audio";
    const track =
      currentDoc.tracks.find((t) => t.id === (isAudio ? "track_audio" : "track_video")) ??
      currentDoc.tracks.find((t) => (isAudio ? t.type === "audio" : t.type === "video"));
    if (!track) return;
    let start = state.playhead;
    let guard = 0;
    while (guard++ < 50) {
      const overlap = currentDoc.clips.find(
        (c) => c.trackId === track.id && start < c.start + c.duration && start + 0.2 > c.start
      );
      if (!overlap) break;
      start = overlap.start + overlap.duration;
    }
    const duration = asset.kind === "image" ? 4 : Math.min(Math.max(asset.duration ?? 5, 1), 120);
    const clip = createMediaClip(track.id, asset.id, asset.name, asset.kind as "video" | "image" | "audio", Math.round(start * 100) / 100, duration);
    clip.transitionIn = { type: "none", duration: 0.5 };
    if (clip.kind === "audio") clip.volume = 80;
    state.snapshot();
    state.addClip(clip);
    state.setPlayhead(start);
    toast.success(`${asset.name} added to the timeline`);
  }

  function addTextAtPlayhead(presetId: string | null, variant: "title" | "subtitle") {
    const state = useVideoStore.getState();
    const track = state.doc.tracks.find((t) => t.type === "text");
    if (!track) return;
    const preset = TEXT_STYLE_PRESETS.find((p) => p.id === presetId);
    const style = {
      ...DEFAULT_TEXT_STYLE,
      ...(preset?.style ?? {}),
      fontSize: variant === "subtitle" ? 32 : preset?.style.fontSize ?? 64,
    };
    const clip = createTextClip(
      track.id,
      Math.round(state.playhead * 100) / 100,
      variant === "subtitle" ? "Your subtitle here" : preset?.preview === "Aa" ? "Your text" : preset ? preset.name : "Your title",
      variant === "subtitle" ? 3 : 4,
      style
    );
    clip.animation = preset?.animation ?? "fade";
    clip.x = 0;
    clip.y = variant === "subtitle" ? 30 : 0;
    state.snapshot();
    state.addClip(clip);
    state.setPlaying(false);
    state.selectClip(clip.id);
    toast.success("Text clip added");
  }

  function applyTemplate(templateId: string) {
    const template = STUDIO_TEMPLATES.find((t) => t.id === templateId);
    if (!template || template.mode !== "video") return;
    const built = buildTemplateVideo(template);
    const state = useVideoStore.getState();
    const mediaClips = state.doc.clips.filter((c) => c.kind !== "text");
    const merged: VideoDoc = {
      ...state.doc,
      aspect: template.aspect,
      background: template.background ?? state.doc.background,
      clips: [...mediaClips, ...built.clips.filter((c) => c.kind === "text")],
      tracks: state.doc.tracks.length ? state.doc.tracks : built.tracks,
      template: template.id,
    };
    state.setDoc(merged);
    toast.success(`Template “${template.name}” applied`);
  }

  async function sampleStats() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8)
    );
    if (!blob) return null;
    return analyzeImageStats(blob);
  }

  async function handleAITool(tool: AITool) {
    setBusyAI(tool.id);
    try {
      const state = useVideoStore.getState();
      const target = state.doc.clips.find((c) => c.id === state.selectedClipId && c.kind !== "text");
      const clips = target ? [target] : state.doc.clips.filter((c) => c.kind === "video" || c.kind === "image");
      if (tool.id === "auto-enhance" || tool.id === "auto-color") {
        const stats = await sampleStats();
        if (!stats) {
          toast.error("Move the playhead over a visible clip first");
          return;
        }
        const suggestion = tool.id === "auto-enhance" ? suggestAutoEnhance(stats) : suggestAutoColor(stats);
        state.snapshot();
        for (const clip of clips) {
          state.updateClip(clip.id, { adjustments: { ...clip.adjustments, ...suggestion } }, false);
        }
        toast.success(tool.id === "auto-enhance" ? "Auto enhance applied to clips" : "White balance corrected");
        return;
      }
      if (tool.id === "denoise" || tool.id === "sharpness") {
        state.snapshot();
        for (const clip of clips) {
          state.updateClip(
            clip.id,
            {
              adjustments: {
                ...clip.adjustments,
                ...(tool.id === "denoise" ? { blur: 6, sharpness: 18 } : { sharpness: 38 }),
              },
            },
            false
          );
        }
        toast.success(tool.kind === "local" ? `${tool.name} applied locally` : "Applied");
        return;
      }
      const remote = await runRemoteAI({ task: tool.id, prompt: tool.name });
      toast.info(remote.message);
      if (!remote.ok) setAiOpen(true);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusyAI(null);
    }
  }

  function applyPrompt(intent: AIIntent, prompt: string) {
    if (intent.needsProvider) {
      toast.error(`${intent.needsProvider} requires an AI provider API key.`);
      setAiOpen(true);
      return;
    }
    const state = useVideoStore.getState();
    state.snapshot();
    if (intent.aspect) setAspect(intent.aspect);
    if (intent.filterId) {
      for (const clip of state.doc.clips) {
        if (clip.kind === "video" || clip.kind === "image") {
          state.updateClip(clip.id, { filterId: intent.filterId }, false);
        }
      }
    }
    if (Object.keys(intent.adjustments).length) {
      for (const clip of state.doc.clips) {
        if (clip.kind !== "video" && clip.kind !== "image") continue;
        const merged = { ...clip.adjustments };
        for (const [key, value] of Object.entries(intent.adjustments)) {
          const k = key as keyof typeof merged;
          merged[k] = Math.max(-100, Math.min(100, (merged[k] ?? 0) + Number(value ?? 0)));
        }
        state.updateClip(clip.id, { adjustments: merged }, false);
      }
    }
    if (intent.speed) {
      const target = state.doc.clips.find((c) => c.id === state.selectedClipId);
      if (target) state.updateClip(target.id, { speed: intent.speed }, false);
    }
    if (intent.addSubtitles) {
      addTextAtPlayhead("subtitle", "subtitle");
    }
    toast.success(intent.summary || "Prompt applied");
    void prompt;
  }

  async function ensureAllElements(clips: VideoClip[]) {
    await Promise.all(clips.filter((c) => c.assetId).map((c) => ensureClipElement(c)));
    setMediaVersion((v) => v + 1);
  }

  async function handleExport(config: VideoExportConfig, onProgress: (p: number) => void) {
    setExporting(true);
    try {
      const state = useVideoStore.getState();
      state.setPlaying(false);
      pauseAllMedia();
      const currentDoc = state.doc;
      const duration = Math.max(0.4, computeDuration(currentDoc.clips));
      await ensureAllElements(currentDoc.clips);
      if (document.fonts?.ready) await document.fonts.ready;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = config.width;
      exportCanvas.height = config.height;
      const ctx = ensureAudioGraph();
      let dest: MediaStreamAudioDestinationNode | null = null;
      const previousGain = masterRef.current?.gain.value ?? 1;
      if (masterRef.current) masterRef.current.gain.value = 1;
      if (ctx && masterRef.current) {
        dest = ctx.createMediaStreamDestination();
        masterRef.current.connect(dest);
      }
      for (const clip of currentDoc.clips) {
        if (clip.kind === "video") {
          const el = videosRef.current.get(clip.id);
          if (el) connectElement(clip.id, el);
        } else if (clip.kind === "audio") {
          const el = audiosRef.current.get(clip.id);
          if (el) connectElement(clip.id, el);
        }
      }
      let expRaf = 0;
      let wallStart = 0;
      const drawExport = () => {
        const t = (performance.now() - wallStart) / 1000;
        syncPlayback(t, useVideoStore.getState().doc);
        drawAt(t, exportCanvas);
        if (t < duration + 0.5) expRaf = requestAnimationFrame(drawExport);
      };
      const result = await recordTimeline({
        canvas: exportCanvas,
        fps: config.fps,
        duration,
        audioStream: dest?.stream ?? null,
        preferMp4: config.preferMp4,
        videoBitsPerSecond: config.bitrate,
        onProgress,
        onStart: () => {
          wallStart = performance.now();
          syncPlayback(0, useVideoStore.getState().doc);
          expRaf = requestAnimationFrame(drawExport);
        },
        onStop: () => {
          if (expRaf) cancelAnimationFrame(expRaf);
          pauseAllMedia();
        },
      });
      if (dest && masterRef.current) {
        try {
          masterRef.current.disconnect(dest);
        } catch {
          /* noop */
        }
      }
      if (masterRef.current) masterRef.current.gain.value = mutedRef.current ? 0 : previousGain;
      useVideoStore.getState().setPlayhead(0);
      drawAt(0);
      toast.success("Recording complete");
      return { blob: result.blob, extension: result.extension, width: config.width, height: config.height };
    } finally {
      setExporting(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Film className="size-8 text-muted" />
        <p className="text-sm font-medium">Video project not found</p>
        <p className="text-xs text-muted">It may have been deleted from this browser.</p>
        <Button onClick={() => router.push("/")}>Back to studio</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#08090d]">
      <EditorTopBar
        mode="video"
        name={name}
        onRename={(v) => {
          setName(v);
          setSaveState("dirty");
        }}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onSave={() => save()}
        onExport={() => setExportOpen(true)}
        onPreview={() => {
          previewWrapRef.current?.requestFullscreen?.().catch(() => undefined);
        }}
        saveState={saveState}
      />

      <div className="flex min-h-0 flex-1">
        <LeftRail items={RAIL} active={activeTool} onChange={setActiveTool} />

        <aside className="hidden w-[286px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0d13] lg:flex">
          <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              {RAIL.find((r) => r.id === activeTool)?.label}
            </span>
            <span className="text-[9px] text-muted">Video</span>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <VideoToolPanel
              tool={activeTool}
              onAddAsset={addAsset}
              onAddText={addTextAtPlayhead}
              onAITool={handleAITool}
              onApplyPrompt={applyPrompt}
              onOpenSettings={() => setAiOpen(true)}
              onApplyTemplate={applyTemplate}
              busyAI={busyAI}
              onSelectTool={setActiveTool}
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-2 text-[10px] text-muted">
                <span className="flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5">
                  <MonitorPlay className="size-3" /> {doc.aspect}
                </span>
                <span>{doc.clips.length} clips</span>
                <span>·</span>
                <span>{doc.fps} fps preview</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Select value={doc.aspect} onValueChange={setAspect}>
                  <SelectTrigger className="h-6 w-[150px] text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 · YouTube</SelectItem>
                    <SelectItem value="9:16">9:16 · Reels / Shorts</SelectItem>
                    <SelectItem value="1:1">1:1 · Instagram</SelectItem>
                    <SelectItem value="4:5">4:5 · Portrait</SelectItem>
                    <SelectItem value="21:9">21:9 · Cinematic</SelectItem>
                  </SelectContent>
                </Select>
                <IconButton label={muted ? "Unmute" : "Mute preview"} onClick={() => setMuted((m) => !m)}>
                  {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                </IconButton>
              </div>
            </div>
            <div ref={previewWrapRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#07080c] p-3">
              <div className="relative flex max-h-full max-w-full items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  className="max-h-full max-w-full rounded-lg object-contain shadow-2xl shadow-black/60 ring-1 ring-white/10"
                />
                {doc.clips.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg text-center">
                    <Film className="size-7 text-muted" />
                    <p className="text-xs font-medium text-zinc-300">Empty timeline</p>
                    <p className="max-w-[220px] text-[10px] text-muted">
                      Add photos or video from the library, then edit on the timeline below.
                    </p>
                  </div>
                )}
                {exporting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/60 backdrop-blur-sm">
                    <Loader2 className="size-6 animate-spin text-violet-300" />
                    <p className="text-[11px] text-zinc-200">Rendering your video…</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex h-11 shrink-0 items-center justify-center gap-2 border-t border-white/[0.05]">
              <IconButton label="Go to start" onClick={() => setPlayhead(0)}>
                <SkipBack className="size-4" />
              </IconButton>
              <IconButton label="Previous frame" onClick={() => setPlayhead(useVideoStore.getState().playhead - 1 / doc.fps)}>
                <StepBack className="size-4" />
              </IconButton>
              <button
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause" : "Play"}
                onClick={() => {
                  const state = useVideoStore.getState();
                  if (!state.playing) ensureAudioGraph();
                  state.setPlaying(!state.playing);
                }}
                className="flex size-9 items-center justify-center rounded-full gradient-accent text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
              </button>
              <IconButton label="Next frame" onClick={() => setPlayhead(useVideoStore.getState().playhead + 1 / doc.fps)}>
                <StepForward className="size-4" />
              </IconButton>
              <IconButton label="Go to end" onClick={() => setPlayhead(computeDuration(doc.clips))}>
                <SkipForward className="size-4" />
              </IconButton>
              <div className="ml-2 rounded-md bg-white/[0.04] px-2 py-1">
                <TimeDisplay duration={computeDuration(doc.clips)} />
              </div>
            </div>
          </div>

          <div className="h-[252px] shrink-0 border-t border-white/[0.06]">
            <Timeline onAddText={() => addTextAtPlayhead(null, "title")} />
          </div>
        </main>

        <aside className="hidden w-[300px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0b0d13] xl:flex">
          <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Properties</span>
            <span className="text-[9px] text-muted">{selectedClipId ? "Clip" : "Project"}</span>
          </div>
          <div className="min-h-0 flex-1">
            <VideoInspector />
          </div>
        </aside>
      </div>

      <VideoExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        aspect={doc.aspect}
        title={name}
        duration={Math.max(0.4, computeDuration(doc.clips))}
        fps={doc.fps}
        onExport={handleExport}
      />
      <AISettingsDialog open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
}

function TimeDisplay({ duration }: { duration: number }) {
  const playhead = useVideoStore((s) => s.playhead);
  return (
    <span className="font-mono text-[10px] text-zinc-300">
      {formatTime(playhead, true)} <span className="text-muted/70">/ {formatTime(duration, true)}</span>
    </span>
  );
}
