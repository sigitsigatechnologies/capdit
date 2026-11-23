"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, FolderOpen, ImageIcon, Moon, ShieldCheck, Smartphone, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLumaStore } from "@/lib/luma/store";
import { cn } from "@/lib/utils";

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition",
        checked ? "border-primary/30 bg-primary/[0.06]" : "border-border bg-white/[0.02]"
      )}
    >
      <span>
        <span className="block text-xs font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-[#0a0a0b] transition", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function SettingsView() {
  const [mounted, setMounted] = useState(false);
  const settings = useLumaStore((state) => state.settings);
  const updateSettings = useLumaStore((state) => state.updateSettings);
  const clearPresets = useLumaStore((state) => state.clearPresets);
  const clearHistory = useLumaStore((state) => state.clearHistory);

  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Settings</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Studio preferences</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          AI credentials stay on the server. Your presets and history live only in this browser.
        </p>
      </header>

      <section className="surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" /> AI engine
        </h2>
        <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted">
          <p>
            Image understanding runs through Gemini vision on the server when a key is configured. If it is unavailable,
            LUMA falls back to local Sharp-based measurement so the preset is still image-specific.
          </p>
          <p className="text-muted-foreground">
            API keys are never sent to or stored in the browser.
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3 py-2 text-[11px]">
          <span className="grid size-5 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Check className="size-3" />
          </span>
          <span className="text-muted">Server-side vision pipeline configured</span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">gemini · interactions</span>
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Moon className="size-4 text-primary" /> Generation
        </h2>
        <div className="mt-3 space-y-2">
          <Toggle
            checked={mounted ? settings.adaptiveDefault : true}
            onChange={(value) => {
              updateSettings({ adaptiveDefault: value });
              toast.success(value ? "Adaptive correction enabled by default" : "Adaptive correction disabled by default");
            }}
            label="Adaptive image correction by default"
            description="Bake exposure, white-balance, and clipping corrections into new presets unless you turn it off."
          />
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4 text-primary" /> Privacy & data
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Uploaded images are processed in memory for analysis and are not stored by LUMA. Presets, history, and
          preferences are saved in this browser&apos;s localStorage.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!window.confirm("Delete all saved presets from this browser?")) return;
              clearPresets();
              toast.success("Saved presets cleared");
            }}
          >
            <Trash2 className="size-3.5" /> Clear saved presets
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!window.confirm("Delete generation history from this browser?")) return;
              clearHistory();
              toast.success("History cleared");
            }}
          >
            <Trash2 className="size-3.5" /> Clear history
          </Button>
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <FolderOpen className="size-4 text-primary" /> How to import your XMP
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <ImageIcon className="size-3.5 text-primary" /> Lightroom Classic
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-muted">
              <li>Open Develop and the Presets panel.</li>
              <li>Click the + icon, then Import Presets.</li>
              <li>Select the downloaded .xmp file.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Sparkles className="size-3.5 text-primary" /> Lightroom CC
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-muted">
              <li>Open the Presets panel on the right.</li>
              <li>Use the Presets menu and choose Import.</li>
              <li>Pick the .xmp file and apply it to your photo.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Smartphone className="size-3.5 text-primary" /> Lightroom Mobile
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-muted">
              <li>Save the .xmp to your device or Files app.</li>
              <li>In the preset menu, choose Import Preset.</li>
              <li>Select the file to add it to your library.</li>
            </ol>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-white/[0.02] p-3 text-[10px] leading-relaxed text-muted-foreground">
          LUMA validates each file for the Camera Raw namespace, preset UUID, Process Version 11, and parameter ranges
          before download. Presets are built with Camera Raw 2012 settings and are intended for current Lightroom
          releases.
        </div>
      </section>
    </div>
  );
}
