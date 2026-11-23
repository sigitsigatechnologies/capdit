"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Aperture,
  CloudUpload,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { analyzeImage, type ImageStats } from "@/lib/analyze-image";
import { createUploadedImage } from "@/lib/image-info";
import { generatePreset, LIGHTROOM_RANGES } from "@/lib/generation";
import { downloadXmp } from "@/lib/xmp";
import { clamp, cn, formatBytes } from "@/lib/utils";
import type { AnalysisResult, LightroomPreset, UploadedImage } from "@/lib/types";

const ACCEPTED = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

type Adjustments = {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  clarity: number;
  texture: number;
  dehaze: number;
  sharpening: number;
  vignette: number;
  grain: number;
};

type AdjustGroup = "Light" | "Color" | "Detail" | "Effects";

const FIELDS: Array<{ key: keyof Adjustments; label: string; group: AdjustGroup }> = [
  { key: "exposure", label: "Exposure", group: "Light" },
  { key: "contrast", label: "Contrast", group: "Light" },
  { key: "highlights", label: "Highlights", group: "Light" },
  { key: "shadows", label: "Shadows", group: "Light" },
  { key: "whites", label: "Whites", group: "Light" },
  { key: "blacks", label: "Blacks", group: "Light" },
  { key: "temperature", label: "Temperature", group: "Color" },
  { key: "tint", label: "Tint", group: "Color" },
  { key: "vibrance", label: "Vibrance", group: "Color" },
  { key: "saturation", label: "Saturation", group: "Color" },
  { key: "clarity", label: "Clarity", group: "Detail" },
  { key: "texture", label: "Texture", group: "Detail" },
  { key: "dehaze", label: "Dehaze", group: "Detail" },
  { key: "sharpening", label: "Sharpening", group: "Detail" },
  { key: "vignette", label: "Vignette", group: "Effects" },
  { key: "grain", label: "Grain", group: "Effects" },
];

const GROUPS: AdjustGroup[] = ["Light", "Color", "Detail", "Effects"];

function adjustmentsFromPreset(preset: LightroomPreset): Adjustments {
  return {
    exposure: preset.basic.exposure,
    contrast: preset.basic.contrast,
    highlights: preset.basic.highlights,
    shadows: preset.basic.shadows,
    whites: preset.basic.whites,
    blacks: preset.basic.blacks,
    temperature: preset.basic.temperature,
    tint: preset.basic.tint,
    vibrance: preset.basic.vibrance,
    saturation: preset.basic.saturation,
    clarity: preset.basic.clarity,
    texture: preset.basic.texture,
    dehaze: preset.basic.dehaze,
    sharpening: preset.detail.sharpening,
    vignette: preset.effects.vignette,
    grain: preset.effects.grain,
  };
}

function applyAdjustments(preset: LightroomPreset, a: Adjustments): LightroomPreset {
  return {
    ...preset,
    basic: {
      ...preset.basic,
      exposure: a.exposure,
      contrast: a.contrast,
      highlights: a.highlights,
      shadows: a.shadows,
      whites: a.whites,
      blacks: a.blacks,
      temperature: a.temperature,
      tint: a.tint,
      vibrance: a.vibrance,
      saturation: a.saturation,
      clarity: a.clarity,
      texture: a.texture,
      dehaze: a.dehaze,
    },
    detail: { ...preset.detail, sharpening: a.sharpening },
    effects: { ...preset.effects, vignette: a.vignette, grain: a.grain },
  };
}

