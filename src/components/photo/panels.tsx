"use client";

import { useState } from "react";
import {
  Sparkles,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  RotateCcw as ResetIcon,
  Crop,
  Trash2,
  MoveUp,
  MoveDown,
  Wand2,
  Download,
  Lock,
  Unlock,
} from "lucide-react";
import { usePhotoStore } from "@/store/photo";
import { ADJUSTMENT_META } from "@/lib/presets";
import type { Adjustments } from "@/lib/types";
import { TEXT_STYLE_PRESETS } from "@/lib/text-presets";
import { deleteCustomPreset, listCustomPresets, saveCustomPreset } from "@/lib/custom-presets";
import { STICKERS } from "./helpers";
import { SliderRow } from "@/components/editor/slider-row";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@/components/ui/controls";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { SerializedObject } from "@/lib/types";

const LIGHT_KEYS: (keyof Adjustments)[] = ["exposure", "brightness", "contrast", "highlights", "shadows"];
const COLOR_KEYS: (keyof Adjustments)[] = ["saturation", "temperature", "tint"];
const DETAIL_KEYS: (keyof Adjustments)[] = ["sharpness", "blur", "vignette", "fade", "grain"];

export function AdjustPanel({ onAutoEnhance }: { onAutoEnhance?: () => void }) {
  const { doc, setAdjustment, setAdjustments, resetAdjustments } = usePhotoStore();
  const [group, setGroup] = useState<"light" | "color" | "detail">("light");
  const keys = group === "light" ? LIGHT_KEYS : group === "color" ? COLOR_KEYS : DETAIL_KEYS;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-0.5">
        {(["light", "color", "detail"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={cn(
              "flex-1 rounded-md py-1 text-[10px] font-medium capitalize transition",
              group === g ? "bg-white/10 text-white" : "text-muted hover:text-white"
            )}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {keys.map((key) => {
          const meta = ADJUSTMENT_META[key];
          return (
            <SliderRow
              key={key}
              label={meta.label}
              value={doc.adjustments[key]}
              min={meta.min}
              max={meta.max}
              unit={meta.min === 0 ? "%" : ""}
              onChange={(v) => setAdjustment(key, v)}
              onReset={() => setAdjustments({ [key]: 0 })}
            />
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onAutoEnhance} disabled={!onAutoEnhance}>
          <Sparkles className="size-3.5" /> Auto
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={resetAdjustments}>
          <ResetIcon className="size-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}

export function CustomPresetsPanel() {
  const { doc, setDoc } = usePhotoStore();
  const [presets, setPresets] = useState(() => listCustomPresets());
  const [name, setName] = useState("");

  function applyPreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setDoc({
      ...doc,
      adjustments: { ...preset.adjustments },
      filterId: preset.filterId,
      filterIntensity: preset.filterIntensity,
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">My presets</p>
        <span className="text-[9px] text-muted">{presets.length}</span>
      </div>
      <div className="flex gap-1.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Preset name"
          className="h-7 text-[10px]"
        />
        <Button
          size="sm"
          className="h-7 shrink-0 px-2"
          onClick={() => {
            const entry = saveCustomPreset({
              name: name.trim() || `My look ${presets.length + 1}`,
              adjustments: { ...doc.adjustments },
              filterId: doc.filterId,
              filterIntensity: doc.filterIntensity,
            });
            setPresets([entry, ...presets]);
            setName("");
          }}
        >
          Save
        </Button>
      </div>
      {presets.length === 0 ? (
        <p className="text-[9px] leading-relaxed text-muted">
          Save your current grade to reuse it across photos. Stored locally in this browser.
        </p>
      ) : (
        <div className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
          {presets.map((preset) => (
            <div key={preset.id} className="flex items-center gap-1.5">
              <button
                onClick={() => applyPreset(preset.id)}
                className="flex min-w-0 flex-1 items-center justify-between rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-300 transition hover:border-violet-400/30 hover:text-white"
              >
                <span className="truncate">{preset.name}</span>
                <span className="ml-2 text-[8px] uppercase text-muted">{preset.filterId ?? "custom"}</span>
              </button>
              <button
                onClick={() => {
                  deleteCustomPreset(preset.id);
                  setPresets(listCustomPresets());
                }}
                className="text-muted transition hover:text-red-300"
                title="Delete preset"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CropPanel({
  imageWidth,
  imageHeight,
  crop,
  rotation,
  flipX,
  flipY,
  onCrop,
  onRotate,
  onFlip,
  aspect,
  onAspect,
}: {
  imageWidth: number;
  imageHeight: number;
  crop?: { x: number; y: number; width: number; height: number } | null;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  onCrop: (rect: { x: number; y: number; width: number; height: number } | null) => void;
  onRotate: (delta: number) => void;
  onFlip: (axis: "x" | "y") => void;
  aspect: string;
  onAspect: (aspect: string) => void;
}) {
  const [margins, setMargins] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const current = crop ?? { x: 0, y: 0, width: imageWidth, height: imageHeight };
  const currentRatio = current.width / current.height;

  function applyAspect(target: string) {
    const [w, h] = target.split(":").map(Number);
    if (!w || !h) return;
    onAspect(target);
    const targetRatio = w / h;
    let nw = current.width;
    let nh = current.height;
    if (currentRatio > targetRatio) nw = current.height * targetRatio;
    else nh = current.width / targetRatio;
    nw = Math.min(nw, current.width);
    nh = Math.min(nh, current.height);
    onCrop({
      x: Math.round(current.x + (current.width - nw) / 2),
      y: Math.round(current.y + (current.height - nh) / 2),
      width: Math.round(nw),
      height: Math.round(nh),
    });
  }

  function applyMargins() {
    const x = current.x + (current.width * margins.left) / 100;
    const y = current.y + (current.height * margins.top) / 100;
    const width = current.width * (1 - (margins.left + margins.right) / 100);
    const height = current.height * (1 - (margins.top + margins.bottom) / 100);
    if (width < 8 || height < 8) return;
    onCrop({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Aspect preset</Label>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {[
            ["Free", "free"],
            ["1:1", "1:1"],
            ["16:9", "16:9"],
            ["9:16", "9:16"],
            ["4:5", "4:5"],
            ["3:2", "3:2"],
          ].map(([label, value]) => (
            <button
              key={label}
              onClick={() => (value === "free" ? onCrop(null) : applyAspect(value))}
              className={cn(
                "rounded-lg border px-2 py-2 text-[10px] transition",
                (value === "free" && !crop) || aspect === value
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                  : "border-white/10 text-muted hover:border-white/20 hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[10px] text-muted">
          <span>Crop</span>
          <span className="font-mono text-zinc-300">
            {Math.round(current.width)} × {Math.round(current.height)}
          </span>
        </div>
      </div>

      <div>
        <Label>Free crop margins</Label>
        <div className="mt-1.5 space-y-2">
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <div key={side}>
              <div className="flex justify-between text-[10px] text-muted">
                <span className="capitalize">{side}</span>
                <span className="font-mono">{margins[side]}%</span>
              </div>
              <Slider
                value={[margins[side]]}
                min={0}
                max={45}
                step={1}
                onValueChange={(v) => setMargins((m) => ({ ...m, [side]: v[0] }))}
              />
            </div>
          ))}
        </div>
        <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={applyMargins}>
          <Crop className="size-3.5" /> Apply crop
        </Button>
      </div>

      <div>
        <Label>Transform</Label>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          <Button size="sm" variant="outline" onClick={() => onRotate(-90)} title="Rotate left">
            <RotateCcw className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRotate(90)} title="Rotate right">
            <RotateCw className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant={flipX ? "accent" : "outline"}
            onClick={() => onFlip("x")}
            title="Flip horizontal"
          >
            <FlipHorizontal className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant={flipY ? "accent" : "outline"}
            onClick={() => onFlip("y")}
            title="Flip vertical"
          >
            <FlipVertical className="size-3.5" />
          </Button>
        </div>
        <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => onCrop(null)}>
          Reset crop
        </Button>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] leading-relaxed text-muted">
        Output aspect <span className="text-zinc-300">{aspect}</span>. Rotation ({rotation}°) and flips are baked in
        on export.
      </div>
    </div>
  );
}

export function TextPanel({
  onAddText,
  onAddSticker,
}: {
  onAddText: (presetId: string | null) => void;
  onAddSticker: (emoji: string) => void;
}) {
  const [tab, setTab] = useState<"presets" | "stickers">("presets");
  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg bg-white/[0.04] p-0.5">
        {(["presets", "stickers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md py-1 text-[10px] capitalize transition",
              tab === t ? "bg-white/10 text-white" : "text-muted hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "presets" ? (
        <>
          <Button size="sm" className="w-full" onClick={() => onAddText(null)}>
            <Wand2 className="size-3.5" /> Add text
          </Button>
          <div className="space-y-1.5">
            {TEXT_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onAddText(preset.id)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                <span
                  className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/30 text-[9px]"
                  style={{
                    color: preset.style.color,
                    fontFamily: preset.style.fontFamily,
                    fontWeight: preset.style.bold ? 700 : 400,
                    fontStyle: preset.style.italic ? "italic" : "normal",
                    background: preset.style.background !== "transparent" ? preset.style.background : undefined,
                  }}
                >
                  {preset.preview}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium text-zinc-200">{preset.name}</span>
                  <span className="block text-[9px] text-muted">{preset.animation} animation</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-6 gap-1">
          {STICKERS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onAddSticker(emoji)}
              className="flex size-8 items-center justify-center rounded-md bg-white/[0.04] text-base transition hover:bg-violet-500/20"
              title="Add sticker"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <p className="text-[10px] leading-relaxed text-muted">
        Click a layer on the canvas to edit typography, color, shadow and transform in the right panel.
      </p>
    </div>
  );
}

const GRADIENTS: [string, string, string][] = [
  ["Sunset", "#7c3aed", "#f97316"],
  ["Ocean", "#0ea5e9", "#22d3ee"],
  ["Candy", "#db2777", "#f9a8d4"],
  ["Mint", "#059669", "#a7f3d0"],
  ["Midnight", "#0f172a", "#4f46e5"],
  ["Peach", "#fb7185", "#fde68a"],
];

export function BackgroundPanel({ onRemoveBg }: { onRemoveBg: () => void }) {
  const { doc, setBackground } = usePhotoStore();
  const bg = doc.background;
  return (
    <div className="space-y-4">
      <div>
        <Label>Backdrop</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {[
            ["none", "None"],
            ["color", "Solid color"],
            ["gradient", "Gradient"],
            ["blur", "Blur original"],
            ["transparent", "Transparent"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setBackground({ type: value as typeof bg.type })}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-[10px] transition",
                bg.type === value
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                  : "border-white/10 text-muted hover:border-white/20 hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {bg.type === "color" && (
        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={bg.color}
            onChange={(e) => setBackground({ color: e.target.value })}
            className="h-8 w-12"
          />
          <Input value={bg.color} onChange={(e) => setBackground({ color: e.target.value })} className="h-8" />
        </div>
      )}

      {bg.type === "gradient" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input type="color" value={bg.gradientFrom} onChange={(e) => setBackground({ gradientFrom: e.target.value })} className="h-8 w-12" />
            <Input type="color" value={bg.gradientTo} onChange={(e) => setBackground({ gradientTo: e.target.value })} className="h-8 w-12" />
            <span className="text-[10px] text-muted">Custom</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {GRADIENTS.map(([name, from, to]) => (
              <button
                key={name}
                onClick={() => setBackground({ gradientFrom: from, gradientTo: to })}
                className="rounded-md border border-white/10 px-1 py-2 text-[9px] text-white/90"
                style={{ background: `linear-gradient(135deg,${from},${to})` }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {bg.type === "blur" && (
        <SliderRow
          label="Blur amount"
          value={bg.blurAmount}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => setBackground({ blurAmount: v })}
        />
      )}

      <div className="space-y-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium">Local color-key removal</p>
            <p className="text-[9px] text-muted">Best on solid / studio backgrounds</p>
          </div>
          <Switch checked={bg.keyed} onCheckedChange={(v) => setBackground({ keyed: v })} />
        </div>
        {bg.keyed && (
          <SliderRow
            label="Key tolerance"
            value={bg.keyTolerance}
            min={2}
            max={80}
            onChange={(v) => setBackground({ keyTolerance: v })}
          />
        )}
        <Button size="sm" variant="outline" className="w-full" onClick={onRemoveBg}>
          <Sparkles className="size-3.5" /> AI background removal
          <Lock className="size-2.5 text-amber-300" />
        </Button>
        <p className="text-[9px] leading-relaxed text-muted">
          AI removal requires a provider key. Local keying works offline and is not faked.
        </p>
      </div>
    </div>
  );
}

const QUICK_EFFECTS: { id: string; name: string; patch: Partial<Adjustments>; reset?: boolean; gradient: string }[] = [
  { id: "grain", name: "Film Grain", patch: { grain: 38, contrast: 8, fade: 8 }, gradient: "linear-gradient(135deg,#3f3f46,#a1a1aa)" },
  { id: "vignette", name: "Vignette", patch: { vignette: 42 }, gradient: "linear-gradient(135deg,#111,#52525b)" },
  { id: "fade", name: "Matte Fade", patch: { fade: 32, contrast: -8 }, gradient: "linear-gradient(135deg,#57534e,#d6d3d1)" },
  { id: "soft", name: "Soft Focus", patch: { blur: 14, brightness: 6 }, gradient: "linear-gradient(135deg,#a78bfa,#f0abfc)" },
  { id: "mono", name: "Monochrome", patch: { saturation: -100, contrast: 12 }, gradient: "linear-gradient(135deg,#18181b,#e4e4e7)" },
  { id: "hdr", name: "HDR Punch", patch: { contrast: 22, shadows: 20, highlights: -18, saturation: 16 }, gradient: "linear-gradient(135deg,#0c4a6e,#22d3ee)" },
  { id: "warmglow", name: "Warm Glow", patch: { temperature: 26, exposure: 8, saturation: 8 }, gradient: "linear-gradient(135deg,#9a3412,#fbbf24)" },
  { id: "cinematic", name: "Cinematic", patch: { contrast: 16, saturation: -8, vignette: 20, shadows: -8 }, gradient: "linear-gradient(135deg,#0f2027,#4f7c9b)" },
];

export function EffectsPanel() {
  const { setAdjustments } = usePhotoStore();
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {QUICK_EFFECTS.map((effect) => (
          <button
            key={effect.id}
            onClick={() => setAdjustments(effect.patch)}
            className="group overflow-hidden rounded-lg border border-white/[0.07] text-left transition hover:border-white/20"
          >
            <div className="h-14" style={{ background: effect.gradient }} />
            <div className="bg-white/[0.02] px-2 py-1.5">
              <p className="text-[10px] font-medium text-zinc-200">{effect.name}</p>
            </div>
          </button>
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setAdjustments({})}>
        Clear quick effects
      </Button>
    </div>
  );
}

export function ObjectInspector({
  selected,
  onChange,
  onDelete,
  onDuplicate,
  onLayer,
}: {
  selected: SerializedObject;
  onChange: (patch: Partial<SerializedObject>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onLayer: (dir: "up" | "down") => void;
}) {
  const isSticker = selected.type === "sticker";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-zinc-100">{isSticker ? "Sticker" : "Text layer"}</p>
          <p className="text-[9px] text-muted">{selected.id.slice(0, 14)}</p>
        </div>
        <div className="flex gap-1">
          <Button size="icon-sm" variant="ghost" onClick={() => onLayer("down")} title="Send backward">
            <MoveDown className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => onLayer("up")} title="Bring forward">
            <MoveUp className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={onDelete} title="Delete layer">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {!isSticker && (
        <div>
          <Label>Text</Label>
          <textarea
            value={selected.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={2}
            className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs outline-none focus:border-violet-400/40"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>X</Label>
          <Input
            type="number"
            className="mt-1 h-7 text-[11px]"
            value={Math.round(selected.left)}
            onChange={(e) => onChange({ left: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Y</Label>
          <Input
            type="number"
            className="mt-1 h-7 text-[11px]"
            value={Math.round(selected.top)}
            onChange={(e) => onChange({ top: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Scale X</Label>
          <Input
            type="number"
            step={0.05}
            className="mt-1 h-7 text-[11px]"
            value={Number(selected.scaleX.toFixed(2))}
            onChange={(e) => onChange({ scaleX: Number(e.target.value) || 1 })}
          />
        </div>
        <div>
          <Label>Rotation</Label>
          <Input
            type="number"
            className="mt-1 h-7 text-[11px]"
            value={Math.round(selected.angle)}
            onChange={(e) => onChange({ angle: Number(e.target.value) })}
          />
        </div>
      </div>

      <SliderRow
        label="Opacity"
        value={selected.opacity}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => onChange({ opacity: v })}
      />

      {!isSticker && (
        <>
          <div>
            <Label>Font</Label>
            <Select value={selected.fontFamily ?? "Inter"} onValueChange={(v) => onChange({ fontFamily: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Inter", "Georgia", "Arial", "Times New Roman", "Courier New", "Impact", "Trebuchet MS", "Verdana"].map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Size</Label>
              <Input
                type="number"
                className="mt-1 h-7 text-[11px]"
                value={Math.round(selected.fontSize ?? 52)}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) || 12 })}
              />
            </div>
            <div>
              <Label>Width</Label>
              <Input
                type="number"
                className="mt-1 h-7 text-[11px]"
                value={Math.round(selected.width ?? 400)}
                onChange={(e) => onChange({ width: Number(e.target.value) || 100 })}
              />
            </div>
          </div>
          <div>
            <Label>Alignment</Label>
            <div className="mt-1 flex gap-1">
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => onChange({ textAlign: a })}
                  className={cn(
                    "flex-1 rounded-md border px-1 py-1 text-[10px] capitalize transition",
                    selected.textAlign === a
                      ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                      : "border-white/10 text-muted"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                onChange({ fontWeight: selected.fontWeight === "700" || selected.fontWeight === "bold" ? "normal" : "700" })
              }
              className={cn(
                "rounded-md border py-1 text-[11px] font-bold transition",
                selected.fontWeight === "700" || selected.fontWeight === "bold"
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                  : "border-white/10 text-muted"
              )}
            >
              B
            </button>
            <button
              onClick={() => onChange({ fontStyle: selected.fontStyle === "italic" ? "normal" : "italic" })}
              className={cn(
                "rounded-md border py-1 text-[11px] italic transition",
                selected.fontStyle === "italic"
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                  : "border-white/10 text-muted"
              )}
            >
              I
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                className="mt-1 h-7"
                value={selected.fill ?? "#ffffff"}
                onChange={(e) => onChange({ fill: e.target.value })}
              />
            </div>
            <div>
              <Label>Background</Label>
              <Input
                type="color"
                className="mt-1 h-7"
                value={selected.backgroundColor ?? "#000000"}
                onChange={(e) => onChange({ backgroundColor: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Stroke</Label>
              <Input
                type="color"
                className="mt-1 h-7"
                value={selected.stroke === "transparent" ? "#111111" : selected.stroke ?? "#111111"}
                onChange={(e) => onChange({ stroke: e.target.value, strokeWidth: 2 })}
              />
            </div>
            <div>
              <Label>Letter spacing</Label>
              <Input
                type="number"
                className="mt-1 h-7 text-[11px]"
                value={Math.round(selected.charSpacing ?? 0)}
                onChange={(e) => onChange({ charSpacing: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2 py-1.5">
            <span className="text-[10px] text-zinc-300">Drop shadow</span>
            <Switch
              checked={Boolean(selected.shadow)}
              onCheckedChange={(v) =>
                onChange({ shadow: v ? { color: "rgba(0,0,0,0.7)", blur: 10, offsetX: 0, offsetY: 3 } : null })
              }
            />
          </div>
        </>
      )}

      <div className="flex gap-1.5">
        <Button size="sm" variant="secondary" className="flex-1" onClick={onDuplicate}>
          <Download className="size-3.5" /> Duplicate
        </Button>
        <Button size="sm" variant="destructive" className="flex-1" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}

export function LayerList({
  objects,
  selectedId,
  onSelect,
  onToggleVisible,
}: {
  objects: SerializedObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible?: (id: string) => void;
}) {
  if (!objects.length) {
    return (
      <p className="rounded-lg border border-dashed border-white/10 px-2 py-4 text-center text-[10px] text-muted">
        No text or sticker layers yet.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {[...objects].reverse().map((obj) => (
        <button
          key={obj.id}
          onClick={() => onSelect(obj.id)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition",
            selectedId === obj.id
              ? "border-violet-400/30 bg-violet-500/10"
              : "border-white/[0.05] bg-white/[0.015] hover:border-white/15"
          )}
        >
          <span className="flex size-5 items-center justify-center rounded bg-white/[0.06] text-[10px]">
            {obj.type === "sticker" ? "★" : "T"}
          </span>
          <span className="min-w-0 flex-1 truncate text-[10px] text-zinc-300">
            {obj.type === "sticker" ? obj.content : obj.text || "Text layer"}
          </span>
          {onToggleVisible && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisible(obj.id);
              }}
              className="text-muted hover:text-white"
              title="Toggle visibility"
            >
              {obj.opacity === 0 ? <Lock className="size-3" /> : <Unlock className="size-3" />}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
