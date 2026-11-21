"use client";

import { FabricImage, FabricText, StaticCanvas, Textbox } from "fabric";
import type { PhotoDoc, SerializedObject } from "./types";
import { resolveAdjustments } from "./presets";
import { drawBackground, preparePhotoBase } from "./image-processing";

export interface PhotoExportOptions {
  format: "png" | "jpeg" | "webp";
  quality: number;
  width: number;
  height: number;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load source image for export"));
    img.src = url;
  });
}

function buildObject(obj: SerializedObject, sx: number, sy: number) {
  if (obj.type === "text") {
    const textbox = new Textbox(obj.text ?? "", {
      left: obj.left * sx,
      top: obj.top * sy,
      width: (obj.width ?? 240) * sx,
      fontSize: (obj.fontSize ?? 48) * sy,
      fontFamily: obj.fontFamily ?? "Inter",
      fontWeight: obj.fontWeight ?? "normal",
      fontStyle: obj.fontStyle === "italic" ? "italic" : "normal",
      textAlign: (obj.textAlign as "left" | "center" | "right") ?? "center",
      fill: obj.fill ?? "#ffffff",
      charSpacing: obj.charSpacing ?? 0,
      lineHeight: obj.lineHeight ?? 1.16,
      underline: Boolean(obj.underline),
      opacity: (obj.opacity ?? 100) / 100,
      originX: "left",
      originY: "top",
      stroke: obj.stroke && obj.stroke !== "transparent" ? obj.stroke : undefined,
      strokeWidth: obj.strokeWidth ?? 0,
      backgroundColor: obj.backgroundColor && obj.backgroundColor !== "transparent" ? obj.backgroundColor : undefined,
      scaleX: obj.scaleX ?? 1,
      scaleY: obj.scaleY ?? 1,
      angle: obj.angle ?? 0,
    });
    if (obj.shadow) {
      textbox.set("shadow", {
        color: obj.shadow.color,
        blur: obj.shadow.blur * sy,
        offsetX: obj.shadow.offsetX * sx,
        offsetY: obj.shadow.offsetY * sy,
      } as never);
    }
    return textbox;
  }
  const text = new FabricText(obj.content ?? "★", {
    left: obj.left * sx,
    top: obj.top * sy,
    fontSize: (obj.fontSize ?? 72) * sy,
    fill: obj.fill ?? "#ffffff",
    opacity: (obj.opacity ?? 100) / 100,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
    angle: obj.angle ?? 0,
    originX: "left",
    originY: "top",
  });
  return text;
}

export async function exportPhoto(
  doc: PhotoDoc,
  imageUrl: string | null,
  options: PhotoExportOptions,
  logicalSize?: { width: number; height: number }
): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = options;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  if (imageUrl) {
    const img = await loadImageElement(imageUrl);
    const resolved = resolveAdjustments(doc.adjustments, doc.filterId, doc.filterIntensity);
    const base = preparePhotoBase(img, resolved.adjustments, doc, resolved.overlay, Math.max(width, height));
    drawBackground(ctx, doc.background, width, height, base);
    const fit = Math.min(width / base.width, height / base.height);
    const dw = base.width * fit;
    const dh = base.height * fit;
    ctx.drawImage(base, (width - dw) / 2, (height - dh) / 2, dw, dh);
  } else {
    drawBackground(ctx, doc.background, width, height, canvas);
  }

  const lw = logicalSize?.width || doc.canvasWidth || width;
  const lh = logicalSize?.height || doc.canvasHeight || height;
  const sx = width / lw;
  const sy = height / lh;

  const staticCanvas = new StaticCanvas(undefined, { width, height });
  if (imageUrl) {
    staticCanvas.backgroundImage = new FabricImage(canvas, {
      originX: "left",
      originY: "top",
      scaleX: 1,
      scaleY: 1,
    });
  }
  for (const obj of doc.objects) {
    staticCanvas.add(buildObject(obj, sx, sy));
  }
  staticCanvas.renderAll();

  const rendered = staticCanvas.toCanvasElement(1);
  const blob = await new Promise<Blob | null>((resolve) => {
    if (options.format === "jpeg") {
      const flat = document.createElement("canvas");
      flat.width = width;
      flat.height = height;
      const fctx = flat.getContext("2d");
      if (!fctx) return resolve(null);
      fctx.fillStyle = "#000000";
      fctx.fillRect(0, 0, width, height);
      fctx.drawImage(rendered, 0, 0);
      flat.toBlob((b) => resolve(b), "image/jpeg", options.quality / 100);
      return;
    }
    rendered.toBlob((b) => resolve(b), `image/${options.format}`, options.quality / 100);
  });
  if (!blob) throw new Error("Could not encode image");
  return { blob, width, height };
}

export function resolutionForAspect(aspect: string, height: number) {
  const [aw, ah] = aspect.split(":").map(Number);
  const ratio = aw && ah ? aw / ah : 16 / 9;
  const h = Math.round(height);
  const w = Math.round(h * ratio);
  return { width: w, height: h };
}