function previewFilter(a: Adjustments): string {
  const brightness = Math.pow(2, a.exposure).toFixed(3);
  const contrast = (0.75 + (a.contrast / 100) * 0.6).toFixed(3);
  const saturate = (0.6 + (a.saturation / 100) * 1.2).toFixed(3);
  const sepia = ((clamp(a.temperature, 0, 100) / 100) * 0.25).toFixed(3);
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) sepia(${sepia})`;
}

function formatValue(value: number, step: number): string {
  return step < 1 ? value.toFixed(2) : String(Math.round(value));
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/90">{label}</span>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {formatValue(value, step)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        min={min}
        max={max}
        step={step}
        aria-label={label}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize tabular-nums">{value}</p>
    </div>
  );
}

export function Studio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [preset, setPreset] = useState<LightroomPreset | null>(null);
  const [adjust, setAdjust] = useState<Adjustments | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [view, setView] = useState<"before" | "after">("after");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar (JPG, PNG, atau WebP).");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const uploaded = await createUploadedImage(file);
      const { analysis: nextAnalysis, stats: nextStats } = await analyzeImage(uploaded);
      const nextPreset = generatePreset(nextAnalysis, file.name);
      setImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return uploaded;
      });
      setAnalysis(nextAnalysis);
      setStats(nextStats);
      setPreset(nextPreset);
      setAdjust(adjustmentsFromPreset(nextPreset));
      setSourceName(file.name.replace(/\.[^.]+$/, ""));
      setView("after");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal membaca gambar.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleRemove = useCallback(() => {
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setAnalysis(null);
    setStats(null);
    setPreset(null);
    setAdjust(null);
    setSourceName("");
    setError(null);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!preset || !adjust) return;
    const cleanName = sourceName.trim() || "preset";
    const finalPreset: LightroomPreset = {
      ...applyAdjustments(preset, adjust),
      sourceFileName: cleanName,
      name: `CAPDIT - ${cleanName}`,
    };
    try {
      await downloadXmp(finalPreset);
      toast.success("Preset .xmp berhasil diunduh");
    } catch {
      toast.error("Gagal mengunduh preset");
    }
  }, [preset, adjust, sourceName]);

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const afterFilter = adjust ? previewFilter(adjust) : "none";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0c]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-[#1c0f02]">
              <Aperture className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">CAPDIT</p>
              <p className="text-[11px] text-muted-foreground">Photo to Lightroom preset</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground sm:block">
            On-device analysis · no AI, no upload
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <AnimatePresence mode="wait">
          {!image || !preset || !adjust || !stats || !analysis ? (
            <motion.section
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto max-w-3xl"
            >
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-medium text-orange-300">
                  <Sparkles className="size-3.5" /> Reads brightness &amp; color from the pixels
                </span>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Photo in. <span className="gradient-text">Preset out.</span>
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
                  Drop a photo and CAPDIT measures exposure, contrast and color right in your
                  browser, then builds a matching Lightroom <span className="font-mono">.xmp</span> preset.
                </p>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragging(false);
                }}
                onDrop={onDrop}
                className={cn(
                  "group mt-10 flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed px-6 py-12 text-center transition",
                  dragging
                    ? "border-orange-400/70 bg-orange-500/[0.08]"
                    : "border-white/15 bg-white/[0.02] hover:border-orange-400/50 hover:bg-orange-500/[0.04]"
                )}
              >
                <motion.div
                  animate={{ scale: dragging ? 1.12 : 1, y: dragging ? -4 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div
                    className={cn(
                      "flex size-16 items-center justify-center rounded-2xl transition",
                      dragging
                        ? "bg-orange-500/20 text-orange-300"
                        : "bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20"
                    )}
                  >
                    {busy ? <Loader2 className="size-7 animate-spin" /> : <CloudUpload className="size-7" />}
                  </div>
                </motion.div>
                <div>
                  <p className="text-base font-medium">
                    {busy ? "Reading your photo…" : "Drag & drop a photo"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">or click to browse — JPG, PNG, WebP</p>
                </div>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="workspace"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
            >
              <div className="space-y-6">
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-card/70 backdrop-blur">
                  <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span className="truncate">{image.name}</span>
                    </div>
                    <div className="flex shrink-0 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                      {(["before", "after"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setView(mode)}
                          className={cn(
                            "rounded-md px-3 py-1 text-xs font-medium capitalize transition",
                            view === mode
                              ? "bg-orange-500 text-[#1c0f02]"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="checkerboard relative flex min-h-[280px] items-center justify-center p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.previewUrl}
                      alt={view === "before" ? "Before" : "After"}
                      className="max-h-[520px] w-full object-contain transition-[filter] duration-300"
                      style={{ filter: view === "after" ? afterFilter : "none" }}
                    />
                    {busy ? (
                      <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-sm">
                        <Loader2 className="size-8 animate-spin text-orange-400" />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Adjust</h2>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => preset && setAdjust(adjustmentsFromPreset(preset))}
                    >
                      Reset
                    </Button>
                  </div>
                  {GROUPS.map((group) => (
                    <div key={group} className="mt-5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group}
                      </p>
                      <div className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        {FIELDS.filter((field) => field.group === group).map((field) => {
                          const range = LIGHTROOM_RANGES[field.key];
                          return (
                            <SliderRow
                              key={field.key}
                              label={field.label}
                              value={adjust[field.key]}
                              min={range.min}
                              max={range.max}
                              step={range.step}
                              onChange={(next) =>
                                setAdjust((prev) => (prev ? { ...prev, [field.key]: next } : prev))
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <div className="rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.previewUrl} alt="" className="size-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={image.name}>
                        {image.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {image.width && image.height ? `${image.width} × ${image.height}` : "—"} ·{" "}
                        {formatBytes(image.size)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => inputRef.current?.click()}
                    >
                      <RefreshCw className="size-3.5" /> Replace
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                      <X className="size-3.5" /> Remove
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Detected
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Stat label="Brightness" value={`${stats.brightness}%`} />
                    <Stat label="Contrast" value={`${stats.contrast}%`} />
                    <Stat label="Saturation" value={`${stats.saturation}%`} />
                    <Stat label="Cast" value={stats.colorCast} />
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    {stats.dominantColors.map((color) => (
                      <span
                        key={color}
                        className="size-6 rounded-md border border-white/15"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-b from-orange-500/[0.08] to-transparent p-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-orange-300">
                    Export preset
                  </h3>
                  <label
                    htmlFor="preset-name"
                    className="mt-3 block text-[11px] uppercase tracking-wide text-muted-foreground"
                  >
                    Preset name
                  </label>
                  <Input
                    id="preset-name"
                    value={sourceName}
                    onChange={(event) => setSourceName(event.target.value)}
                    className="mt-1.5"
                    placeholder="my-photo"
                  />
                  <Button
                    type="button"
                    className="mt-4 w-full"
                    size="lg"
                    onClick={handleDownload}
                    disabled={busy}
                    data-testid="download-xmp"
                  >
                    <Download className="size-4" /> Download .xmp
                  </Button>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    Lightroom Mobile → Edit → Presets → Yours → ⋯ → Import Presets → pick the .xmp file.
                  </p>
                </div>
              </aside>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
