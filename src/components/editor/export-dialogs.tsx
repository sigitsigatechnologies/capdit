"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Film, Loader2, ImageIcon, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@/components/ui/controls";
import { Slider } from "@/components/ui/slider";
import { downloadBlob, formatBytes, safeFileName, formatTime } from "@/lib/utils";
import { estimateVideoSize, pickRecorderMime, recorderSupported } from "@/lib/export-video";
import { transcodeToMp4 } from "@/lib/ffmpeg";

function ratio(aspect: string) {
  const [w, h] = aspect.split(":").map(Number);
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? w / h : 16 / 9;
}

function dimsFor(aspect: string, height: number) {
  return { width: Math.round(height * ratio(aspect)), height };
}

export function PhotoExportDialog({
  open,
  onOpenChange,
  aspect,
  title,
  sourceHeight,
  sourceWidth,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aspect: string;
  title: string;
  sourceHeight?: number;
  sourceWidth?: number;
  onExport: (opts: {
    format: "png" | "jpeg" | "webp";
    quality: number;
    width: number;
    height: number;
  }) => Promise<{ blob: Blob; width: number; height: number }>;
}) {
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState(92);
  const [resolution, setResolution] = useState("original");
  const [filename, setFilename] = useState(safeFileName(title));
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ size: number; width: number; height: number; format: string } | null>(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setFilename(safeFileName(title));
      setResolution(sourceHeight && sourceHeight > 2200 ? "original" : "1080");
    }
  }, [open, title, sourceHeight]);

  const target = useMemo(() => {
    if (resolution === "original") {
      if (sourceWidth && sourceHeight) {
        const r = ratio(aspect);
        const base = Math.min(Math.max(sourceWidth, sourceHeight), 4096);
        const h = Math.round(base / Math.max(1, Math.max(sourceWidth, sourceHeight) / Math.min(sourceWidth, sourceHeight)) * 1);
        if (Math.abs(sourceWidth / sourceHeight - r) < 0.01) {
          return { width: Math.min(sourceWidth, 4096), height: Math.min(sourceHeight, 4096) };
        }
        void h;
        return dimsFor(aspect, Math.min(sourceHeight, 2160));
      }
      return dimsFor(aspect, 2160);
    }
    return dimsFor(aspect, Number(resolution));
  }, [resolution, aspect, sourceWidth, sourceHeight]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await onExport({ format, quality, width: target.width, height: target.height });
      downloadBlob(res.blob, `${safeFileName(filename) || "export"}.${format === "jpeg" ? "jpg" : format}`);
      setResult({ size: res.blob.size, width: res.width, height: res.height, format });
      toast.success("Photo exported");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-4 text-violet-300" /> Export photo
          </DialogTitle>
          <DialogDescription>Rendered at full resolution with filters, adjustments and layers baked in.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG (lossless)</SelectItem>
                  <SelectItem value="jpeg">JPG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="1080">1080p</SelectItem>
                  <SelectItem value="1440">2K</SelectItem>
                  <SelectItem value="2160">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted">Output size</span>
              <span className="font-mono text-zinc-200">{target.width} × {target.height}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-muted">Format</span>
              <span className="font-mono uppercase text-zinc-200">{format === "jpeg" ? "jpg" : format}</span>
            </div>
          </div>
          {format !== "png" && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label>Quality</Label>
                <span className="font-mono text-[10px] text-zinc-300">{quality}%</span>
              </div>
              <Slider value={[quality]} min={10} max={100} step={1} onValueChange={(v) => setQuality(v[0])} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>File name</Label>
            <Input value={filename} onChange={(e) => setFilename(e.target.value)} />
          </div>
          {result && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-2.5 text-[11px] text-emerald-200">
              <Check className="size-3.5" />
              Exported {result.width}×{result.height} · {formatBytes(result.size)} · {result.format.toUpperCase()}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {exporting ? "Rendering…" : "Export & download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface VideoExportConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  preferMp4: boolean;
  duration: number;
}

export function VideoExportDialog({
  open,
  onOpenChange,
  aspect,
  title,
  duration,
  fps,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aspect: string;
  title: string;
  duration: number;
  fps: number;
  onExport: (
    config: VideoExportConfig,
    onProgress: (progress: number) => void
  ) => Promise<{ blob: Blob; extension: "mp4" | "webm"; width: number; height: number }> |
    Promise<{ blob: Blob; extension: "mp4" | "webm"; width: number; height: number }>;
}) {
  const [resolution, setResolution] = useState("1080");
  const [fpsChoice, setFpsChoice] = useState(String(fps));
  const [quality, setQuality] = useState("standard");
  const [preferMp4, setPreferMp4] = useState(true);
  const [convertMp4, setConvertMp4] = useState(false);
  const [filename, setFilename] = useState(safeFileName(title));
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "recording" | "converting" | "done">("idle");
  const [result, setResult] = useState<{ blob: Blob; extension: "mp4" | "webm"; url: string } | null>(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setProgress(0);
      setStage("idle");
      setFilename(safeFileName(title));
    }
  }, [open, title]);

  useEffect(() => () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const target = dimsFor(aspect, Number(resolution));
  const bitrateBase =
    resolution === "2160" ? 24_000_000 : resolution === "1440" ? 14_000_000 : resolution === "1080" ? 8_000_000 : 4_000_000;
  const qualityFactor = quality === "high" ? 1.45 : quality === "draft" ? 0.55 : 1;
  const bitrate = Math.round(bitrateBase * qualityFactor);
  const estimate = estimateVideoSize(duration, bitrate);
  const mime = typeof window !== "undefined" ? pickRecorderMime(preferMp4) : null;
  const supported = typeof window !== "undefined" ? recorderSupported() : false;

  async function handleExport() {
    if (!supported) {
      toast.error("Canvas recording is not supported in this browser.");
      return;
    }
    setExporting(true);
    setStage("recording");
    setProgress(0);
    try {
      const res = await onExport(
        {
          width: target.width,
          height: target.height,
          fps: Number(fpsChoice),
          bitrate,
          preferMp4,
          duration,
        },
        (p) => setProgress(p)
      );
      let final = res;
      if (convertMp4 && res.extension === "webm") {
        setStage("converting");
        setProgress(0);
        const mp4 = await transcodeToMp4(res.blob, {
          onProgress: (p) => setProgress(p),
          onLog: () => undefined,
        });
        final = { blob: mp4, extension: "mp4", width: res.width, height: res.height };
      }
      const url = URL.createObjectURL(final.blob);
      setResult({ blob: final.blob, extension: final.extension, url });
      downloadBlob(final.blob, `${safeFileName(filename) || "export"}.${final.extension}`);
      setStage("done");
      toast.success("Video exported");
    } catch (error) {
      toast.error((error as Error).message);
      setStage("idle");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!exporting ? onOpenChange(v) : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="size-4 text-cyan-300" /> Export video
          </DialogTitle>
          <DialogDescription>
            The timeline is rendered in real time — keep this tab visible while recording.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={setResolution} disabled={exporting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="720">720p</SelectItem>
                  <SelectItem value="1080">1080p</SelectItem>
                  <SelectItem value="1440">2K</SelectItem>
                  <SelectItem value="2160">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frame rate</Label>
              <Select value={fpsChoice} onValueChange={setFpsChoice} disabled={exporting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 fps</SelectItem>
                  <SelectItem value="30">30 fps</SelectItem>
                  <SelectItem value="60">60 fps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quality</Label>
              <Select value={quality} onValueChange={setQuality} disabled={exporting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 text-[11px]">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted">Resolution</p>
              <p className="mt-0.5 font-mono text-zinc-200">{target.width}×{target.height}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted">Duration</p>
              <p className="mt-0.5 font-mono text-zinc-200">{formatTime(duration, true)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted">Est. size</p>
              <p className="mt-0.5 font-mono text-zinc-200">{formatBytes(estimate)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
            <div>
              <p className="text-[11px] font-medium">Prefer MP4 container</p>
              <p className="text-[9px] text-muted">
                Detected: {mime ? `${mime.extension.toUpperCase()} via MediaRecorder` : "unsupported browser"}
              </p>
            </div>
            <Switch checked={preferMp4} onCheckedChange={setPreferMp4} disabled={exporting} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
            <div>
              <p className="text-[11px] font-medium">Convert to MP4 with FFmpeg.wasm</p>
              <p className="text-[9px] text-muted">Experimental · downloads core (~30 MB) · slower</p>
            </div>
            <Switch checked={convertMp4} onCheckedChange={setConvertMp4} disabled={exporting} />
          </div>

          <div className="space-y-1.5">
            <Label>File name</Label>
            <Input value={filename} onChange={(e) => setFilename(e.target.value)} disabled={exporting} />
          </div>

          {!supported && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-2.5 text-[11px] text-amber-200">
              <AlertTriangle className="size-3.5" /> This browser cannot record canvas streams. Try Chrome or Edge.
            </div>
          )}

          {stage !== "idle" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted">
                  {stage === "recording" ? "Recording timeline…" : stage === "converting" ? "Transcoding with FFmpeg…" : "Complete"}
                </span>
                <span className="font-mono text-zinc-300">{Math.round(progress * 100)}%</span>
              </div>
              <Progress value={progress * 100} />
            </div>
          )}

          {result && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-2.5">
              <Check className="size-4 text-emerald-300" />
              <div className="min-w-0 flex-1 text-[11px]">
                <p className="font-medium text-emerald-100">
                  {result.extension.toUpperCase()} · {formatBytes(result.blob.size)}
                </p>
                <p className="text-emerald-200/60">Saved to your downloads</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => downloadBlob(result.blob, `${safeFileName(filename)}.${result.extension}`)}>
                <Download className="size-3.5" /> Download
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={exporting}>Close</Button>
          <Button onClick={handleExport} disabled={exporting || !supported}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {exporting ? (stage === "converting" ? "Converting…" : "Recording…") : "Export video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
