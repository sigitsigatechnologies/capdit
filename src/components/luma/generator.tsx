"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Download,
  Layers,
  Loader2,
  Save,
  Sparkles,
  SlidersHorizontal,
  Sun,
  Thermometer,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { previewFilter } from "@/lib/adjustments";
import { FILM_STYLES, FILM_CATEGORIES, getFilmStyle, searchFilmStyles } from "@/lib/luma/film-styles";
import { generateAdaptivePreset } from "@/lib/luma/adaptive";
import { downloadPresetXmp } from "@/lib/luma/download";
import { useLumaStore } from "@/lib/luma/store";
import type {
  FilmCategory,
  FilmStyle,
  GeneratedPreset,
  HistoryItem,
  ImageAnalysis,
  ReferenceMatch,
} from "@/lib/luma/types";
import { cn } from "@/lib/utils";
import { AdjustmentValues } from "./adjustment-values";
import { CompareSlider } from "./compare-slider";
import { StyleCard } from "./style-card";
import { UploadZone } from "./upload-zone";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function validateFile(file: File): boolean {
  if (!ALLOWED.includes(file.type)) {
    toast.error("Please upload a JPG, PNG, or WebP image");
    return false;
  }
  if (file.size > MAX_BYTES) {
    toast.error("Image is larger than 15 MB");
    return false;
  }
  return true;
}

function StatBar({ label, value, tone = "primary" }: { label: string; value: number; tone?: "primary" | "cool" }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={cn("h-full rounded-full", tone === "primary" ? "bg-primary" : "bg-[#8fb6c9]")}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] py-1.5 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right text-xs capitalize text-foreground">{value}</span>
    </div>
  );
}

