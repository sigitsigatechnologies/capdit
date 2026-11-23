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
import { generatePresetFromAdjustments } from "@/lib/generation";
import { downloadXmp } from "@/lib/xmp";
import { parseXmp } from "@/lib/xmp-import";
import {
  LIGHTROOM_RANGES,
  adjustmentsFromLook,
  clampAdjustments,
  previewFilter,
  summarizeAdjustments,
  type Adjustments,
} from "@/lib/adjustments";
import { generateStyleAdjustments } from "@/lib/style-engine";
import { cn, formatBytes } from "@/lib/utils";
import type { UploadedImage } from "@/lib/types";

const ACCEPTED_IMAGE = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const EXAMPLE_STYLES = [
  "Teal & Orange Cinematic",
  "Moody Film",
  "Clean Portrait",
  "Vintage Sunset",
  "Neon Night",
  "Airy Minimal",
  "Fujifilm Classic Chrome",
  "Sony Alpha",
  "Hasselblad Natural",
  "Nikon Vivid",
  "Kodak Portra",
];

type AdjustGroup = "Light" | "Color" | "Detail" | "Effects";
const GROUPS: AdjustGroup[] = ["Light", "Color", "Detail", "Effects"];

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
        <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
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
    <div className="rounded-lg border border-border bg-secondary px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize tabular-nums">{value}</p>
    </div>
  );
}

