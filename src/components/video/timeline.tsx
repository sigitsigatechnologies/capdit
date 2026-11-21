"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Scissors,
  Copy,
  Trash2,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Type,
  Film,
  ImageIcon,
  Music2,
  Clock,
  ChevronsLeft,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useVideoStore } from "@/store/video";
import { useProjectStore } from "@/store/projects";
import { getAssetBlob, generateWaveform } from "@/lib/media";
import { computeDuration, createMediaClip, snapTo } from "@/lib/video";
import type { MediaAsset, VideoClip, VideoTrack } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { IconButton } from "@/components/ui/shell";

const TRACK_HEIGHT: Record<VideoTrack["type"], number> = {
  video: 54,
  overlay: 46,
  text: 40,
  audio: 42,
  image: 54,
};

const CLIP_COLORS: Record<string, string> = {
  video: "from-blue-600/70 to-blue-900/70 border-blue-400/40",
  image: "from-emerald-600/70 to-emerald-900/70 border-emerald-400/40",
  audio: "from-cyan-600/60 to-cyan-900/70 border-cyan-400/40",
  text: "from-violet-600/70 to-violet-900/70 border-violet-400/40",
};

const waveformCache = new Map<string, number[]>();

function canHost(trackType: VideoTrack["type"], kind: VideoClip["kind"]): boolean {
  if (kind === "text") return trackType === "text";
  if (kind === "audio") return trackType === "audio";
  return trackType === "video" || trackType === "overlay";
}

