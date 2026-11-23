"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Aperture,
  Check,
  Download,
  ImagePlus,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { previewFilter, summarizeAdjustments } from "@/lib/adjustments";
import { FILM_CATEGORIES, FILM_STYLES, getFilmStyle } from "@/lib/luma/film-styles";
import { generateAdaptivePreset, styleAdjustments } from "@/lib/luma/adaptive";
import { downloadPresetXmp } from "@/lib/luma/download";
import type { FilmCategory, ImageAnalysis } from "@/lib/luma/types";
import { cn } from "@/lib/utils";

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

export function SimpleStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [styleId, setStyleId] = useState("teal-orange-pop");
  const [intensity, setIntensity] = useState(100);
  const [presetName, setPresetName] = useState("Teal & Orange");
  const [nameTouched, setNameTouched] = useState(false);
  const [category, setCategory] = useState<FilmCategory | "All">("All");
  const [busy, setBusy] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const scrollFrame = useRef(0);

  const style = useMemo(() => getFilmStyle(styleId) ?? FILM_STYLES[0], [styleId]);
  const visibleStyles = useMemo(
    () => (category === "All" ? FILM_STYLES : FILM_STYLES.filter((item) => item.category === category)),
    [category]
  );

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

  const adjust = useMemo(() => {
    if (analysis) return generateAdaptivePreset(analysis, style, { intensity, adaptive: true }).adjust;
    return styleAdjustments(style, intensity);
  }, [analysis, style, intensity]);

  const summary = summarizeAdjustments(adjust);
  const filter = previewFilter(adjust);

  const applyStyle = useCallback((next: (typeof FILM_STYLES)[number]) => {
    setStyleId(next.id);
    setNameTouched(false);
    setPresetName(next.name);
  }, []);

  const analyze = async (next: File) => {
    if (!validateFile(next)) return;
    setFile(next);
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const body = new FormData();
      body.append("file", next);
      const response = await fetch("/api/analyze", { method: "POST", body });
      const data = (await response.json()) as { analysis?: ImageAnalysis; error?: string };
      if (!response.ok || !data.analysis) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
      toast.success(
        data.analysis.source === "ai"
          ? "Photo analyzed — presets adapted to this frame"
          : "Photo measured — presets adapted locally"
      );
    } catch (error) {
      setAnalysis(null);
      toast.error(error instanceof Error ? error.message : "Could not analyze this image");
    } finally {
      setAnalyzing(false);
    }
  };

  const centerCard = useCallback((id: string) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>(`[data-preset-id="${id}"]`);
    if (!card) return;
    const railRect = rail.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const target =
      rail.scrollLeft + (cardRect.left - railRect.left) - (rail.clientWidth - cardRect.width) / 2;
    rail.scrollTo({ left: target, behavior: "smooth" });
  }, []);

  const selectFromCard = (next: (typeof FILM_STYLES)[number]) => {
    applyStyle(next);
    centerCard(next.id);
  };

  const handleRailScroll = () => {
    if (scrollFrame.current) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;
      const rail = railRef.current;
      if (!rail) return;
      const center = rail.scrollLeft + rail.clientWidth / 2;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      Array.from(rail.children).forEach((child, index) => {
        const card = child as HTMLElement;
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(cardCenter - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      const next = visibleStyles[bestIndex];
      if (next && next.id !== styleId) applyStyle(next);
    });
  };

  const changeCategory = (next: FilmCategory | "All") => {
    setCategory(next);
    const list = next === "All" ? FILM_STYLES : FILM_STYLES.filter((item) => item.category === next);
    if (list.length && !list.some((item) => item.id === styleId)) applyStyle(list[0]);
    railRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const shuffle = () => {
    const pool = visibleStyles.length ? visibleStyles : FILM_STYLES;
    const next = pool[Math.floor(Math.random() * pool.length)];
    applyStyle(next);
    centerCard(next.id);
  };

  const download = async () => {
    setBusy(true);
    try {
      const filename = await downloadPresetXmp({
        name: presetName.trim() || style.name,
        styleId: style.id,
        adjust,
      });
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-foreground text-background">
              <Aperture className="size-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-semibold tracking-[0.16em] text-foreground">
                LUMA CAPDIT
              </span>
              <span className="block text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Studio Presets
              </span>
            </span>
          </div>
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] text-muted">
            {FILM_STYLES.length} looks
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        <section>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[26px] border border-border bg-secondary">
            {previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Your photograph"
                  className="h-full w-full object-cover transition-[filter] duration-200"
                  style={{ filter: showOriginal ? "none" : filter }}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-transparent" />
                <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
                    {style.name}
                  </span>
                  {analysis ? (
                    <span className="rounded-full border border-white/25 bg-white/90 px-2.5 py-1 text-[10px] font-medium text-black backdrop-blur">
                      {analysis.source === "ai" ? "AI adapted" : "Adapted"}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onPointerDown={() => setShowOriginal(true)}
                  onPointerUp={() => setShowOriginal(false)}
                  onPointerLeave={() => setShowOriginal(false)}
                  onPointerCancel={() => setShowOriginal(false)}
                  className="absolute bottom-3 right-3 rounded-full border border-white/25 bg-black/50 px-3 py-1.5 text-[10px] font-medium text-white backdrop-blur active:bg-black/70"
                >
                  Hold to compare
                </button>

                {analyzing ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-black shadow-lg">
                      <Loader2 className="size-3.5 animate-spin" /> Reading light…
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(500px_260px_at_50%_0%,#ffffff,transparent_70%),linear-gradient(160deg,#f0f0eb,#e5e5dd)] text-center transition active:scale-[0.995]"
              >
                <span className="grid size-14 place-items-center rounded-full border border-border bg-white text-foreground shadow-sm">
                  <ImagePlus className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Tap to add a photo</span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    Optional — presets preview even without one
                  </span>
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (next) void analyze(next);
                event.target.value = "";
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[10px] text-muted-foreground">
            <span className="truncate">
              {analysis
                ? `${analysis.sceneType} · ${analysis.whiteBalance} · ${analysis.lighting}`
                : analyzing
                  ? "Analyzing light and color…"
                  : previewUrl
                    ? "Style preview"
                    : "No photo — style preview only"}
            </span>
            {previewUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 font-medium text-foreground underline decoration-border underline-offset-2"
              >
                Replace
              </button>
            ) : (
              <span className="shrink-0">Swipe presets below</span>
            )}
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Swipe to try looks</h2>
              <p className="text-[10px] text-muted-foreground">
                {visibleStyles.length} presets · the centered card is applied
              </p>
            </div>
            <button
              type="button"
              onClick={shuffle}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground"
            >
              <RefreshCw className="size-3" /> Shuffle
            </button>
          </div>

          <div className="scrollbar-thin -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
            {(["All", ...FILM_CATEGORIES] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => changeCategory(item)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium transition",
                  category === item
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-muted"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div
            ref={railRef}
            onScroll={handleRailScroll}
            className="scrollbar-thin relative -mx-4 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-4 pb-2"
          >
            {visibleStyles.map((item) => {
              const active = item.id === styleId;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-preset-id={item.id}
                  onClick={() => selectFromCard(item)}
                  className={cn(
                    "relative w-28 shrink-0 snap-center rounded-2xl border p-1.5 text-left transition-all",
                    active
                      ? "border-foreground bg-foreground/[0.04] shadow-[0_8px_24px_-14px_rgba(13,13,13,0.45)]"
                      : "border-border bg-card"
                  )}
                >
                  <span
                    className="block h-[72px] rounded-xl ring-1 ring-inset ring-black/10"
                    style={{
                      background: `linear-gradient(120deg, ${item.swatch[0]} 0%, ${item.swatch[1]} 55%, ${item.swatch[2]} 100%)`,
                    }}
                  />
                  <span className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
                    <span className="truncate text-[10px] font-medium text-foreground">{item.name}</span>
                    {active ? <Check className="size-3 shrink-0 text-foreground" /> : null}
                  </span>
                  <span className="block truncate px-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                    {item.category}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-foreground">{style.name}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {style.category}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] text-muted">
              {summary}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">{style.description}</p>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Strength</Label>
              <span className="font-mono text-[11px] text-foreground">{Math.round(intensity)}%</span>
            </div>
            <Slider
              value={[intensity]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => setIntensity(value[0] ?? 0)}
            />
          </div>

          <div className="mt-4 space-y-1.5">
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
        </section>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Sparkles className="size-3" />
          Looks are original interpretations of popular film and social presets.
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{presetName.trim() || style.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {style.category} · {Math.round(intensity)}% strength
            </p>
          </div>
          <Button size="lg" className="rounded-full px-6" onClick={download} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
