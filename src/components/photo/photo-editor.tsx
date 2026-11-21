"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Canvas,
  FabricImage,
  type FabricObject,
} from "fabric";
import {
  ImageIcon,
  Upload,
  SlidersHorizontal,
  Crop,
  Type,
  Sticker,
  Sparkles,
  Layers,
  Wand2,
  PaintBucket,
  Film,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  RotateCcw,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { useProjectStore } from "@/store/projects";
import { usePhotoStore } from "@/store/photo";
import { useMediaUrl } from "@/lib/use-media";
import { getAssetRecord } from "@/lib/media";
import { analyzeImageStats, isAIReady, runRemoteAI, suggestAutoColor, suggestAutoEnhance, type AIIntent, type AITool } from "@/lib/ai";
import { resolveAdjustments } from "@/lib/presets";
import { exportCanvas, preparePhotoBase } from "@/lib/image-processing";
import { exportPhoto } from "@/lib/export-photo";
import { createDefaultVideoDoc, createMediaClip } from "@/lib/video";
import { aspectToRatio } from "@/lib/media";
import type { PhotoDoc, ProjectRecord, SerializedObject } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { EditorTopBar } from "@/components/editor/top-bar";
import { LeftRail, type RailItem } from "@/components/editor/left-rail";
import { SliderRow } from "@/components/editor/slider-row";
import { MediaPanel } from "@/components/editor/media-panel";
import { FilterStrip } from "@/components/editor/filter-strip";
import { AIPanel } from "@/components/editor/ai-panel";
import { PhotoExportDialog } from "@/components/editor/export-dialogs";
import { AISettingsDialog } from "@/components/ai-settings";
import {
  AdjustPanel,
  BackgroundPanel,
  CropPanel,
  CustomPresetsPanel,
  EffectsPanel,
  LayerList,
  ObjectInspector,
  TextPanel,
} from "./panels";
import {
  createStickerObject,
  createTextObject,
  objectFromSerialized,
  serializeObject,
} from "./helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/shell";
import { TEXT_STYLE_PRESETS } from "@/lib/text-presets";

const RAIL: RailItem[] = [
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "filters", label: "Filters", icon: Sparkles },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
  { id: "crop", label: "Crop", icon: Crop },
  { id: "text", label: "Text", icon: Type },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "background", label: "Backdrop", icon: PaintBucket },
  { id: "effects", label: "Effects", icon: Wand2 },
  { id: "ai", label: "AI Tools", icon: Layers },
  { id: "slideshow", label: "Slideshow", icon: Film },
];

const ASPECT_OPTIONS = ["16:9", "9:16", "1:1", "4:5", "3:2", "4:3"];

