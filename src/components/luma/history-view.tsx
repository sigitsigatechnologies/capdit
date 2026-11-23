"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, History as HistoryIcon, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadPresetXmp } from "@/lib/luma/download";
import { useLumaStore } from "@/lib/luma/store";
import { AdjustmentValues } from "./adjustment-values";

export function HistoryView() {
  const [mounted, setMounted] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const history = useLumaStore((state) => state.history);
  const removeHistory = useLumaStore((state) => state.removeHistory);
  const clearHistory = useLumaStore((state) => state.clearHistory);

  useEffect(() => setMounted(true), []);

  const download = async (id: string) => {
    const item = history.find((entry) => entry.id === id);
    if (!item) return;
    setBusyId(id);
    try {
      await downloadPresetXmp({
        name: item.styleName,
        styleId: item.styleId,
        adjust: item.adjust,
      });
      toast.success("History preset downloaded");
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
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">History</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Recent generations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Every preset you downloaded or saved is recorded locally so you can revisit the look.
          </p>
        </div>
        {mounted && history.length > 0 ? (
          <Button
            variant="outline"
            onClick={() => {
              clearHistory();
              toast.success("History cleared");
            }}
          >
            <Trash2 className="size-4" /> Clear history
          </Button>
        ) : null}
      </header>

      {!mounted ? (
        <div className="surface grid place-items-center rounded-2xl p-16 text-xs text-muted-foreground">
          Loading history…
        </div>
      ) : history.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 rounded-2xl p-16 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-border bg-secondary text-primary">
            <HistoryIcon className="size-5" />
          </span>
          <div>
            <p className="text-sm text-foreground">Nothing here yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Generate and download a preset to start your history.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="surface flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.styleName}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.styleCategory} · {item.summary} ·{" "}
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <AdjustmentValues adjust={item.adjust} className="mt-2 md:hidden" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => download(item.id)} disabled={busyId !== null}>
                  {busyId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeHistory(item.id)}
                  aria-label="Remove history item"
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
