"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadPresetXmp } from "@/lib/luma/download";
import { useLumaStore } from "@/lib/luma/store";
import { AdjustmentValues } from "./adjustment-values";

export function PresetsView() {
  const [mounted, setMounted] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const presets = useLumaStore((state) => state.presets);
  const removePreset = useLumaStore((state) => state.removePreset);

  useEffect(() => setMounted(true), []);

  const download = async (id: string) => {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    setBusyId(id);
    try {
      await downloadPresetXmp({
        name: preset.savedName,
        styleId: preset.styleId,
        adjust: preset.adjust,
      });
      toast.success(`Downloaded ${preset.savedName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">My Presets</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Saved looks</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Presets you saved are stored in this browser. Re-download the exact Camera Raw settings at any time.
          </p>
        </div>
        <Link
          href="/generate"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#f0d3b3]"
        >
          <Plus className="size-4" /> New preset
        </Link>
      </header>

      {!mounted ? (
        <div className="surface grid place-items-center rounded-2xl p-16 text-xs text-muted-foreground">
          Loading local presets…
        </div>
      ) : presets.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 rounded-2xl p-16 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-border bg-secondary text-primary">
            <Plus className="size-5" />
          </span>
          <div>
            <p className="text-sm text-foreground">No presets saved yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Generate a look, then press Save.</p>
          </div>
          <Link href="/generate" className="text-xs text-primary hover:underline">
            Open the generator
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {presets.map((preset) => (
            <div key={preset.id} className="surface rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{preset.savedName}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {preset.styleName} · {preset.styleCategory} ·{" "}
                    {new Date(preset.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted">
                  {Math.round(preset.intensity)}%
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{preset.summary}</p>
              <AdjustmentValues adjust={preset.adjust} className="mt-3" />
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => download(preset.id)}
                  disabled={busyId !== null}
                  className="flex-1"
                >
                  {busyId === preset.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Download .xmp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    removePreset(preset.id);
                    toast.success("Preset removed");
                  }}
                  aria-label={`Delete ${preset.savedName}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