function AdjustPanel({
  adjust,
  onChange,
  onReset,
}: {
  adjust: Adjustments;
  onChange: (key: keyof Adjustments, value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="surface rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Adjust</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
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
                  onChange={(next) => onChange(field.key, next)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExportPanel({
  sourceName,
  onNameChange,
  onDownload,
  onImport,
  disabled,
}: {
  sourceName: string;
  onNameChange: (value: string) => void;
  onDownload: () => void;
  onImport: () => void;
  disabled: boolean;
}) {
  return (
    <div className="surface rounded-2xl p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
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
        onChange={(event) => onNameChange(event.target.value)}
        className="mt-1.5"
        placeholder="my-preset"
      />
      <Button
        type="button"
        className="mt-4 w-full"
        size="lg"
        onClick={onDownload}
        disabled={disabled}
        data-testid="download-xmp"
      >
        <Download className="size-4" /> Download .xmp
      </Button>
      <Button type="button" variant="secondary" size="sm" className="mt-2 w-full" onClick={onImport}>
        <CloudUpload className="size-3.5" /> Import .xmp
      </Button>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Lightroom Mobile → Edit → Presets → Yours → ⋯ → Import Presets → pick the .xmp file.
      </p>
    </div>
  );
}

function StyleBanner({ adjust }: { adjust: Adjustments }) {
  const warm = adjust.temperature >= 0;
  const gradient = warm
    ? "linear-gradient(120deg, #fff1e0 0%, #ffd9b3 42%, #f6b26b 100%)"
    : "linear-gradient(120deg, #e8f1ff 0%, #c9e0ff 42%, #8fb9f0 100%)";
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border">
      <div className="h-44" style={{ background: gradient }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_45%)]" />
      </div>
      <div className="flex items-center justify-between gap-3 bg-card/90 px-4 py-3 backdrop-blur">
        <p className="text-sm font-medium">{summarizeAdjustments(adjust)}</p>
        <span className="text-[11px] text-muted-foreground">Style preset</span>
      </div>
    </div>
  );
}

function FilePanel({
  image,
  onReplace,
  onRemove,
}: {
  image: UploadedImage;
  onReplace: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
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
        <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onReplace}>
          <RefreshCw className="size-3.5" /> Replace
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <X className="size-3.5" /> Remove
        </Button>
      </div>
    </div>
  );
}

function DetectedPanel({ stats }: { stats: ImageStats }) {
  return (
    <div className="rounded-2xl border border-border bg-card/90 p-4 backdrop-blur">
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
            className="size-6 rounded-md border border-border"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{stats.lookSummary}</p>
    </div>
  );
}

export function Studio() {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"photo" | "name">("photo");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [adjust, setAdjust] = useState<Adjustments | null>(null);
  const [baseAdjust, setBaseAdjust] = useState<Adjustments | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [view, setView] = useState<"before" | "after">("after");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styleText, setStyleText] = useState("");
  const [styleBusy, setStyleBusy] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [engineSource, setEngineSource] = useState<"gemini" | "openai" | "engine" | null>(null);

  const photoReady = Boolean(image && stats && adjust);
  const nameReady = Boolean(adjust);

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
      const { stats: nextStats, look } = await analyzeImage(uploaded);
      const nextAdjust = adjustmentsFromLook(look);
      setImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return uploaded;
      });
      setStats(nextStats);
      setAdjust(nextAdjust);
      setBaseAdjust(nextAdjust);
      setSourceName(file.name.replace(/\.[^.]+$/, ""));
      setView("after");
      setMode("photo");
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
    setStats(null);
    setAdjust(null);
    setBaseAdjust(null);
    setSourceName("");
    setError(null);
  }, []);

  const handleGenerateName = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? styleText).trim();
      if (!text) return;
      setStyleText(text);
      setStyleBusy(true);
      try {
        let next: Adjustments;
        let chosen: "gemini" | "openai" | "engine" = "engine";
        try {
          const response = await fetch("/api/style", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              provider,
              apiKey: apiKey.trim() || undefined,
              model: model.trim() || undefined,
            }),
          });
          if (!response.ok) throw new Error("Style engine unavailable");
          const data = await response.json();
          next = clampAdjustments(data.adjust ?? {});
          chosen =
            data.source === "ai" ? (data.provider === "openai" ? "openai" : "gemini") : "engine";
        } catch {
          next = generateStyleAdjustments(text).adjust;
          chosen = "engine";
        }
        setAdjust(next);
        setBaseAdjust(next);
        setSourceName(text);
        setEngineSource(chosen);
        setMode("name");
        const label = chosen === "gemini" ? "Gemini" : chosen === "openai" ? "OpenAI" : "offline";
        toast.success(`Preset ${label} dibuat: ${text}`);
      } finally {
        setStyleBusy(false);
      }
    },
    [styleText, apiKey, model, provider]
  );

  const handleDownload = useCallback(async () => {
    if (!adjust) return;
    const cleanName = sourceName.trim() || "preset";
    const preset = { ...generatePresetFromAdjustments(adjust, cleanName), name: `CAPDIT - ${cleanName}` };
    try {
      await downloadXmp(preset);
      toast.success("Preset .xmp berhasil diunduh");
    } catch {
      toast.error("Gagal mengunduh preset");
    }
  }, [adjust, sourceName]);

  const handleImportFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      try {
        const text = await file.text();
        const imported = parseXmp(text);
        setAdjust(imported.adjust);
        setBaseAdjust(imported.adjust);
        setSourceName(imported.name);
        if (!image) setMode("name");
        toast.success(`Imported "${imported.name}"`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "XMP tidak valid");
      }
    },
    [image]
  );

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const afterFilter = adjust ? previewFilter(adjust) : "none";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 px-3 shadow-sm backdrop-blur-xl sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#7C3AED] text-primary-foreground">
              <Aperture className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">CAPDIT</p>
              <p className="text-[11px] text-muted-foreground">Photo to Lightroom preset</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-secondary p-0.5">
              {(["photo", "name"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition",
                    mode === item
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item === "photo" ? "From photo" : "From name"}
                </button>
              ))}
            </div>
            <span className="hidden rounded-full border border-border bg-secondary px-3 py-1 text-[11px] text-muted-foreground lg:block">
              On-device analysis
            </span>
          </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <input
          ref={photoInputRef}
          type="file"
          accept={ACCEPTED_IMAGE}
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".xmp,application/xml,text/xml"
          className="hidden"
          onChange={(event) => {
            void handleImportFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <AnimatePresence mode="wait">
          {mode === "photo" ? (
            <motion.div
              key="photo"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {photoReady && image && stats && adjust ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="space-y-6">
                    <div className="surface overflow-hidden rounded-3xl">
                      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span className="truncate">{image.name}</span>
                        </div>
                        <div className="flex shrink-0 rounded-lg border border-border bg-secondary p-0.5">
                          {(["before", "after"] as const).map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setView(item)}
                              className={cn(
                                "rounded-md px-3 py-1 text-xs font-medium capitalize transition",
                                view === item
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {item}
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
                          <div className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-sm">
                            <Loader2 className="size-8 animate-spin text-primary" />
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <AdjustPanel
                      adjust={adjust}
                      onChange={(key, value) =>
                        setAdjust((prev) => (prev ? { ...prev, [key]: value } : prev))
                      }
                      onReset={() => baseAdjust && setAdjust(baseAdjust)}
                    />
                  </div>

                  <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                    <FilePanel
                      image={image}
                      onReplace={() => photoInputRef.current?.click()}
                      onRemove={handleRemove}
                    />
                    <DetectedPanel stats={stats} />
                    <ExportPanel
                      sourceName={sourceName}
                      onNameChange={setSourceName}
                      onDownload={handleDownload}
                      onImport={() => importInputRef.current?.click()}
                      disabled={busy}
                    />
                  </aside>
                </div>
              ) : (
                <section className="mx-auto max-w-3xl">
                  <div className="text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
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
                    onClick={() => photoInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") photoInputRef.current?.click();
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
                        ? "border-primary/60 bg-primary/[0.06]"
                        : "border-border bg-secondary/50 hover:border-primary/40 hover:bg-primary/[0.04]"
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
                            ? "bg-primary/10 text-primary"
                            : "bg-primary/10 text-primary group-hover:bg-primary/10"
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
                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    className="mt-4 block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    or import an existing .xmp preset
                  </button>
                </section>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto max-w-5xl"
            >
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                  <Sparkles className="size-3.5" /> Style engine
                </span>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Create a preset from a <span className="gradient-text">name</span>
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                  Describe the look — the engine maps it to Lightroom parameters. Works offline; uses
                  an AI model automatically if a key is configured.
                </p>
              </div>

              <div className="mt-8 surface rounded-3xl p-5">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={styleText}
                    onChange={(event) => setStyleText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleGenerateName();
                    }}
                    placeholder="e.g. Teal & Orange Cinematic"
                    className="h-11"
                  />
                  <Button
                    type="button"
                    size="lg"
                    className="shrink-0"
                    onClick={() => handleGenerateName()}
                    disabled={styleBusy || !styleText.trim()}
                  >
                    {styleBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Generate
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXAMPLE_STYLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => handleGenerateName(example)}
                      className="rounded-full border border-border bg-secondary px-3 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      {example}
                    </button>
                  ))}
                </div>

                <details className="mt-4 rounded-lg border border-border bg-secondary/50 px-3 py-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground">
                    AI settings (optional)
                  </summary>
                  <div className="mt-2 flex gap-1 rounded-md border border-border bg-secondary p-1">
                    {(["gemini", "openai"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setProvider(option)}
                        className={`flex-1 rounded px-2 py-1 text-[11px] capitalize transition ${
                          provider === option
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder={provider === "gemini" ? "Gemini API key" : "OpenAI API key"}
                      autoComplete="off"
                      className="h-9"
                    />
                    <Input
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                      placeholder={provider === "gemini" ? "gemini-flash-lite-latest" : "gpt-4o-mini"}
                      className="h-9"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Key di sini menimpa key server. Tanpa key, generator pakai style engine offline.
                  </p>
                </details>
              </div>

              {nameReady && adjust ? (
                <div className="mt-3 text-center text-[11px] text-muted-foreground">
                  {engineSource === "gemini"
                    ? "Generated with Gemini"
                    : engineSource === "openai"
                      ? "Generated with OpenAI"
                      : "Generated with offline style engine"}
                </div>
              ) : null}
              {nameReady && adjust ? (
                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="space-y-6">
                    <StyleBanner adjust={adjust} />
                    <AdjustPanel
                      adjust={adjust}
                      onChange={(key, value) =>
                        setAdjust((prev) => (prev ? { ...prev, [key]: value } : prev))
                      }
                      onReset={() => baseAdjust && setAdjust(baseAdjust)}
                    />
                  </div>
                  <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                    <ExportPanel
                      sourceName={sourceName}
                      onNameChange={setSourceName}
                      onDownload={handleDownload}
                      onImport={() => importInputRef.current?.click()}
                      disabled={false}
                    />
                  </aside>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