export function PhotoEditor({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { getProject, saveProject } = useProjectStore();
  const { doc, history, future, dirty, init, setDoc, markSaved, undo, redo, setAdjustments, setBackground, setCrop, setAspect, setObjects, setCanvasSize, snapshot } = usePhotoStore();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const projectRef = useRef<ProjectRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("Untitled photo");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [activeTool, setActiveTool] = useState("adjust");
  const [viewport, setViewport] = useState({ width: 800, height: 500 });
  const [imageReady, setImageReady] = useState(false);
  const [selected, setSelected] = useState<SerializedObject | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [busyAI, setBusyAI] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fabricRef = useRef<Canvas | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const backgroundRef = useRef<FabricImage | null>(null);
  const lastSyncedRef = useRef<string>("[]");
  const rebuildingRef = useRef(false);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processTimer = useRef<number | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const projectAssets = useProjectStore((s) => s.assets);
  const assetUrl = useMediaUrl(doc.assetId);
  const asset = useMemo(
    () => projectAssets.find((a) => a.id === doc.assetId),
    [doc.assetId, projectAssets]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await getProject(projectId);
      if (cancelled) return;
      if (!found || found.mode !== "photo" || !found.photo) {
        setNotFound(true);
        return;
      }
      setProject(found);
      projectRef.current = found;
      setName(found.name);
      init(found.photo);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!assetUrl) {
      imageRef.current = null;
      setImageReady(false);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      setImageReady(true);
    };
    img.onerror = () => {
      if (!cancelled) toast.error("Could not decode this photo. Try JPG, PNG or WebP.");
    };
    img.src = assetUrl;
    return () => {
      cancelled = true;
    };
  }, [assetUrl]);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const resize = () => {
      const rect = el.getBoundingClientRect();
      const ratio = aspectToRatio(doc.aspect);
      let w = Math.max(200, rect.width - 64);
      let h = Math.max(160, rect.height - 64);
      if (w / h > ratio) w = h * ratio;
      else h = w / ratio;
      setViewport({ width: Math.floor(w), height: Math.floor(h) });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc.aspect]);

  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return;
    const canvas = new Canvas(canvasElRef.current, {
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: "#0a0b0f",
      fireRightClick: true,
      stopContextMenu: true,
    });
    fabricRef.current = canvas;

    const sync = () => {
      if (rebuildingRef.current) return;
      const objects = canvas.getObjects().map((obj) => serializeObject(obj));
      lastSyncedRef.current = JSON.stringify(objects);
      setObjects(objects);
      const active = canvas.getActiveObject();
      setSelected(active ? serializeObject(active) : null);
    };

    const onModified = () => sync();
    const onSelection = () => {
      const active = canvas.getActiveObject();
      setSelected(active ? serializeObject(active) : null);
    };
    const onCleared = () => setSelected(null);
    const onAdded = () => {
      if (rebuildingRef.current) return;
      sync();
    };
    const onRemoved = () => {
      if (rebuildingRef.current) return;
      sync();
    };
    const onMouseDown = (opt: { target?: FabricObject }) => {
      if (opt.target) usePhotoStore.getState().snapshot();
    };
    const onDblClick = (opt: { target?: FabricObject }) => {
      const target = opt.target as unknown as { enterEditing?: () => void; selectAll?: () => void } | undefined;
      if (target?.enterEditing) {
        target.enterEditing();
        target.selectAll?.();
      }
    };

    canvas.on("object:modified", onModified);
    canvas.on("selection:created", onSelection);
    canvas.on("selection:updated", onSelection);
    canvas.on("selection:cleared", onCleared);
    canvas.on("object:added", onAdded);
    canvas.on("object:removed", onRemoved);
    canvas.on("mouse:dblclick", onDblClick as never);
    canvas.on("mouse:down", onMouseDown as never);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width: viewport.width, height: viewport.height });
    canvas.requestRenderAll();
  }, [viewport]);

  useEffect(() => {
    if (viewport.width > 0) setCanvasSize(viewport.width, viewport.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.width, viewport.height]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (!imageReady || !imageRef.current) {
      canvas.backgroundImage = undefined as never;
      backgroundRef.current?.dispose();
      backgroundRef.current = null;
      canvas.requestRenderAll();
      return;
    }
    if (processTimer.current) window.clearTimeout(processTimer.current);
    processTimer.current = window.setTimeout(() => {
      try {
        const resolved = resolveAdjustments(doc.adjustments, doc.filterId, doc.filterIntensity);
        const base = preparePhotoBase(
          imageRef.current as HTMLImageElement,
          resolved.adjustments,
          doc,
          resolved.overlay,
          1200
        );
        let stage = exportCanvas(base, doc.background, viewport.width, viewport.height);
        if (doc.background.type === "transparent") {
          stage = drawChecker(stage);
        } else if (doc.background.type === "none" && doc.background.keyed) {
          stage = drawChecker(stage);
        }
        stageCanvasRef.current = stage;
        const fabricImg = new FabricImage(stage, {
          originX: "left",
          originY: "top",
          selectable: false,
          evented: false,
        });
        canvas.backgroundImage = fabricImg;
        backgroundRef.current?.dispose();
        backgroundRef.current = fabricImg;
        canvas.requestRenderAll();
      } catch (error) {
        toast.error(`Preview failed: ${(error as Error).message}`);
      }
    }, 40);
    return () => {
      if (processTimer.current) window.clearTimeout(processTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    doc.adjustments,
    doc.filterId,
    doc.filterIntensity,
    doc.crop,
    doc.background,
    doc.rotation,
    doc.flipX,
    doc.flipY,
    viewport,
    imageReady,
  ]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const target = JSON.stringify(doc.objects);
    if (target === lastSyncedRef.current) return;
    rebuildingRef.current = true;
    const existing = canvas.getObjects();
    for (const obj of existing) canvas.remove(obj);
    for (const serialized of doc.objects) {
      const obj = objectFromSerialized(serialized);
      canvas.add(obj);
    }
    lastSyncedRef.current = target;
    rebuildingRef.current = false;
    setSelected(null);
    canvas.requestRenderAll();
  }, [doc.objects]);

  const save = useCallback(
    async (silent = false) => {
      const current = projectRef.current;
      if (!current) return;
      setSaveState("saving");
      try {
        const docNow = usePhotoStore.getState().doc;
        const thumbnail = stageCanvasRef.current
          ? shrinkDataUrl(stageCanvasRef.current.toDataURL("image/jpeg", 0.6))
          : current.thumbnail;
        const updated: ProjectRecord = {
          ...current,
          name,
          aspect: docNow.aspect,
          photo: { ...docNow },
          thumbnail,
          updatedAt: Date.now(),
        };
        await saveProject(updated);
        projectRef.current = updated;
        setProject(updated);
        markSaved();
        setSaveState("saved");
        if (!silent) toast.success("Project saved");
      } catch (error) {
        setSaveState("error");
        toast.error(`Save failed: ${(error as Error).message}`);
      }
    },
    [name, saveProject, markSaved]
  );

  useEffect(() => {
    if (!project) return;
    if (!dirty) return;
    setSaveState("dirty");
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => save(true), 1600);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (!typing && (e.key === "Delete" || e.key === "Backspace")) {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (active) {
          e.preventDefault();
          snapshot();
          canvas?.remove(active);
          canvas?.discardActiveObject();
          canvas?.requestRenderAll();
          setSelected(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, snapshot]);

  const syncToStore = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects().map((obj) => serializeObject(obj));
    lastSyncedRef.current = JSON.stringify(objects);
    setObjects(objects);
  }, [setObjects]);

  function updateSelected(patch: Partial<SerializedObject>) {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject() as (FabricObject & Record<string, unknown>) | undefined;
    if (!canvas || !obj) return;
    snapshot();
    const fabricPatch: Record<string, unknown> = {};
    if (patch.text !== undefined) obj.set("text", patch.text);
    if (patch.left !== undefined) fabricPatch.left = patch.left;
    if (patch.top !== undefined) fabricPatch.top = patch.top;
    if (patch.scaleX !== undefined) fabricPatch.scaleX = patch.scaleX;
    if (patch.scaleY !== undefined) fabricPatch.scaleY = patch.scaleY;
    if (patch.angle !== undefined) fabricPatch.angle = patch.angle;
    if (patch.opacity !== undefined) fabricPatch.opacity = patch.opacity / 100;
    if (patch.fill !== undefined) fabricPatch.fill = patch.fill;
    if (patch.fontFamily !== undefined) fabricPatch.fontFamily = patch.fontFamily;
    if (patch.fontSize !== undefined) fabricPatch.fontSize = patch.fontSize;
    if (patch.fontWeight !== undefined) fabricPatch.fontWeight = patch.fontWeight;
    if (patch.fontStyle !== undefined) fabricPatch.fontStyle = patch.fontStyle;
    if (patch.textAlign !== undefined) fabricPatch.textAlign = patch.textAlign;
    if (patch.charSpacing !== undefined) fabricPatch.charSpacing = patch.charSpacing;
    if (patch.lineHeight !== undefined) fabricPatch.lineHeight = patch.lineHeight;
    if (patch.underline !== undefined) fabricPatch.underline = patch.underline;
    if (patch.width !== undefined) fabricPatch.width = patch.width;
    if (patch.backgroundColor !== undefined) fabricPatch.backgroundColor = patch.backgroundColor;
    if (patch.stroke !== undefined) fabricPatch.stroke = patch.stroke;
    if (patch.strokeWidth !== undefined) fabricPatch.strokeWidth = patch.strokeWidth;
    if (patch.shadow !== undefined) fabricPatch.shadow = patch.shadow;
    if (Object.keys(fabricPatch).length) obj.set(fabricPatch as never);
    obj.setCoords();
    canvas.requestRenderAll();
    setSelected(serializeObject(obj));
    syncToStore();
  }

  function addText(presetId: string | null) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    snapshot();
    const preset = TEXT_STYLE_PRESETS.find((p) => p.id === presetId);
    const scale = viewport.width / 860;
    const obj = createTextObject({
      left: viewport.width * 0.16,
      top: viewport.height * 0.4,
      width: viewport.width * 0.68,
      text: preset ? preset.preview : "Your text",
      ...(preset
        ? {
            fontFamily: preset.style.fontFamily,
            fontSize: Math.round(preset.style.fontSize * Math.max(0.6, scale)),
            fill: preset.style.color,
            fontWeight: preset.style.bold ? "700" : "normal",
            fontStyle: preset.style.italic ? "italic" : "normal",
            textAlign: preset.style.align,
            backgroundColor: preset.style.background,
            stroke: preset.style.stroke,
            charSpacing: preset.style.letterSpacing,
            lineHeight: preset.style.lineHeight,
            shadow: preset.style.shadow
              ? { color: "rgba(0,0,0,0.7)", blur: 12, offsetX: 0, offsetY: 4 }
              : null,
          }
        : {}),
    });
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    setSelected(serializeObject(obj));
    syncToStore();
    setActiveTool("text");
    toast.success("Text layer added — double-click to edit");
  }

  function addSticker(emoji: string) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    snapshot();
    const obj = createStickerObject(emoji, viewport.width / 2, viewport.height / 2, Math.round(viewport.width * 0.12));
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    setSelected(serializeObject(obj));
    syncToStore();
  }

  function deleteSelected() {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    snapshot();
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setSelected(null);
  }

  function duplicateSelected() {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    snapshot();
    obj.clone().then((clone) => {
      clone.set({ left: (obj.left ?? 0) + 24, top: (obj.top ?? 0) + 24 });
      (clone as unknown as { capditId: string }).capditId = uid("obj");
      canvas.add(clone);
      canvas.setActiveObject(clone);
      canvas.requestRenderAll();
      syncToStore();
    });
  }

  function moveLayer(dir: "up" | "down") {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    snapshot();
    if (dir === "up") canvas.bringObjectForward(obj);
    else canvas.sendObjectBackwards(obj);
    canvas.requestRenderAll();
    syncToStore();
  }

  function selectLayer(id: string) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getObjects().find((o) => (o as unknown as { capditId?: string }).capditId === id);
    if (obj) {
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
      setSelected(serializeObject(obj));
    }
  }

  async function analyzeAndApply(kind: "enhance" | "color") {
    if (!doc.assetId) {
      toast.error("Add a photo first");
      return;
    }
    const record = await getAssetRecord(doc.assetId);
    if (!record) return;
    const stats = await analyzeImageStats(record.blob);
    if (!stats) {
      toast.error("Could not analyze this image");
      return;
    }
    const suggestion = kind === "enhance" ? suggestAutoEnhance(stats) : suggestAutoColor(stats);
    setAdjustments(suggestion);
    toast.success(kind === "enhance" ? "Auto enhance applied" : "White balance corrected");
  }

  function smartCrop() {
    if (!asset?.width || !asset?.height) return;
    const size = Math.min(asset.width, asset.height);
    setAspect("1:1");
    setCrop({
      x: (asset.width - size) / 2,
      y: (asset.height - size) / 2,
      width: size,
      height: size,
    });
    toast.success("Smart crop centered to 1:1");
  }

  async function handleAITool(tool: AITool) {
    setBusyAI(tool.id);
    try {
      switch (tool.id) {
        case "auto-enhance":
          await analyzeAndApply("enhance");
          break;
        case "auto-color":
          await analyzeAndApply("color");
          break;
        case "smart-crop":
          smartCrop();
          break;
        case "denoise":
          setAdjustments({ blur: 6, sharpness: 18, grain: 0 });
          toast.success("Local denoise applied · detail restored");
          break;
        case "sharpness":
          setAdjustments({ sharpness: 38 });
          toast.success("Detail boost applied");
          break;
        case "bg-remove":
        case "portrait": {
          if (tool.id === "bg-remove") {
            setBackground({ keyed: true, type: "color" });
            toast.info("Local color-key removal enabled. Tune tolerance in Backdrop.");
            if (!isAIReady()) return;
          }
          const provider = await runRemoteAI({
            task: "background-removal",
            imageDataUrl: stageCanvasRef.current?.toDataURL("image/jpeg", 0.7),
          });
          if (!provider.ok) {
            toast.info(provider.message);
            setAiOpen(true);
          } else {
            toast.success(provider.message);
          }
          break;
        }
        default: {
          const provider = await runRemoteAI({
            task: tool.id,
            imageDataUrl: stageCanvasRef.current?.toDataURL("image/jpeg", 0.7),
          });
          toast.info(provider.message);
          if (!provider.ok) setAiOpen(true);
        }
      }
    } finally {
      setBusyAI(null);
    }
  }

  function applyPrompt(intent: AIIntent, prompt: string) {
    if (intent.needsProvider) {
      toast.error(`${intent.needsProvider} requires an AI provider API key.`);
      setAiOpen(true);
      return;
    }
    const nextDoc: PhotoDoc = {
      ...doc,
      adjustments: {
        ...doc.adjustments,
        ...Object.fromEntries(
          Object.entries(intent.adjustments).map(([k, v]) => [
            k,
            Math.max(
              -100,
              Math.min(
                100,
                (doc.adjustments[k as keyof typeof doc.adjustments] ?? 0) + Number(v ?? 0)
              )
            ),
          ])
        ),
      },
      filterId: intent.filterId ?? doc.filterId,
      aspect: intent.aspect ?? doc.aspect,
    };
    setDoc(nextDoc);
    if (intent.addSubtitles) {
      const canvas = fabricRef.current;
      if (canvas) {
        canvas.add(
          createTextObject({
            text: "Your caption here",
            left: viewport.width * 0.15,
            top: viewport.height * 0.82,
            width: viewport.width * 0.7,
            fontSize: Math.round(viewport.width * 0.04),
            backgroundColor: "rgba(0,0,0,0.55)",
            fontWeight: "normal",
          })
        );
        canvas.requestRenderAll();
        syncToStore();
      }
    }
    toast.success(intent.summary || "Applied prompt");
    void prompt;
  }

  async function buildPreview() {
    try {
      const url = await ensureUrl(doc.assetId);
      const height = 1080;
      const ratio = aspectToRatio(doc.aspect);
      const res = await exportPhoto(
        doc,
        url ?? null,
        { format: "jpeg", quality: 90, width: Math.round(height * ratio), height },
        { width: viewport.width, height: viewport.height }
      );
      const objectUrl = URL.createObjectURL(res.blob);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return objectUrl;
      });
      setPreviewOpen(true);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function handleUpload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    const store = useProjectStore.getState();
    const { assets, errors } = await store.importFiles([files[0]]);
    setUploading(false);
    errors.forEach((e) => toast.error(e));
    if (assets[0]) {
      snapshot();
      setDoc({ ...doc, assetId: assets[0].id, crop: null });
      toast.success("Photo loaded");
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <EmptyState
          icon={<ImageIcon className="size-6" />}
          title="Project not found"
          description="This photo project doesn't exist in this browser anymore."
          action={<Button onClick={() => router.push("/")}>Back to studio</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#08090d]">
      <EditorTopBar
        mode="photo"
        name={name}
        onRename={(v) => {
          setName(v);
          setSaveState("dirty");
        }}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onSave={() => save()}
        onExport={() => setExportOpen(true)}
        onPreview={buildPreview}
        saveState={saveState}
      />

      <div className="flex min-h-0 flex-1">
        <LeftRail items={RAIL} active={activeTool} onChange={setActiveTool} />

        <aside className="hidden w-[286px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0d13] lg:flex">
          <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              {RAIL.find((r) => r.id === activeTool)?.label}
            </span>
            <span className="text-[9px] text-muted">Photo</span>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <ToolPanel
              tool={activeTool}
              assetUrl={assetUrl}
              selected={selected}
              imageWidth={asset?.width ?? imageRef.current?.naturalWidth ?? 1600}
              imageHeight={asset?.height ?? imageRef.current?.naturalHeight ?? 1200}
              onAddText={addText}
              onAddSticker={addSticker}
              onAutoEnhance={() => analyzeAndApply("enhance")}
              onCrop={setCrop}
              onRotate={(delta) => {
                snapshot();
                setDoc({ ...doc, rotation: (((doc.rotation + delta) % 360) + 360) % 360 });
              }}
              onFlip={(axis) => {
                snapshot();
                setDoc({ ...doc, [axis === "x" ? "flipX" : "flipY"]: !doc[axis === "x" ? "flipX" : "flipY"] });
              }}
              onAspect={setAspect}
              onRemoveBg={() => handleAITool({ id: "bg-remove", name: "Background Removal", description: "", modes: ["photo"], kind: "provider" })}
              onTool={handleAITool}
              onApplyPrompt={applyPrompt}
              onOpenSettings={() => setAiOpen(true)}
              busyAI={busyAI}
              onUpload={() => uploadInputRef.current?.click()}
              uploading={uploading}
              setActiveTool={setActiveTool}
              onCreateSlideshow={async () => {
                const store = useProjectStore.getState();
                const videoDoc = createDefaultVideoDoc(doc.aspect);
                if (doc.assetId) {
                  const clip = createMediaClip(
                    "track_video",
                    doc.assetId,
                    asset?.name ?? "Photo",
                    "image",
                    0,
                    4
                  );
                  clip.filterId = doc.filterId;
                  clip.adjustments = { ...doc.adjustments };
                  clip.transitionIn = { type: "dissolve", duration: 0.8 };
                  videoDoc.clips.push(clip);
                }
                const created = await store.createProject({
                  name: `${name} · slideshow`,
                  mode: "video",
                  aspect: doc.aspect,
                  thumbnail: asset?.thumbnail,
                  video: videoDoc,
                  template: "slideshow",
                });
                toast.success("Slideshow project created — add more photos in the timeline");
                router.push(`/editor/video/${created.id}`);
              }}
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 bg-[#07080c]">
            <div
              ref={previewContainerRef}
              className="relative flex flex-1 items-center justify-center overflow-auto p-6"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                if (files.length) handleUpload(files);
              }}
            >
              <div
                className="relative shrink-0 rounded-lg shadow-2xl shadow-black/60 ring-1 ring-white/10 transition-transform"
                style={{
                  width: viewport.width,
                  height: viewport.height,
                  transform: `scale(${zoom})`,
                }}
              >
                <canvas ref={canvasElRef} className="rounded-lg" />
                {!doc.assetId && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#0d1016]/95 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.05]">
                      <ImageIcon className="size-5 text-muted" />
                    </div>
                    <p className="text-sm font-medium">Add a photo to start</p>
                    <p className="max-w-[240px] text-[11px] text-muted">
                      Drop a file here or choose from your media library.
                    </p>
                    <Button size="sm" onClick={() => uploadInputRef.current?.click()}>
                      <Upload className="size-3.5" /> Upload photo
                    </Button>
                  </div>
                )}
                {doc.assetId && !imageReady && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#0d1016]/80">
                    <Loader2 className="size-6 animate-spin text-violet-300" />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#0e1016]/90 px-1.5 py-1 shadow-xl backdrop-blur">
              <Button size="icon-sm" variant="ghost" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} title="Zoom out">
                <ZoomOut className="size-3.5" />
              </Button>
              <span className="w-10 text-center font-mono text-[10px] text-zinc-400">{Math.round(zoom * 100)}%</span>
              <Button size="icon-sm" variant="ghost" onClick={() => setZoom((z) => Math.min(2, z + 0.1))} title="Zoom in">
                <ZoomIn className="size-3.5" />
              </Button>
              <div className="mx-1 h-4 w-px bg-white/10" />
              <Button size="icon-sm" variant="ghost" onClick={() => setZoom(1)} title="Fit to screen">
                <Maximize2 className="size-3.5" />
              </Button>
              <div className="mx-1 h-4 w-px bg-white/10" />
              <span className="px-1.5 font-mono text-[10px] text-muted">
                {viewport.width}×{viewport.height}
              </span>
            </div>
          </div>

          <div className="flex h-[96px] shrink-0 items-center gap-3 border-t border-white/[0.06] bg-[#0c0e14] px-3">
            <div className="flex w-40 shrink-0 flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted">
                <Layers className="size-3" /> Layers
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="secondary" className="h-7 flex-1" onClick={() => addText(null)}>
                  <Plus className="size-3" /> Text
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    snapshot();
                    setObjects([]);
                    setSelected(null);
                  }}
                  title="Clear all layers"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="scrollbar-thin flex h-[68px] flex-1 items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => {
                  fabricRef.current?.discardActiveObject();
                  fabricRef.current?.requestRenderAll();
                  setSelected(null);
                }}
                className={cn(
                  "flex h-full w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border text-[9px] transition",
                  !selected ? "border-violet-400/40 bg-violet-500/10 text-violet-200" : "border-white/[0.06] bg-white/[0.02] text-muted"
                )}
              >
                <ImageIcon className="size-4" />
                Background
              </button>
              {doc.objects.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => selectLayer(obj.id)}
                  className={cn(
                    "flex h-full w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[9px] transition",
                    selected?.id === obj.id
                      ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                      : "border-white/[0.06] bg-white/[0.02] text-muted hover:border-white/15"
                  )}
                >
                  <span className="text-sm">{obj.type === "sticker" ? obj.content : "T"}</span>
                  <span className="w-full truncate text-center">{obj.type === "sticker" ? "Sticker" : obj.text || "Text"}</span>
                </button>
              ))}
              {!doc.objects.length && (
                <span className="px-2 text-[10px] text-muted">No layers yet — add text or stickers.</span>
              )}
            </div>
            <div className="hidden w-32 shrink-0 flex-col items-end gap-1 text-[10px] text-muted xl:flex">
              <span className="uppercase tracking-wider">{doc.aspect} canvas</span>
              <span className="font-mono text-zinc-300">{doc.objects.length} layers</span>
            </div>
          </div>
        </main>

        <aside className="hidden w-[300px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0b0d13] xl:flex">
          <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Properties</span>
            <span className="text-[9px] text-muted">{selected ? "Layer" : "Canvas"}</span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-3">
              {selected ? (
                <ObjectInspector
                  selected={selected}
                  onChange={updateSelected}
                  onDelete={deleteSelected}
                  onDuplicate={duplicateSelected}
                  onLayer={moveLayer}
                />
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Canvas</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ASPECT_OPTIONS.map((a) => (
                        <button
                          key={a}
                          onClick={() => setAspect(a)}
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-[10px] transition",
                            doc.aspect === a
                              ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                              : "border-white/10 text-muted hover:border-white/20 hover:text-white"
                          )}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] text-muted">
                      <div className="flex justify-between">
                        <span>Image</span>
                        <span className="font-mono text-zinc-300">
                          {asset?.width ?? "—"} × {asset?.height ?? "—"}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span>Viewport</span>
                        <span className="font-mono text-zinc-300">
                          {viewport.width} × {viewport.height}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span>Filter</span>
                        <span className="text-zinc-300">{doc.filterId ?? "Original"}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Color adjustment</p>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px]" onClick={() => setAdjustments({})}>
                        Reset
                      </Button>
                    </div>
                    <div className="space-y-2.5">
                      {(["exposure", "brightness", "contrast", "saturation", "temperature", "vignette"] as const).map((key) => (
                        <SliderRow
                          key={key}
                          label={key.charAt(0).toUpperCase() + key.slice(1)}
                          value={doc.adjustments[key]}
                          min={key === "vignette" ? 0 : -100}
                          max={100}
                          unit={key === "vignette" ? "%" : ""}
                          onChange={(v) => usePhotoStore.getState().setAdjustment(key, v)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Layers</p>
                    <LayerList objects={doc.objects} selectedId={null} onSelect={selectLayer} />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <div className="border-t border-white/[0.06] p-2">
            <Button size="sm" variant="secondary" className="w-full" onClick={() => setAiOpen(true)}>
              <Sparkles className="size-3.5" /> AI provider settings
            </Button>
          </div>
        </aside>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleUpload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <PhotoExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        aspect={doc.aspect}
        title={name}
        sourceWidth={asset?.width}
        sourceHeight={asset?.height}
        onExport={async (opts) => {
          const url = await ensureUrl(doc.assetId);
          const res = await exportPhoto(doc, url ?? null, opts, { width: viewport.width, height: viewport.height });
          setProject((p) =>
            p
              ? {
                  ...p,
                  thumbnail: stageCanvasRef.current
                    ? shrinkDataUrl(stageCanvasRef.current.toDataURL("image/jpeg", 0.6))
                    : p.thumbnail,
                }
              : p
          );
          return res;
        }}
      />

      <AISettingsDialog open={aiOpen} onOpenChange={setAiOpen} />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl border-white/10 bg-[#0a0b0f] p-3">
          <DialogHeader className="mb-2">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Play className="size-3.5 text-violet-300" /> Export preview
            </DialogTitle>
          </DialogHeader>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Preview" className="max-h-[72vh] w-full rounded-lg object-contain" />
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[10px] text-muted">Full-resolution render at 1080p equivalent</p>
            <Button size="sm" onClick={() => setExportOpen(true)}>
              Export
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolPanel({
  tool,
  assetUrl,
  selected,
  imageWidth,
  imageHeight,
  onAddText,
  onAddSticker,
  onAutoEnhance,
  onCrop,
  onRotate,
  onFlip,
  onAspect,
  onRemoveBg,
  onTool,
  onApplyPrompt,
  onOpenSettings,
  busyAI,
  onUpload,
  uploading,
  setActiveTool,
  onCreateSlideshow,
}: {
  tool: string;
  assetUrl?: string;
  selected: SerializedObject | null;
  imageWidth: number;
  imageHeight: number;
  onAddText: (presetId: string | null) => void;
  onAddSticker: (emoji: string) => void;
  onAutoEnhance: () => void;
  onCrop: (rect: { x: number; y: number; width: number; height: number } | null) => void;
  onRotate: (delta: number) => void;
  onFlip: (axis: "x" | "y") => void;
  onAspect: (aspect: string) => void;
  onRemoveBg: () => void;
  onTool: (tool: AITool) => void;
  onApplyPrompt: (intent: AIIntent, prompt: string) => void;
  onOpenSettings: () => void;
  busyAI: string | null;
  onUpload: () => void;
  uploading: boolean;
  setActiveTool: (tool: string) => void;
  onCreateSlideshow: () => void;
}) {
  const { doc, setFilter, setFilterIntensity, setAdjustments } = usePhotoStore();

  if (tool === "media" || tool === "upload") {
    return (
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={onUpload} disabled={uploading}>
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Upload
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setActiveTool("media")}>
            <ImageIcon className="size-3.5" /> Library
          </Button>
        </div>
        <div className="h-[calc(100vh-220px)] min-h-[320px]">
          <MediaPanel
            accept="image/*"
            selectLabel="Use photo"
            onSelect={(asset) => {
              usePhotoStore.getState().snapshot();
              usePhotoStore.getState().setDoc({ ...usePhotoStore.getState().doc, assetId: asset.id, crop: null });
              toast.success(`Loaded ${asset.name}`);
            }}
          />
        </div>
      </div>
    );
  }

  if (tool === "filters") {
    return (
      <div className="p-3">
        <FilterStrip
          filterId={doc.filterId}
          intensity={doc.filterIntensity}
          previewUrl={assetUrl}
          onFilter={setFilter}
          onIntensity={setFilterIntensity}
        />
        <div className="mt-3">
          <CustomPresetsPanel />
        </div>
        <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] leading-relaxed text-muted">
          Filters combine with manual adjustments. Use intensity to blend between the original and the grade.
        </div>
      </div>
    );
  }

  if (tool === "adjust") {
    return (
      <div className="p-3">
        <AdjustPanel onAutoEnhance={onAutoEnhance} />
      </div>
    );
  }

  if (tool === "crop") {
    return (
      <div className="p-3">
        <CropPanel
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          crop={doc.crop}
          rotation={doc.rotation}
          flipX={doc.flipX}
          flipY={doc.flipY}
          onCrop={onCrop}
          onRotate={onRotate}
          onFlip={onFlip}
          aspect={doc.aspect}
          onAspect={onAspect}
        />
      </div>
    );
  }

  if (tool === "text") {
    return (
      <div className="p-3">
        <TextPanel onAddText={onAddText} onAddSticker={onAddSticker} />
        {selected && (
          <p className="mt-3 rounded-lg border border-violet-400/20 bg-violet-500/[0.06] p-2 text-[10px] text-violet-200">
            Layer selected — typography controls are in the Properties panel.
          </p>
        )}
      </div>
    );
  }

  if (tool === "stickers") {
    return (
      <div className="grid grid-cols-5 gap-1.5 p-3">
        {["✨", "🔥", "💜", "⭐", "🌈", "⚡", "🎬", "📸", "🎵", "🎉", "💫", "🌙", "☀️", "🍿", "🎧", "🕹️", "🏆", "💎", "🌸", "🌊", "🦋", "👑", "🚀", "❤️"].map((emoji) => (
          <button
            key={emoji}
            onClick={() => onAddSticker(emoji)}
            className="flex aspect-square items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-xl transition hover:border-violet-400/40 hover:bg-violet-500/10"
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  }

  if (tool === "background") {
    return (
      <div className="p-3">
        <BackgroundPanel onRemoveBg={onRemoveBg} />
      </div>
    );
  }

  if (tool === "effects") {
    return (
      <div className="p-3">
        <EffectsPanel />
        <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] leading-relaxed text-muted">
          Quick effects set real adjustment values. Stack them with filters for more control.
        </div>
      </div>
    );
  }

  if (tool === "slideshow") {
    return (
      <div className="space-y-3 p-3">
        <div className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.08] to-cyan-500/[0.03] p-3">
          <Film className="mb-2 size-5 text-violet-300" />
          <p className="text-[11px] font-semibold">Turn this photo into a slideshow</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            Create a video project with this image, then add more photos, transitions, text and music on the
            multi-track timeline.
          </p>
          <Button size="sm" className="mt-2 w-full" onClick={onCreateSlideshow}>
            <Film className="size-3.5" /> Create slideshow project
          </Button>
        </div>
        <div className="rounded-lg border border-white/[0.06] p-2 text-[10px] text-muted">
          Audio and transitions are available in the video editor. Photo exports are still images.
        </div>
      </div>
    );
  }

  if (tool === "ai") {
    return (
      <AIPanel
        mode="photo"
        onTool={onTool}
        onApplyPrompt={onApplyPrompt}
        onOpenSettings={onOpenSettings}
        busyTool={busyAI}
      />
    );
  }

  return (
    <div className="p-3">
      <EmptyState
        title="Select a tool"
        description="Pick a tool from the left rail to begin editing."
        action={
          <Button size="sm" variant="secondary" onClick={() => setAdjustments({})}>
            Reset adjustments
          </Button>
        }
      />
    </div>
  );
}

function drawChecker(stage: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = stage.width;
  canvas.height = stage.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return stage;
  const size = 12;
  for (let y = 0; y < canvas.height; y += size) {
    for (let x = 0; x < canvas.width; x += size) {
      ctx.fillStyle = (x / size + y / size) % 2 === 0 ? "#1a1d26" : "#14161e";
      ctx.fillRect(x, y, size, size);
    }
  }
  ctx.drawImage(stage, 0, 0);
  return canvas;
}

function shrinkDataUrl(url: string): string {
  try {
    const img = new Image();
    img.src = url;
    if (!img.complete || img.naturalWidth === 0) return url;
    const canvas = document.createElement("canvas");
    const scale = 360 / Math.max(img.naturalWidth, img.naturalHeight, 1);
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return url;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
  } catch {
    return url;
  }
}

async function ensureUrl(assetId?: string) {
  if (!assetId) return undefined;
  const { getAssetUrl } = await import("@/lib/media");
  return getAssetUrl(assetId);
}