export function Timeline({ onAddText }: { onAddText?: () => void }) {
  const doc = useVideoStore((s) => s.doc);
  const playhead = useVideoStore((s) => s.playhead);
  const playing = useVideoStore((s) => s.playing);
  const zoom = useVideoStore((s) => s.zoom);
  const snap = useVideoStore((s) => s.snap);
  const selectedClipId = useVideoStore((s) => s.selectedClipId);
  const {
    setPlayhead,
    selectClip,
    addClip,
    removeClip,
    duplicateClip,
    splitSelected,
    setZoom,
    setSnap,
    snapshot,
    updateTrack,
  } = useVideoStore();
  const assets = useProjectStore((s) => s.assets);
  const [waveforms, setWaveforms] = useState<Record<string, number[]>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const pps = 52 * zoom;
  const duration = Math.max(computeDuration(doc.clips) + 2, 16);
  const width = duration * pps;
  const selected = doc.clips.find((c) => c.id === selectedClipId) ?? null;

  const assetMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  const waveformKey = doc.clips
    .filter((c) => c.kind === "audio" && c.assetId)
    .map((c) => c.assetId)
    .join(",");

  useEffect(() => {
    let cancelled = false;
    const ids = Array.from(new Set(waveformKey ? waveformKey.split(",") : []));
    ids.forEach(async (id) => {
      if (!id || waveformCache.has(id)) {
        if (id && waveformCache.has(id)) setWaveforms((w) => ({ ...w, [id]: waveformCache.get(id)! }));
        return;
      }
      const blob = await getAssetBlob(id);
      if (!blob) return;
      const peaks = await generateWaveform(blob, 300);
      if (cancelled) return;
      waveformCache.set(id, peaks);
      setWaveforms((w) => ({ ...w, [id]: peaks }));
    });
    return () => {
      cancelled = true;
    };
  }, [waveformKey]);

  const timeFromEvent = useCallback(
    (clientX: number) => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      return Math.max(0, (clientX - rect.left) / pps);
    },
    [pps]
  );

  function seek(e: React.PointerEvent) {
    const time = timeFromEvent(e.clientX);
    setPlayhead(time);
    if (playing) useVideoStore.getState().setPlaying(false);
  }

  function startScrub(e: React.PointerEvent) {
    e.preventDefault();
    if (useVideoStore.getState().playing) useVideoStore.getState().setPlaying(false);
    const move = (ev: PointerEvent) => setPlayhead(timeFromEvent(ev.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    move(e.nativeEvent);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startClipDrag(
    e: React.PointerEvent,
    clip: VideoClip,
    mode: "move" | "left" | "right"
  ) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const track = doc.tracks.find((t) => t.id === clip.trackId);
    if (track?.locked) {
      toast.info("Track is locked");
      return;
    }
    selectClip(clip.id);
    let snapshotted = false;
    const ensureSnapshot = () => {
      if (!snapshotted) {
        snapshot();
        snapshotted = true;
      }
    };
    const startX = e.clientX;
    const orig = { ...clip };
    const state = useVideoStore.getState();
    const points = state.doc.clips
      .filter((c) => c.id !== clip.id)
      .flatMap((c) => [c.start, c.start + c.duration])
      .concat([0, state.playhead]);
    const asset = orig.assetId ? assetMap.get(orig.assetId) : undefined;
    const sourceDuration = asset?.duration ?? 0;
    let moved = false;
    document.body.style.cursor = mode === "move" ? "grabbing" : "ew-resize";

    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - startX) / pps;
      if (Math.abs(dt) < 0.004) return;
      moved = true;
      ensureSnapshot();
      if (mode === "move") {
        let nextStart = Math.max(0, orig.start + dt);
        if (snap) nextStart = snapTo(nextStart, points);
        if (snap) {
          const snappedEnd = snapTo(nextStart + orig.duration, points);
          if (Math.abs(snappedEnd - (nextStart + orig.duration)) < 0.08) nextStart = snappedEnd - orig.duration;
        }
        const patch: Partial<VideoClip> = { start: Math.max(0, Math.round(nextStart * 100) / 100) };
        const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-track-id]") as HTMLElement | null;
        const targetTrack = el?.dataset.trackId;
        if (targetTrack && targetTrack !== orig.trackId) {
          const target = useVideoStore.getState().doc.tracks.find((t) => t.id === targetTrack);
          if (target && !target.locked && canHost(target.type, orig.kind)) patch.trackId = targetTrack;
        }
        useVideoStore.getState().updateClip(clip.id, patch, false);
      } else if (mode === "left") {
        let delta = dt;
        delta = Math.max(delta, -orig.inPoint / Math.max(0.1, orig.speed));
        delta = Math.min(delta, orig.duration - 0.15);
        if (snap) {
          const snapped = snapTo(orig.start + delta, points) - orig.start;
          if (Math.abs(snapped - delta) < 0.08) delta = snapped;
        }
        const newStart = Math.max(0, orig.start + delta);
        const actualDelta = newStart - orig.start;
        useVideoStore.getState().updateClip(
          clip.id,
          {
            start: Math.round(newStart * 100) / 100,
            duration: Math.max(0.15, orig.duration - actualDelta),
            inPoint: Math.max(0, orig.inPoint + actualDelta * orig.speed),
          },
          false
        );
      } else {
        let maxDuration = Infinity;
        if (sourceDuration > 0 && (orig.kind === "video" || orig.kind === "audio")) {
          maxDuration = (sourceDuration - orig.inPoint) / Math.max(0.1, orig.speed);
        }
        let newDuration = Math.min(orig.duration + dt, maxDuration);
        newDuration = Math.max(0.15, newDuration);
        if (snap) {
          const snapped = snapTo(orig.start + newDuration, points) - orig.start;
          if (Math.abs(snapped - newDuration) < 0.08) newDuration = snapped;
          newDuration = Math.min(Math.max(0.15, newDuration), maxDuration);
        }
        useVideoStore.getState().updateClip(
          clip.id,
          { duration: Math.round(newDuration * 100) / 100 },
          false
        );
      }
    };
    const up = () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      void moved;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function handleDrop(e: React.DragEvent, track: VideoTrack) {
    e.preventDefault();
    e.stopPropagation();
    const assetId = e.dataTransfer.getData("application/x-capdit-asset");
    if (!assetId) return;
    const asset = assetMap.get(assetId);
    if (!asset) return;
    const time = timeFromEvent(e.clientX);
    const isAudio = asset.kind === "audio";
    let kind: VideoClip["kind"] = isAudio ? "audio" : asset.kind === "image" ? "image" : "video";
    if (track.type === "audio" && !isAudio) {
      if (asset.kind === "video") kind = "audio";
      else {
        toast.error("Audio tracks only accept audio or video audio");
        return;
      }
    }
    if (!canHost(track.type, kind)) {
      toast.error(`${track.name} track can't host ${kind} clips`);
      return;
    }
    const baseDuration = asset.kind === "image" ? 4 : Math.min(Math.max(asset.duration ?? 5, 1), 120);
    const clip = createMediaClip(track.id, asset.id, asset.name, kind as "video" | "image" | "audio", Math.max(0, Math.round(time * 100) / 100), baseDuration);
    clip.transitionIn = { type: "none", duration: 0.5 };
    snapshot();
    addClip(clip);
    toast.success(`${asset.name} added`);
  }

  function zoomToFit() {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.clientWidth / Math.max(8, computeDuration(doc.clips) + 2);
    setZoom(target / 52);
  }

  const rulerStep = pps > 140 ? 1 : pps > 80 ? 2 : pps > 40 ? 5 : pps > 20 ? 10 : 30;
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += rulerStep) ticks.push(t);

  return (
    <div className="flex h-full flex-col bg-[#0a0c11]">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-white/[0.06] px-2">
        <div className="flex items-center gap-1 text-[10px] text-muted">
          <Clock className="size-3" />
          <span className="font-mono text-zinc-300">{formatTime(playhead, true)}</span>
          <span className="text-muted/60">/ {formatTime(computeDuration(doc.clips), true)}</span>
        </div>
        <div className="mx-2 h-4 w-px bg-white/10" />
        <IconButton
          label="Split at playhead (S)"
          onClick={() => {
            if (selected) splitSelected();
            else toast.info("Select a clip to split");
          }}
          disabled={!selected}
        >
          <Scissors className="size-3.5" />
        </IconButton>
        <IconButton
          label="Duplicate clip"
          onClick={() => (selected ? duplicateClip(selected.id) : null)}
          disabled={!selected}
        >
          <Copy className="size-3.5" />
        </IconButton>
        <IconButton
          label="Delete clip"
          onClick={() => {
            if (selected) {
              removeClip(selected.id);
              toast.success("Clip removed");
            }
          }}
          disabled={!selected}
        >
          <Trash2 className="size-3.5 text-red-300/80" />
        </IconButton>
        <div className="mx-1 h-4 w-px bg-white/10" />
        <button
          onClick={() => setSnap(!snap)}
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition",
            snap ? "bg-violet-500/15 text-violet-200" : "text-muted hover:text-white"
          )}
          title="Toggle snapping"
        >
          <Magnet className="size-3" /> Snap
        </button>
        {onAddText && (
          <button
            onClick={onAddText}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted transition hover:text-white"
          >
            <Plus className="size-3" /> Text
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <IconButton label="Zoom out" onClick={() => setZoom(zoom / 1.25)}>
            <ZoomOut className="size-3.5" />
          </IconButton>
          <div className="w-20">
            <Slider
              value={[zoom * 100]}
              min={35}
              max={400}
              step={5}
              onValueChange={(v) => setZoom(v[0] / 100)}
            />
          </div>
          <IconButton label="Zoom in" onClick={() => setZoom(zoom * 1.25)}>
            <ZoomIn className="size-3.5" />
          </IconButton>
          <IconButton label="Fit timeline" onClick={zoomToFit}>
            <Maximize2 className="size-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-[112px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0c0e14]">
          <div className="flex h-6 items-center px-2 text-[9px] uppercase tracking-wider text-muted/70">Tracks</div>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {doc.tracks.map((track) => (
              <TrackHeader key={track.id} track={track} height={TRACK_HEIGHT[track.type]} onUpdate={updateTrack} />
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="scrollbar-thin relative flex-1 overflow-x-auto overflow-y-auto">
          <div ref={contentRef} className="relative" style={{ width }}>
            <div
              className="sticky top-0 z-20 h-6 cursor-ew-resize border-b border-white/[0.06] bg-[#0c0e14]/95 backdrop-blur"
              onPointerDown={startScrub}
            >
              {ticks.map((t) => (
                <div key={t} className="absolute top-0 h-full border-l border-white/10" style={{ left: t * pps }}>
                  <span className="ml-1 font-mono text-[8px] leading-6 text-muted/80">{formatTime(t)}</span>
                </div>
              ))}
            </div>

            <div className="relative">
              {doc.tracks.map((track) => {
                const height = TRACK_HEIGHT[track.type];
                const clips = doc.clips.filter((c) => c.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    data-track-id={track.id}
                    className={cn(
                      "relative border-b border-white/[0.04]",
                      track.hidden ? "opacity-50" : "",
                      track.type === "video" ? "bg-blue-950/[0.09]" : ""
                    )}
                    style={{ height }}
                    onPointerDown={(e) => {
                      if (e.target === e.currentTarget) seek(e);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => handleDrop(e, track)}
                  >
                    {track.type === "video" && clips.length === 0 && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-muted/50">
                        <span className="rounded border border-dashed border-white/10 px-3 py-1">
                          Drag video or image clips here
                        </span>
                      </div>
                    )}
                    {clips.map((clip) => {
                      const asset = clip.assetId ? assetMap.get(clip.assetId) : undefined;
                      const isSelected = clip.id === selectedClipId;
                      return (
                        <div
                          key={clip.id}
                          onPointerDown={(e) => startClipDrag(e, clip, "move")}
                          onDoubleClick={(e) => {
                            const time = timeFromEvent(e.clientX);
                            setPlayhead(time);
                            selectClip(clip.id);
                            splitSelected();
                            toast.success("Clip split");
                          }}
                          className={cn(
                            "group absolute top-1 flex flex-col overflow-hidden rounded-md border bg-gradient-to-b text-left shadow-md",
                            CLIP_COLORS[clip.kind] ?? CLIP_COLORS.video,
                            isSelected ? "z-10 ring-2 ring-violet-400" : "hover:brightness-110"
                          )}
                          style={{ left: clip.start * pps, width: Math.max(10, clip.duration * pps), height: height - 8 }}
                          title={`${clip.name} · ${formatTime(clip.duration, true)} · double-click to split`}
                        >
                          {asset?.thumbnail && clip.kind !== "text" && (
                            <div
                              className="absolute inset-0 bg-cover bg-center opacity-25"
                              style={{ backgroundImage: `url(${asset.thumbnail})` }}
                            />
                          )}
                          <div className="relative flex min-w-0 items-center gap-1 px-1.5 pt-0.5">
                            {clip.kind === "video" ? (
                              <Film className="size-2.5 shrink-0 text-white/80" />
                            ) : clip.kind === "image" ? (
                              <ImageIcon className="size-2.5 shrink-0 text-white/80" />
                            ) : clip.kind === "audio" ? (
                              <Music2 className="size-2.5 shrink-0 text-white/80" />
                            ) : (
                              <Type className="size-2.5 shrink-0 text-white/80" />
                            )}
                            <span className="truncate text-[9px] font-medium text-white/90">{clip.name}</span>
                            {clip.speed !== 1 && (
                              <span className="shrink-0 rounded bg-black/40 px-1 text-[8px] text-white/80">{clip.speed}x</span>
                            )}
                            {clip.effect && (
                              <span className="shrink-0 rounded bg-amber-400/25 px-1 text-[8px] text-amber-100">FX</span>
                            )}
                            {clip.transitionIn.type !== "none" && (
                              <span className="shrink-0 rounded bg-white/20 px-1 text-[8px] text-white/80">T</span>
                            )}
                            {clip.muted && <VolumeX className="size-2.5 shrink-0 text-white/60" />}
                          </div>
                          {clip.kind === "text" && (
                            <p className="relative truncate px-1.5 text-[9px] leading-tight text-white/85">
                              {clip.text}
                            </p>
                          )}
                          {clip.kind === "audio" && clip.assetId && waveforms[clip.assetId] && (
                            <div className="relative flex flex-1 items-center gap-px overflow-hidden px-1 pb-0.5">
                              {waveforms[clip.assetId]
                                .slice(0, Math.max(24, Math.min(180, Math.round(clip.duration * pps / 3))))
                                .map((peak, i) => (
                                  <span
                                    key={i}
                                    className="min-w-px flex-1 rounded-sm bg-cyan-200/60"
                                    style={{ height: `${Math.max(8, peak * 90)}%` }}
                                  />
                                ))}
                            </div>
                          )}
                          <div className="relative mt-auto flex items-center justify-between px-1.5 pb-0.5 text-[8px] text-white/55">
                            <span>{formatTime(clip.duration, true)}</span>
                            {clip.filterId && <span className="uppercase">{clip.filterId}</span>}
                          </div>
                          <div
                            className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-white/0 transition group-hover:bg-white/30"
                            onPointerDown={(e) => startClipDrag(e, clip, "left")}
                          />
                          <div
                            className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-white/0 transition group-hover:bg-white/30"
                            onPointerDown={(e) => startClipDrag(e, clip, "right")}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {doc.clips.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-center">
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/30 px-4 py-2 text-center text-[10px] text-muted backdrop-blur">
                    Drop media from the library or add text to begin your timeline
                  </div>
                </div>
              )}

              <div
                className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-gradient-to-b from-violet-400 to-cyan-400"
                style={{ left: playhead * pps }}
              >
                <span className="absolute -left-1.5 -top-0.5 size-3 rotate-45 rounded-sm bg-violet-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackHeader({
  track,
  height,
  onUpdate,
}: {
  track: VideoTrack;
  height: number;
  onUpdate: (id: string, patch: Partial<VideoTrack>) => void;
}) {
  const Icon =
    track.type === "text" ? Type : track.type === "audio" ? Music2 : track.type === "overlay" ? ChevronsLeft : Film;
  const canMute = track.type !== "text";
  return (
    <div className="flex items-center gap-1 border-b border-white/[0.04] px-2" style={{ height }}>
      <Icon className="size-3 shrink-0 text-muted" />
      <span className="min-w-0 flex-1 truncate text-[9.5px] font-medium text-zinc-400">{track.name}</span>
      <div className="flex shrink-0 items-center">
        {canMute && (
          <button
            onClick={() => onUpdate(track.id, { muted: !track.muted })}
            className="p-0.5 text-muted transition hover:text-white"
            title={track.muted ? "Unmute track" : "Mute track"}
          >
            {track.muted ? <VolumeX className="size-2.5 text-red-300" /> : <Volume2 className="size-2.5" />}
          </button>
        )}
        <button
          onClick={() => onUpdate(track.id, { hidden: !track.hidden })}
          className="p-0.5 text-muted transition hover:text-white"
          title={track.hidden ? "Show track" : "Hide track"}
        >
          {track.hidden ? <EyeOff className="size-2.5 text-amber-300" /> : <Eye className="size-2.5" />}
        </button>
        <button
          onClick={() => onUpdate(track.id, { locked: !track.locked })}
          className="p-0.5 text-muted transition hover:text-white"
          title={track.locked ? "Unlock track" : "Lock track"}
        >
          {track.locked ? <Lock className="size-2.5 text-violet-300" /> : <Unlock className="size-2.5" />}
        </button>
      </div>
    </div>
  );
}
