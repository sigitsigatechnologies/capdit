"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Type, Music2, Loader2, Sparkles, Film, Layers, Plus, Gauge } from "lucide-react";
import { useVideoStore } from "@/store/video";
import { useProjectStore } from "@/store/projects";
import { generateSfx, type SfxKind } from "@/lib/sfx";
import { EFFECTS, TRANSITIONS } from "@/lib/video";
import { TEXT_STYLE_PRESETS } from "@/lib/text-presets";
import { STUDIO_TEMPLATES } from "@/lib/templates";
import type { AIIntent, AITool } from "@/lib/ai";
import type { ClipTransition, MediaAsset, VideoClip } from "@/lib/types";
import { MediaPanel } from "@/components/editor/media-panel";
import { AIPanel } from "@/components/editor/ai-panel";
import { FilterStrip } from "@/components/editor/filter-strip";
import { SliderRow } from "@/components/editor/slider-row";
import { Button } from "@/components/ui/button";
import { useMediaUrl } from "@/lib/use-media";
import { cn } from "@/lib/utils";

const SFX: { id: SfxKind; label: string }[] = [
  { id: "whoosh", label: "Whoosh" },
  { id: "click", label: "Click" },
  { id: "riser", label: "Riser" },
  { id: "pop", label: "Pop" },
  { id: "sparkle", label: "Sparkle" },
];

