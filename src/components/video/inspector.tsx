"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Trash2, RotateCcw, Scissors, Volume2, VolumeX, Film, Crop, Music2 } from "lucide-react";
import { useVideoStore } from "@/store/video";
import { useProjectStore } from "@/store/projects";
import { EFFECTS, FONT_FAMILIES, TEXT_ANIMATIONS, TRANSITIONS } from "@/lib/video";
import { FILTER_PRESETS } from "@/lib/presets";
import { TEXT_STYLE_PRESETS } from "@/lib/text-presets";
import type { ClipTransition, VideoClip } from "@/lib/types";
import { SliderRow } from "@/components/editor/slider-row";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@/components/ui/controls";
import { cn, formatTime } from "@/lib/utils";

const TABS = [
  { id: "clip", label: "Clip" },
  { id: "color", label: "Color" },
  { id: "effects", label: "FX" },
  { id: "audio", label: "Audio" },
  { id: "text", label: "Text" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function VideoInspector() {
  const doc = useVideoStore((s) => s.doc);
  const selectedClipId = useVideoStore((s) => s.selectedClipId);
  const { updateClip, snapshot, removeClip, duplicateClip, splitSelected, setAspect, setBackground, setFps } = useVideoStore();
  const assets = useProjectStore((s) => s.assets);
  const clip = doc.clips.find((c) => c.id === selectedClipId) ?? null;
  const asset = useMemo(() => assets.find((a) => a.id === clip?.assetId), [assets, clip?.assetId]);
  const [tab, setTab] = useState<TabId>("clip");
  const [customW, setCustomW] = useState("4");
  const [customH, setCustomH] = useState("3");
  const lastSnap = useRef(0);

  useEffect(() => {
    if (!clip) return;
    setTab(clip.kind === "text" ? "text" : "clip");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.id, clip?.kind]);

  function edit(patch: Partial<VideoClip>, record = false) {
    if (!clip) return;
    if (!record) {
      const now = Date.now();
      if (now - lastSnap.current > 600) {
        snapshot();
        lastSnap.current = now;
      }
    }
    updateClip(clip.id, patch, record);
  }

  function setSpeed(speed: number) {
    if (!clip) return;
    let duration = clip.duration;
    if (asset?.duration && (clip.kind === "video" || clip.kind === "audio")) {
      const available = Math.max(0.2, asset.duration - clip.inPoint);
      duration = Math.max(0.15, available / Math.max(0.1, speed));
    }
    edit({ speed, duration }, true);
  }

  function editAdjustment(key: keyof VideoClip["adjustments"], value: number) {
    if (!clip) return;
    edit({ adjustments: { ...clip.adjustments, [key]: value } });
  }

  if (!clip) {
    const maxLabel = formatTime(doc.duration);
    return (
      <div className="scrollbar-thin h-full overflow-y-auto p-3">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.06] to-cyan-500/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-100">
              <Film className="size-3.5 text-violet-300" /> Project settings
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              Select a clip on the timeline to edit its transform, color, effects and audio.
            </p>
            <p className="mt-2 font-mono text-[10px] text-zinc-300">Duration {maxLabel}</p>
          </div>
          <div>
            <Label>Aspect ratio</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {[
                ["16:9", "YouTube"],
                ["9:16", "Reels"],
                ["1:1", "Square"],
                ["4:5", "Portrait"],
                ["4:3", "Classic"],
                ["21:9", "Cinema"],
              ].map(([value, hint]) => (
                <button
                  key={value}
                  onClick={() => setAspect(value)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-left text-[10px] transition",
                    doc.aspect === value
                      ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                      : "border-white/10 text-muted hover:border-white/20 hover:text-white"
                  )}
                >
                  <span className="block font-medium">{value}</span>
                  <span className="block text-[9px] opacity-70">{hint}</span>
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="h-7 text-[10px]"
                aria-label="Custom aspect width"
              />
              <span className="text-[10px] text-muted">:</span>
              <Input
                type="number"
                min={1}
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                className="h-7 text-[10px]"
                aria-label="Custom aspect height"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-7"
                onClick={() => {
                  const w = Number(customW);
                  const h = Number(customH);
                  if (w > 0 && h > 0) setAspect(`${w}:${h}`);
                }}
              >
                Custom
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
            <div>
              <p className="text-[11px] text-zinc-200">Canvas background</p>
              <p className="text-[9px] text-muted">Visible behind contained clips</p>
            </div>
            <Input
              type="color"
              value={doc.background}
              onChange={(e) => setBackground(e.target.value)}
              className="h-7 w-12"
            />
          </div>
          <div>
            <Label>Preview frame rate</Label>
            <Select value={String(doc.fps)} onValueChange={(v) => setFps(Number(v))}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 fps</SelectItem>
                <SelectItem value="30">30 fps</SelectItem>
                <SelectItem value="60">60 fps</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-muted">
            <p className="mb-1 font-medium text-zinc-300">Keyboard shortcuts</p>
            Space — play / pause · S — split selected clip · ⌫ — delete clip · ⌘Z / ⇧⌘Z — undo / redo
          </div>
        </div>
      </div>
    );
  }

  const isText = clip.kind === "text";
  const style = clip.textStyle;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-white/[0.06] px-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-md py-1 text-[10px] font-medium transition",
              tab === t.id ? "bg-white/10 text-white" : "text-muted hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "clip" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                    clip.kind === "video"
                      ? "bg-blue-500/15 text-blue-200"
                      : clip.kind === "image"
                        ? "bg-emerald-500/15 text-emerald-200"
                        : clip.kind === "audio"
                          ? "bg-cyan-500/15 text-cyan-200"
                          : "bg-violet-500/15 text-violet-200"
                  )}
                >
                  {clip.kind}
                </span>
                {asset && <span className="text-[9px] text-muted">{formatTime(asset.duration ?? 0)}</span>}
              </div>
              <div className="flex gap-0.5">
                <Button size="icon-sm" variant="ghost" onClick={() => duplicateClip(clip.id)} title="Duplicate">
                  <Copy className="size-3.5" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => removeClip(clip.id)} title="Delete">
                  <Trash2 className="size-3.5 text-red-300/80" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={clip.name} onChange={(e) => edit({ name: e.target.value })} className="mt-1 h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start</Label>
                <Input
                  type="number"
                  step={0.1}
                  min={0}
                  value={Number(clip.start.toFixed(2))}
                  onChange={(e) => edit({ start: Math.max(0, Number(e.target.value)) }, true)}
                  className="mt-1 h-7 text-[11px]"
                />
              </div>
              <div>
                <Label>Duration</Label>
                <Input
                  type="number"
                  step={0.1}
                  min={0.15}
                  value={Number(clip.duration.toFixed(2))}
                  onChange={(e) => edit({ duration: Math.max(0.15, Number(e.target.value)) }, true)}
                  className="mt-1 h-7 text-[11px]"
                />
              </div>
            </div>
            {clip.kind !== "text" && (
              <SliderRow
                label="Playback speed"
                value={Math.round(clip.speed * 100)}
                min={25}
                max={400}
                step={5}
                unit="%"
                onChange={(v) => setSpeed(v / 100)}
                onReset={() => setSpeed(1)}
              />
            )}
            <div className="grid grid-cols-4 gap-1">
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "rounded-md border py-1 text-[10px] transition",
                    Math.abs(clip.speed - s) < 0.01
                      ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                      : "border-white/10 text-muted hover:text-white"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="border-t border-white/[0.06] pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Transform</p>
              <div className="space-y-2.5">
                <SliderRow label="Scale" value={clip.scale} min={10} max={300} unit="%" onChange={(v) => edit({ scale: v })} onReset={() => edit({ scale: 100 }, true)} />
                <SliderRow label="Position X" value={clip.x} min={-100} max={100} onChange={(v) => edit({ x: v })} onReset={() => edit({ x: 0 }, true)} />
                <SliderRow label="Position Y" value={clip.y} min={-100} max={100} onChange={(v) => edit({ y: v })} onReset={() => edit({ y: 0 }, true)} />
                <SliderRow label="Rotation" value={clip.rotation} min={-180} max={180} unit="°" onChange={(v) => edit({ rotation: v })} onReset={() => edit({ rotation: 0 }, true)} />
                <SliderRow label="Opacity" value={clip.opacity} min={0} max={100} unit="%" onChange={(v) => edit({ opacity: v })} onReset={() => edit({ opacity: 100 }, true)} />
              </div>
              <div className="mt-2 flex gap-1">
                <Button size="sm" variant={clip.flipX ? "accent" : "outline"} className="flex-1" onClick={() => edit({ flipX: !clip.flipX }, true)}>
                  Flip H
                </Button>
                <Button size="sm" variant={clip.flipY ? "accent" : "outline"} className="flex-1" onClick={() => edit({ flipY: !clip.flipY }, true)}>
                  Flip V
                </Button>
              </div>
            </div>

            {clip.kind !== "text" && (
              <div className="border-t border-white/[0.06] pt-3">
                <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  <Crop className="size-3" /> Crop insets
                </p>
                <p className="mb-2 text-[9px] text-muted">Percent of the source frame</p>
                <div className="space-y-2">
                  {(["top", "right", "bottom", "left"] as const).map((side) => (
                    <div key={side}>
                      <div className="flex justify-between text-[10px] text-muted">
                        <span className="capitalize">{side}</span>
                        <span className="font-mono">{clip.crop[side]}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={45}
                        value={clip.crop[side]}
                        onChange={(e) => edit({ crop: { ...clip.crop, [side]: Number(e.target.value) } })}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button size="sm" variant="secondary" className="w-full" onClick={splitSelected}>
              <Scissors className="size-3.5" /> Split at playhead
            </Button>
          </div>
        )}

        {tab === "color" && (
          <div className="space-y-3">
            <div className="space-y-2.5">
              {(
                [
                  ["exposure", -100, 100],
                  ["brightness", -100, 100],
                  ["contrast", -100, 100],
                  ["saturation", -100, 100],
                  ["temperature", -100, 100],
                  ["tint", -100, 100],
                  ["blur", 0, 100],
                  ["sharpness", 0, 100],
                ] as const
              ).map(([key, min, max]) => (
                <SliderRow
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={clip.adjustments[key]}
                  min={min}
                  max={max}
                  unit={min === 0 ? "%" : ""}
                  onChange={(v) => editAdjustment(key, v)}
                  onReset={() => edit({ adjustments: { ...clip.adjustments, [key]: 0 } }, true)}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => edit({ adjustments: { ...clip.adjustments } }, true)}
              >
                <RotateCcw className="size-3.5" /> Keep
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  edit(
                    {
                      adjustments: {
                        brightness: 0,
                        contrast: 0,
                        saturation: 0,
                        exposure: 0,
                        temperature: 0,
                        tint: 0,
                        highlights: 0,
                        shadows: 0,
                        sharpness: 0,
                        blur: 0,
                        vignette: 0,
                        fade: 0,
                        grain: 0,
                      },
                    },
                    true
                  );
                }}
              >
                Reset
              </Button>
            </div>
            <div className="border-t border-white/[0.06] pt-3">
              <Label>Look</Label>
              <Select
                value={clip.filterId ?? "none"}
                onValueChange={(v) => edit({ filterId: v === "none" ? null : v }, true)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Original</SelectItem>
                  {FILTER_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clip.filterId && (
                <div className="mt-2">
                  <SliderRow
                    label="Look intensity"
                    value={clip.filterIntensity}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => edit({ filterIntensity: v })}
                    onReset={() => edit({ filterIntensity: 100 }, true)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "effects" && (
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Clip effect</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => edit({ effect: null }, true)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[10px] transition",
                    !clip.effect ? "border-violet-400/40 bg-violet-500/10 text-violet-200" : "border-white/10 text-muted"
                  )}
                >
                  None
                </button>
                {EFFECTS.map((effect) => (
                  <button
                    key={effect.id}
                    onClick={() => edit({ effect: effect.id }, true)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[10px] transition",
                      clip.effect === effect.id
                        ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                        : "border-white/10 text-muted hover:border-white/20 hover:text-white"
                    )}
                  >
                    {effect.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-white/[0.06] pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Fade</p>
              <div className="space-y-2.5">
                <SliderRow label="Fade in" value={clip.fadeIn} min={0} max={Math.min(5, clip.duration)} step={0.1} unit="s" onChange={(v) => edit({ fadeIn: v })} />
                <SliderRow label="Fade out" value={clip.fadeOut} min={0} max={Math.min(5, clip.duration)} step={0.1} unit="s" onChange={(v) => edit({ fadeOut: v })} />
              </div>
            </div>
            <div className="border-t border-white/[0.06] pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Transition in</p>
              <div className="grid grid-cols-3 gap-1">
                {TRANSITIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() =>
                      edit(
                        { transitionIn: { ...clip.transitionIn, type: t.id as ClipTransition["type"] } },
                        true
                      )
                    }
                    className={cn(
                      "rounded-md border px-1 py-1 text-[9px] transition",
                      clip.transitionIn.type === t.id
                        ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                        : "border-white/10 text-muted hover:text-white"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {clip.transitionIn.type !== "none" && (
                <div className="mt-2">
                  <SliderRow
                    label="Transition duration"
                    value={clip.transitionIn.duration}
                    min={0.1}
                    max={Math.min(3, clip.duration)}
                    step={0.1}
                    unit="s"
                    onChange={(v) =>
                      edit({ transitionIn: { ...clip.transitionIn, duration: v } })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "audio" && (
          <div className="space-y-3">
            {clip.kind === "audio" || clip.kind === "video" ? (
              <>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-200">
                    {clip.muted ? <VolumeX className="size-3.5 text-red-300" /> : <Volume2 className="size-3.5 text-cyan-300" />}
                    Mute clip
                  </span>
                  <Switch checked={clip.muted} onCheckedChange={(v) => edit({ muted: v }, true)} />
                </div>
                <SliderRow label="Volume" value={clip.volume} min={0} max={200} unit="%" onChange={(v) => edit({ volume: v })} />
                <SliderRow label="Fade in" value={clip.fadeIn} min={0} max={Math.min(8, clip.duration)} step={0.1} unit="s" onChange={(v) => edit({ fadeIn: v })} />
                <SliderRow label="Fade out" value={clip.fadeOut} min={0} max={Math.min(8, clip.duration)} step={0.1} unit="s" onChange={(v) => edit({ fadeOut: v })} />
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] text-muted">
                  Audio is mixed live through the Web Audio API. Trim the clip edges on the timeline to trim the
                  audio region.
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-white/10 py-6 text-center">
                <Music2 className="size-4 text-muted" />
                <p className="text-[11px] text-zinc-300">No audio on this clip</p>
                <p className="max-w-[180px] text-[9px] text-muted">Audio applies to video and audio clips.</p>
              </div>
            )}
          </div>
        )}

        {tab === "text" && (
          <div className="space-y-3">
            {!isText ? (
              <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-muted">
                Select a text clip to edit typography.
              </div>
            ) : (
              <>
                <div>
                  <Label>Text content</Label>
                  <textarea
                    value={clip.text ?? ""}
                    onChange={(e) => edit({ text: e.target.value, name: e.target.value.slice(0, 24) })}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs outline-none focus:border-violet-400/40"
                  />
                </div>
                {style && (
                  <>
                    <div>
                      <Label>Style preset</Label>
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        {TEXT_STYLE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() =>
                              edit(
                                {
                                  textStyle: { ...style, ...preset.style },
                                  animation: preset.animation,
                                },
                                true
                              )
                            }
                            className="rounded-md border border-white/10 px-1 py-1 text-[9px] text-muted transition hover:border-violet-400/30 hover:text-white"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Font</Label>
                      <Select
                        value={style.fontFamily}
                        onValueChange={(v) => edit({ textStyle: { ...style, fontFamily: v } }, true)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <SliderRow label="Font size" value={style.fontSize} min={12} max={200} onChange={(v) => edit({ textStyle: { ...style, fontSize: v } })} />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Text color</Label>
                        <Input type="color" value={style.color} onChange={(e) => edit({ textStyle: { ...style, color: e.target.value } })} className="mt-1 h-7" />
                      </div>
                      <div>
                        <Label>Background</Label>
                        <Input
                          type="color"
                          value={style.background === "transparent" ? "#000000" : style.background.startsWith("rgba") ? "#000000" : style.background}
                          onChange={(e) => edit({ textStyle: { ...style, background: e.target.value } })}
                          className="mt-1 h-7"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(["left", "center", "right"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => edit({ textStyle: { ...style, align: a } }, true)}
                          className={cn(
                            "rounded-md border py-1 text-[9px] capitalize transition",
                            style.align === a ? "border-violet-400/40 bg-violet-500/10 text-violet-200" : "border-white/10 text-muted"
                          )}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => edit({ textStyle: { ...style, bold: !style.bold } }, true)}
                        className={cn("rounded-md border py-1 text-[11px] font-bold", style.bold ? "border-violet-400/40 bg-violet-500/10 text-violet-200" : "border-white/10 text-muted")}
                      >
                        B
                      </button>
                      <button
                        onClick={() => edit({ textStyle: { ...style, italic: !style.italic } }, true)}
                        className={cn("rounded-md border py-1 text-[11px] italic", style.italic ? "border-violet-400/40 bg-violet-500/10 text-violet-200" : "border-white/10 text-muted")}
                      >
                        I
                      </button>
                    </div>
                    <SliderRow label="Letter spacing" value={style.letterSpacing} min={-10} max={40} onChange={(v) => edit({ textStyle: { ...style, letterSpacing: v } })} />
                    <SliderRow label="Line height" value={style.lineHeight * 100} min={70} max={220} step={5} unit="%" onChange={(v) => edit({ textStyle: { ...style, lineHeight: v / 100 } })} />
                    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                      <span className="text-[11px] text-zinc-200">Drop shadow</span>
                      <Switch checked={style.shadow} onCheckedChange={(v) => edit({ textStyle: { ...style, shadow: v } }, true)} />
                    </div>
                    <div>
                      <Label>Text animation</Label>
                      <Select
                        value={clip.animation ?? "none"}
                        onValueChange={(v) => edit({ animation: v }, true)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEXT_ANIMATIONS.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Position X</Label>
                        <Slider
                          value={[clip.x]}
                          min={-100}
                          max={100}
                          onValueChange={(v) => edit({ x: v[0] })}
                        />
                      </div>
                      <div>
                        <Label>Position Y</Label>
                        <Slider
                          value={[clip.y]}
                          min={-100}
                          max={100}
                          onValueChange={(v) => edit({ y: v[0] })}
                        />
                      </div>
                    </div>
                    <Input
                      type="color"
                      value={style.stroke === "transparent" ? "#111111" : style.stroke}
                      onChange={(e) => edit({ textStyle: { ...style, stroke: e.target.value } })}
                      className="h-7"
                    />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