export function Generator() {
  const params = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [reference, setReference] = useState<ReferenceMatch | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [styleId, setStyleId] = useState("classic-chrome");
  const [intensity, setIntensity] = useState(70);
  const [adaptive, setAdaptive] = useState(true);
  const [presetName, setPresetName] = useState("Classic Chrome");
  const [nameTouched, setNameTouched] = useState(false);
  const [category, setCategory] = useState<FilmCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<"download" | "save" | null>(null);

  const savePreset = useLumaStore((state) => state.savePreset);
  const addHistory = useLumaStore((state) => state.addHistory);
  const adaptiveDefault = useLumaStore((state) => state.settings.adaptiveDefault);

  const style = useMemo<FilmStyle>(() => getFilmStyle(styleId) ?? FILM_STYLES[0], [styleId]);
  const visibleStyles = useMemo(() => searchFilmStyles(query, category), [query, category]);

  useEffect(() => {
    setAdaptive(adaptiveDefault);
  }, [adaptiveDefault]);

  useEffect(() => {
    const requested = params.get("style");
    if (requested && getFilmStyle(requested)) setStyleId(requested);
  }, [params]);

  useEffect(() => {
    if (!nameTouched) setPresetName(style.name);
  }, [style.name, nameTouched]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!referenceFile) {
      setReferenceUrl(null);
      return;
    }
    const url = URL.createObjectURL(referenceFile);
    setReferenceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceFile]);

  const preset = useMemo<GeneratedPreset | null>(() => {
    if (!analysis) return null;
    return generateAdaptivePreset(analysis, style, { intensity, adaptive, reference: reference ?? undefined });
  }, [analysis, style, intensity, adaptive, reference]);

  const runAnalysis = useCallback(async (main: File, ref: File | null) => {
    setAnalyzing(true);
    try {
      const body = new FormData();
      body.append("file", main);
      if (ref) body.append("reference", ref);
      const response = await fetch("/api/analyze", { method: "POST", body });
      const data = (await response.json()) as {
        analysis?: ImageAnalysis;
        reference?: ReferenceMatch;
        error?: string;
      };
      if (!response.ok || !data.analysis) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
      setReference(data.reference ?? null);
      toast.success(
        data.analysis.source === "ai"
          ? "Analyzed with AI vision — preset adapted to this photo"
          : "Analyzed locally — AI vision unavailable, using measured image data"
      );
    } catch (error) {
      setAnalysis(null);
      setReference(null);
      toast.error(error instanceof Error ? error.message : "Could not analyze this image");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleMainFile = (next: File) => {
    if (!validateFile(next)) return;
    setFile(next);
    void runAnalysis(next, referenceFile);
  };

  const handleReferenceFile = (next: File) => {
    if (!validateFile(next)) return;
    setReferenceFile(next);
    if (file) void runAnalysis(file, next);
  };

  const clearReference = () => {
    setReferenceFile(null);
    setReference(null);
    if (file) void runAnalysis(file, null);
  };

  const reset = () => {
    setFile(null);
    setReferenceFile(null);
    setAnalysis(null);
    setReference(null);
    setNameTouched(false);
  };

  const selectStyle = (next: FilmStyle) => {
    setStyleId(next.id);
    setNameTouched(false);
    setPresetName(next.name);
  };

  const recordHistory = (workspace: GeneratedPreset) => {
    const item: HistoryItem = {
      id: workspace.id,
      styleId: workspace.styleId,
      styleName: workspace.styleName,
      styleCategory: workspace.styleCategory,
      summary: workspace.summary,
      adjust: workspace.adjust,
      createdAt: workspace.createdAt,
    };
    addHistory(item);
  };

  const handleDownload = async () => {
    if (!preset) return;
    setBusy("download");
    try {
      const filename = await downloadPresetXmp({
        name: presetName.trim() || preset.styleName,
        styleId: preset.styleId,
        adjust: preset.adjust,
      });
      recordHistory(preset);
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setBusy(null);
    }
  };

  const handleSave = () => {
    if (!preset) return;
    const savedName = presetName.trim() || preset.styleName;
    savePreset({ ...preset, savedName });
    recordHistory(preset);
    toast.success(`Saved “${savedName}” to My Presets`);
  };

  const filter = preset ? previewFilter(preset.adjust) : "none";
  const activeVariation = preset?.variations.find((variant) => Math.round(intensity) === variant.intensity);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">AI Preset Generator</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            One photo. One adaptive film look.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Upload a photograph, choose a simulation, and LUMA measures the image before translating the look into a
            real Camera Raw preset — not a one-size-fits-all filter.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Gemini vision · server-side
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface rounded-2xl p-4">
          {previewUrl ? (
            <div className="space-y-3">
              {preset ? (
                <CompareSlider src={previewUrl} alt="Uploaded photograph" filter={filter} />
              ) : (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Uploaded photograph" className="h-full w-full object-cover opacity-80" />
                  {analyzing ? (
                    <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
                      <div className="flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs text-foreground">
                        <Loader2 className="size-3.5 animate-spin text-primary" /> Reading light and color…
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] text-muted-foreground">
                  {file?.name} · {preset ? "Approximate web preview" : analyzing ? "Analyzing" : "Ready"}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={reset}>
                    <Trash2 className="size-3.5" /> Reset
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setFile(null)}>
                    <Upload className="size-3.5" /> Replace
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <UploadZone
                onFile={handleMainFile}
                title="Drop a photograph or click to browse"
                hint="JPG, PNG, WebP · up to 15 MB · analyzed on the server"
              />
              <div className="flex items-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3 py-2 text-[11px] text-muted-foreground">
                <ArrowRight className="size-3.5 text-primary" />
                Tip: portraits, landscapes, and mixed light all adapt differently.
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <SlidersHorizontal className="size-4 text-primary" /> Image analysis
              </h2>
              {analysis ? (
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                  {analysis.source === "ai" ? "AI vision" : "Measured"}
                </span>
              ) : null}
            </div>

            {analysis ? (
              <div className="mt-4 space-y-4">
                <p className="text-xs leading-relaxed text-muted">{analysis.summary}</p>
                <div className="grid grid-cols-3 gap-2">
                  {analysis.dominantColors.slice(0, 6).map((color, index) => (
                    <div key={`${color}-${index}`} className="space-y-1">
                      <span
                        className="block h-8 rounded-lg ring-1 ring-inset ring-white/10"
                        style={{ background: color }}
                      />
                      <span className="block truncate text-center font-mono text-[10px] text-muted-foreground">
                        {color}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatBar label="Brightness" value={analysis.stats.brightness} />
                  <StatBar label="Contrast" value={analysis.stats.contrast} />
                  <StatBar label="Saturation" value={analysis.stats.saturation} />
                  <StatBar
                    label="Temperature"
                    value={Math.round((analysis.stats.temperature + 100) / 2)}
                    tone="cool"
                  />
                </div>
                <div>
                  <InfoRow label="Scene" value={analysis.sceneType} />
                  <InfoRow label="Light" value={analysis.lighting} />
                  <InfoRow label="White balance" value={analysis.whiteBalance} />
                  <InfoRow label="Mood" value={analysis.mood} />
                  <InfoRow label="Highlights" value={analysis.highlightCondition} />
                  <InfoRow label="Shadows" value={analysis.shadowCondition} />
                  {analysis.portrait ? <InfoRow label="Skin tone" value={analysis.skinTone} /> : null}
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
                <span className="grid size-10 place-items-center rounded-full border border-border bg-secondary text-muted">
                  <Sun className="size-4" />
                </span>
                <p className="text-xs text-muted-foreground">
                  Upload an image to see measured exposure, white balance, and dominant color.
                </p>
              </div>
            )}
          </div>

          <div className="surface rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Layers className="size-4 text-primary" /> Reference image
                <span className="text-[10px] font-normal text-muted-foreground">optional</span>
              </h2>
              {referenceFile ? (
                <button
                  type="button"
                  onClick={clearReference}
                  className="grid size-6 place-items-center rounded-full border border-border text-muted hover:text-foreground"
                  aria-label="Remove reference image"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </div>
            {referenceFile && referenceUrl ? (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={referenceUrl} alt="Reference" className="size-14 rounded-lg object-cover ring-1 ring-inset ring-white/10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-foreground">{referenceFile.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {reference ? `${reference.similarity}% palette similarity` : "Measuring palette…"}
                  </p>
                </div>
              </div>
            ) : (
              <UploadZone
                onFile={handleReferenceFile}
                title="Match a reference palette"
                hint="Blends temperature, tint, saturation, and contrast"
                compact
                className="mt-3"
              />
            )}
            {reference ? <p className="mt-3 text-[11px] leading-relaxed text-muted">{reference.summary}</p> : null}
          </div>
        </div>
      </section>

      <section className="surface rounded-2xl p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                2
              </span>
              Choose a film simulation
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {FILM_STYLES.length} looks · Fujifilm, Kodak, cinematic, and camera profiles
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search looks…"
              className="h-9 sm:w-56"
            />
            <div className="scrollbar-thin flex gap-1 overflow-x-auto">
              {(["All", ...FILM_CATEGORIES] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition",
                    category === item
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted hover:text-foreground"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="scrollbar-thin mt-4 grid max-h-[26rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {visibleStyles.map((item) => (
            <StyleCard key={item.id} style={item} selected={item.id === styleId} onSelect={selectStyle} />
          ))}
          {visibleStyles.length === 0 ? (
            <p className="col-span-full py-10 text-center text-xs text-muted-foreground">
              No simulations match that search.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="surface space-y-5 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                3
              </span>
              Tune the preset
            </h2>
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted">
              {style.name}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Intensity</Label>
              <span className="font-mono text-xs text-primary">{Math.round(intensity)}%</span>
            </div>
            <Slider
              value={[intensity]}
              min={0}
              max={100}
              step={1}
              disabled={!analysis}
              onValueChange={(value) => setIntensity(value[0] ?? 0)}
            />
            <p className="text-[11px] text-muted-foreground">
              Blends the film look into neutral Camera Raw settings. Technical corrections stay separate.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={adaptive}
            onClick={() => setAdaptive((value) => !value)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition",
              adaptive ? "border-primary/30 bg-primary/[0.06]" : "border-border bg-white/[0.02]"
            )}
          >
            <span>
              <span className="block text-xs font-medium text-foreground">Adaptive image correction</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                Bake exposure, white balance, and clipping fixes for this photo
              </span>
            </span>
            <span
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition",
                adaptive ? "bg-primary" : "bg-white/15"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-[#0a0a0b] transition",
                  adaptive ? "left-[18px]" : "left-0.5"
                )}
              />
            </span>
          </button>

          <div className="space-y-2">
            <Label htmlFor="preset-name">Preset name</Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(event) => {
                setPresetName(event.target.value);
                setNameTouched(true);
              }}
              placeholder="Name this preset"
            />
          </div>

          <div className="grid gap-2">
            <Button onClick={handleDownload} disabled={!preset || busy !== null} size="lg">
              {busy === "download" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download .xmp preset
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={handleSave} disabled={!preset || busy !== null}>
                <Save className="size-4" /> Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (preset) setIntensity(preset.variations[1]?.intensity ?? 70);
                }}
                disabled={!preset}
              >
                <Wand2 className="size-4" /> Rebalance
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium text-foreground">Variations</p>
            <div className="mt-2 grid gap-2">
              {preset?.variations.map((variant) => (
                <button
                  key={variant.key}
                  type="button"
                  onClick={() => setIntensity(variant.intensity)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition",
                    activeVariation?.key === variant.key
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-border hover:border-white/20"
                  )}
                >
                  <span>
                    <span className="block text-xs text-foreground">{variant.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{variant.intensity}% · {variant.summary}</span>
                  </span>
                  {activeVariation?.key === variant.key ? <Check className="size-3.5 text-primary" /> : null}
                </button>
              )) ?? (
                <p className="text-[11px] text-muted-foreground">Analyze an image to unlock variations.</p>
              )}
            </div>
          </div>
        </div>

        <div className="surface space-y-4 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Preset result</h2>
            {preset ? (
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {preset.adaptive ? "Adaptive" : "Style only"}
              </span>
            ) : null}
          </div>

          {preset ? (
            <>
              <p className="text-xs leading-relaxed text-muted">{preset.summary}</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg border border-border bg-secondary px-2 py-1 text-[10px] text-muted">
                  <Thermometer className="mr-1 inline size-3" />
                  {preset.analysis.whiteBalance}
                </span>
                <span className="rounded-lg border border-border bg-secondary px-2 py-1 text-[10px] text-muted">
                  {preset.styleName} · {preset.styleCategory}
                </span>
                {preset.reference ? (
                  <span className="rounded-lg border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] text-primary">
                    Reference {preset.reference.similarity}%
                  </span>
                ) : null}
              </div>
              <AdjustmentValues adjust={preset.adjust} />
              <div className="rounded-xl border border-border bg-white/[0.02] p-3 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">Import guide</p>
                <p className="mt-1">
                  Lightroom Classic: Develop → Presets → <span className="text-muted">+</span> → Import Presets. Lightroom
                  CC / Mobile: add the XMP to the <span className="text-muted">Presets</span> folder, then restart.
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground/80">
                  Web preview is an approximation. Camera Raw rendering will differ from the CSS filter.
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-full border border-border bg-secondary text-primary">
                <ApertureIcon />
              </span>
              <div>
                <p className="text-sm text-foreground">Your preset will appear here</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Upload a photo and LUMA will measure the scene before building the look.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ApertureIcon() {
  return <Sparkles className="size-5" />;
}