export function VideoToolPanel({
  tool,
  onAddAsset,
  onAddText,
  onAITool,
  onApplyPrompt,
  onOpenSettings,
  onApplyTemplate,
  busyAI,
  onSelectTool,
}: {
  tool: string;
  onAddAsset: (asset: MediaAsset) => void;
  onAddText: (presetId: string | null, variant: "title" | "subtitle") => void;
  onAITool: (tool: AITool) => void;
  onApplyPrompt: (intent: AIIntent, prompt: string) => void;
  onOpenSettings: () => void;
  onApplyTemplate: (templateId: string) => void;
  busyAI: string | null;
  onSelectTool: (tool: string) => void;
}) {
  const doc = useVideoStore((s) => s.doc);
  const selectedClipId = useVideoStore((s) => s.selectedClipId);
  const { updateClip, snapshot } = useVideoStore();
  const { importFiles, assets } = useProjectStore();
  const selected = doc.clips.find((c) => c.id === selectedClipId) ?? null;
  const selectedAssetUrl = useMediaUrl(selected?.assetId);
  const [sfxBusy, setSfxBusy] = useState<SfxKind | null>(null);
  const [transitionDuration, setTransitionDuration] = useState(0.6);

  function setSelectedSpeed(speed: number) {
    if (!selected) {
      toast.info("Select a clip on the timeline first");
      return;
    }
    const asset = assets.find((a) => a.id === selected.assetId);
    let duration = selected.duration;
    if (asset?.duration && (selected.kind === "video" || selected.kind === "audio")) {
      duration = Math.max(0.15, Math.max(0.2, asset.duration - selected.inPoint) / speed);
    }
    editSelected({ speed, duration });
  }

  function editSelected(patch: Partial<VideoClip>) {
    if (!selected) {
      toast.info("Select a clip on the timeline first");
      return;
    }
    snapshot();
    updateClip(selected.id, patch, false);
  }

  async function addSfx(kind: SfxKind) {
    setSfxBusy(kind);
    try {
      const file = await generateSfx(kind);
      const { assets, errors } = await importFiles([file]);
      errors.forEach((e) => toast.error(e));
      if (assets[0]) {
        onAddAsset(assets[0]);
        toast.success(`${kind} sound effect generated`);
      }
    } catch (error) {
      toast.error(`Could not generate SFX: ${(error as Error).message}`);
    } finally {
      setSfxBusy(null);
    }
  }

  if (tool === "media" || tool === "upload") {
    return (
      <div className="p-2">
        <div className="h-[calc(100vh-210px)] min-h-[340px]">
          <MediaPanel selectLabel="Add to timeline" onSelect={onAddAsset} />
        </div>
      </div>
    );
  }

  if (tool === "text") {
    return (
      <div className="space-y-3 p-3">
        <Button size="sm" className="w-full" onClick={() => onAddText(null, "title")}>
          <Plus className="size-3.5" /> Add title
        </Button>
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => onAddText("subtitle", "subtitle")}>
            <Type className="size-3.5" /> Subtitle
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onAddText("cinematic", "title")}>
            <Film className="size-3.5" /> Cinematic
          </Button>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Text presets</p>
          <div className="space-y-1.5">
            {TEXT_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onAddText(preset.id, preset.id === "subtitle" ? "subtitle" : "title")}
                className="flex w-full items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                <span
                  className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 text-[9px]"
                  style={{
                    color: preset.style.color,
                    fontFamily: preset.style.fontFamily,
                    fontWeight: preset.style.bold ? 700 : 400,
                    fontStyle: preset.style.italic ? "italic" : "normal",
                    background: preset.style.background !== "transparent" ? preset.style.background : "rgba(0,0,0,0.35)",
                  }}
                >
                  {preset.preview}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-zinc-200">{preset.name}</span>
                  <span className="block text-[9px] text-muted">{preset.animation} animation</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] leading-relaxed text-muted">
          Text clips live on the Text track. Drag them on the timeline to retime. Select a text clip to edit fonts,
          colors, stroke, shadow and animations.
        </div>
      </div>
    );
  }

  if (tool === "audio") {
    return (
      <div className="space-y-3 p-3">
        <div className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-cyan-500/[0.06] to-transparent p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold">
            <Music2 className="size-3.5 text-cyan-300" /> Sound effects
          </p>
          <p className="mt-0.5 text-[9px] text-muted">Generated locally with Web Audio</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {SFX.map((sfx) => (
              <button
                key={sfx.id}
                onClick={() => addSfx(sfx.id)}
                disabled={Boolean(sfxBusy)}
                className="flex items-center justify-center gap-1 rounded-md border border-white/10 py-1.5 text-[10px] text-zinc-300 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 disabled:opacity-50"
              >
                {sfxBusy === sfx.id ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                {sfx.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[calc(100vh-360px)] min-h-[240px]">
          <MediaPanel accept="audio/*,video/*" selectLabel="Add audio" onSelect={onAddAsset} />
        </div>
      </div>
    );
  }

  if (tool === "effects") {
    return (
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Clip effects</p>
          <span className="text-[9px] text-muted">{selected ? selected.name.slice(0, 14) : "No clip"}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => editSelected({ effect: null })}
            className={cn(
              "rounded-lg border px-2 py-2 text-[10px] transition",
              !selected?.effect ? "border-violet-400/40 bg-violet-500/10 text-violet-200" : "border-white/10 text-muted hover:text-white"
            )}
          >
            None
          </button>
          {EFFECTS.map((effect) => (
            <button
              key={effect.id}
              onClick={() => editSelected({ effect: effect.id })}
              className={cn(
                "rounded-lg border px-2 py-2 text-[10px] transition",
                selected?.effect === effect.id
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                  : "border-white/10 text-muted hover:border-white/20 hover:text-white"
              )}
            >
              {effect.label}
            </button>
          ))}
        </div>
        <div className="border-t border-white/[0.06] pt-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Gauge className="size-3" /> Speed
          </p>
          <div className="grid grid-cols-4 gap-1">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSpeed(s)}
                className="rounded-md border border-white/10 py-1 text-[10px] text-muted transition hover:border-white/20 hover:text-white"
              >
                {s}x
              </button>
            ))}
          </div>
          <p className="mt-2 text-[9px] text-muted">Slow / fast motion changes source playback speed.</p>
        </div>
        <div className="border-t border-white/[0.06] pt-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Fades</p>
          <div className="grid grid-cols-2 gap-1">
            <Button size="sm" variant="outline" onClick={() => editSelected({ fadeIn: 1 })}>
              Fade in 1s
            </Button>
            <Button size="sm" variant="outline" onClick={() => editSelected({ fadeOut: 1 })}>
              Fade out 1s
            </Button>
          </div>
        </div>
        {!selected && (
          <div className="rounded-lg border border-dashed border-white/10 p-2 text-center text-[10px] text-muted">
            Select a clip to apply effects.
          </div>
        )}
      </div>
    );
  }

  if (tool === "transitions") {
    return (
      <div className="space-y-3 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Transition into clip</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TRANSITIONS.map((t) => (
            <button
              key={t.id}
              onClick={() =>
                editSelected({
                  transitionIn: { type: t.id as ClipTransition["type"], duration: transitionDuration },
                })
              }
              className={cn(
                "rounded-lg border px-2 py-2 text-[10px] transition",
                selected?.transitionIn.type === t.id
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                  : "border-white/10 text-muted hover:border-white/20 hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <SliderRow
          label="Duration"
          value={transitionDuration}
          min={0.1}
          max={2.5}
          step={0.1}
          unit="s"
          onChange={setTransitionDuration}
        />
        <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] leading-relaxed text-muted">
          Transitions blend with the clip that ends at this clip&apos;s start on the same track. Place clips back to
          back, then set the incoming clip&apos;s transition.
        </p>
        {!selected && (
          <div className="rounded-lg border border-dashed border-white/10 p-2 text-center text-[10px] text-muted">
            Select the incoming clip first.
          </div>
        )}
      </div>
    );
  }

  if (tool === "filters") {
    return (
      <div className="p-3">
        <FilterStrip
          filterId={selected?.filterId ?? null}
          intensity={selected?.filterIntensity ?? 100}
          previewUrl={selectedAssetUrl}
          onFilter={(id) => editSelected({ filterId: id, filterIntensity: 100 })}
          onIntensity={(v) => editSelected({ filterIntensity: v })}
        />
        <p className="mt-3 text-[10px] text-muted">
          {selected ? `Applying to “${selected.name}”.` : "Select a clip to apply a look."}
        </p>
      </div>
    );
  }

  if (tool === "templates") {
    return (
      <div className="space-y-2 p-3">
        <p className="text-[10px] text-muted">
          Applying a template keeps your media clips and adds its aspect, text and background.
        </p>
        <div className="grid grid-cols-1 gap-2">
          {STUDIO_TEMPLATES.filter((t) => t.mode === "video").map((template) => (
            <button
              key={template.id}
              onClick={() => onApplyTemplate(template.id)}
              className="group flex items-center gap-2.5 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] p-2 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <span
                className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg text-[8px] font-bold uppercase tracking-wider text-white/80"
                style={{ background: template.gradient }}
              >
                {template.aspect}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium text-zinc-100">{template.name}</span>
                <span className="block truncate text-[9px] text-muted">{template.category} · {template.aspect}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (tool === "ai") {
    return (
      <AIPanel
        mode="video"
        onTool={onAITool}
        onApplyPrompt={onApplyPrompt}
        onOpenSettings={onOpenSettings}
        busyTool={busyAI}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 p-6 text-center">
      <Layers className="size-5 text-muted" />
      <p className="text-[11px] text-zinc-300">Select a tool</p>
      <Button size="sm" variant="secondary" onClick={() => onSelectTool("media")}>
        Open media
      </Button>
    </div>
  );
}

