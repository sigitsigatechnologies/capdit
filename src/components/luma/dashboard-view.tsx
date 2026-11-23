"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Aperture,
  Camera,
  Download,
  Film,
  History,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { FILM_STYLES, getFilmStyle } from "@/lib/luma/film-styles";
import { useLumaStore } from "@/lib/luma/store";
import { cn } from "@/lib/utils";

const FEATURED = ["classic-chrome", "kodak-portra-400", "cinematic-teal-orange", "velvia-vivid"];

const STEPS = [
  {
    icon: Upload,
    title: "Upload a photo",
    body: "LUMA measures exposure, white balance, clipping, skin, and dominant color — with Gemini vision when available.",
  },
  {
    icon: Film,
    title: "Pick a simulation",
    body: "Choose from Fujifilm, Kodak, cinematic grades, and camera profiles. Tune intensity from 0–100.",
  },
  {
    icon: Download,
    title: "Download the .xmp",
    body: "Get a validated Camera Raw preset that imports into Lightroom Classic, CC, and Mobile.",
  },
];

function Stat({ icon: Icon, label, value, href }: { icon: typeof Aperture; label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-white/20"
    >
      <span className="grid size-10 place-items-center rounded-xl border border-border bg-secondary text-primary">
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-lg font-semibold leading-none text-foreground">{value}</span>
        <span className="mt-1 block text-[11px] text-muted-foreground">{label}</span>
      </span>
      <ArrowRight className="ml-auto size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

export function DashboardView() {
  const [mounted, setMounted] = useState(false);
  const presets = useLumaStore((state) => state.presets);
  const history = useLumaStore((state) => state.history);

  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-8">
      <section className="surface relative overflow-hidden rounded-3xl p-6 md:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-[#8a6a48]/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            <Sparkles className="size-3" /> Adaptive film simulations
          </span>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-tight md:text-[2.6rem]">
            Film looks, <span className="gradient-text">adapted to your photograph.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            LUMA reads the light, color, and contrast of each image before translating a film simulation into real
            Lightroom Camera Raw settings. No generic filters — a preset built for that frame.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/generate"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_40px_-18px_rgba(230,195,155,0.75)] transition hover:bg-[#f0d3b3]"
            >
              <Wand2 className="size-4" /> Generate a preset
            </Link>
            <Link
              href="/library"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              <Film className="size-4" /> Browse film library
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Aperture} label="Film simulations" value={String(FILM_STYLES.length)} href="/library" />
        <Stat icon={Camera} label="Saved presets" value={mounted ? String(presets.length) : "—"} href="/presets" />
        <Stat icon={History} label="Generation history" value={mounted ? String(history.length) : "—"} href="/history" />
        <Stat icon={Download} label="Validated XMP export" value="Yes" href="/settings" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Featured looks</h2>
            <Link href="/library" className="text-[11px] text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FEATURED.map((id) => {
              const style = getFilmStyle(id);
              if (!style) return null;
              return (
                <Link
                  key={id}
                  href={`/generate?style=${id}`}
                  className="group rounded-2xl border border-border bg-white/[0.015] p-4 transition hover:border-primary/30 hover:bg-primary/[0.04]"
                >
                  <span
                    className="block h-14 rounded-xl ring-1 ring-inset ring-white/10"
                    style={{
                      background: `linear-gradient(100deg, ${style.swatch[0]} 0%, ${style.swatch[1]} 50%, ${style.swatch[2]} 100%)`,
                    }}
                  />
                  <p className="mt-3 text-sm font-medium">{style.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{style.category}</p>
                  <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted">{style.description}</p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="surface rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent presets</h2>
            <Link href="/presets" className="text-[11px] text-primary hover:underline">
              Manage
            </Link>
          </div>
          {mounted && presets.length > 0 ? (
            <div className="mt-4 space-y-2">
              {presets.slice(0, 4).map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white/[0.015] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{preset.savedName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {preset.styleName} · {preset.summary}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{preset.intensity}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
              <span className="grid size-10 place-items-center rounded-full border border-border bg-secondary text-muted">
                <Film className="size-4" />
              </span>
              <p className="text-xs text-muted-foreground">
                {mounted ? "No saved presets yet." : "Loading local presets…"}
              </p>
              <Link href="/generate" className="text-[11px] text-primary hover:underline">
                Build your first look
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl border border-border bg-secondary text-primary">
                <step.icon className="size-4" />
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
            </div>
            <p className={cn("mt-4 text-sm font-medium text-foreground")}>{step.title}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{step.body}</p>
          </div>
        ))}
      </section>

      <p className="text-center text-[10px] text-muted-foreground/70">
        Every export is validated Adobe Camera Raw XML. Web previews are approximate — Lightroom rendering differs.
      </p>
    </div>
  );
}
