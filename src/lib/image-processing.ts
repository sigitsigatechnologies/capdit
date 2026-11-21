import type { Adjustments, PhotoBackground } from "./types";

export interface ProcessOptions {
  crop?: { x: number; y: number; width: number; height: number } | null;
  maxDim?: number;
  overlay?: { color: [number, number, number]; opacity: number } | null;
  keyed?: boolean;
  keyTolerance?: number;
  background?: PhotoBackground;
}

function clamp255(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function hasPixelWork(adj: Adjustments, opts: ProcessOptions): boolean {
  const keys: (keyof Adjustments)[] = [
    "brightness",
    "contrast",
    "saturation",
    "exposure",
    "temperature",
    "tint",
    "highlights",
    "shadows",
    "vignette",
    "fade",
    "grain",
    "sharpness",
  ];
  if (keys.some((k) => Math.abs(adj[k]) > 0.01)) return true;
  if (adj.blur > 0.01) return true;
  if (opts.overlay && opts.overlay.opacity > 0.001) return true;
  if (opts.keyed) return true;
  return false;
}

export function processImage(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
  adj: Adjustments,
  opts: ProcessOptions = {}
): HTMLCanvasElement {
  const sw = "naturalWidth" in source ? source.naturalWidth : source.width;
  const sh = "naturalHeight" in source ? source.naturalHeight : source.height;
  const crop = opts.crop && opts.crop.width > 0 ? opts.crop : { x: 0, y: 0, width: sw, height: sh };
  const outW = Math.max(1, Math.round(crop.width));
  const outH = Math.max(1, Math.round(crop.height));

  const maxDim = opts.maxDim ?? 1600;
  const scale = Math.min(1, maxDim / Math.max(outW, outH));
  const targetW = Math.max(1, Math.round(outW * scale));
  const targetH = Math.max(1, Math.round(outH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const blurPx = (adj.blur / 100) * Math.max(2, Math.min(targetW, targetH) * 0.02);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = blurPx > 0.2 ? `blur(${blurPx.toFixed(2)}px)` : "none";
  ctx.drawImage(
    source as CanvasImageSource,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetW,
    targetH
  );
  ctx.filter = "none";

  if (!hasPixelWork(adj, opts)) return canvas;

  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imageData.data;

  const contrast = adj.contrast;
  const contrastFactor = (259 * (contrast * 2.55 + 255)) / (255 * (259 - contrast * 2.55));
  const exposureMul = Math.pow(2, adj.exposure / 65);
  const brightAdd = adj.brightness * 1.05;
  const saturation = 1 + adj.saturation / 100;
  const temperature = (adj.temperature / 100) * 46;
  const tint = (adj.tint / 100) * 34;
  const highlightAmt = (adj.highlights / 100) * 120;
  const shadowAmt = (adj.shadows / 100) * 120;
  const fade = (adj.fade / 100) * 0.62;
  const grainAmt = (adj.grain / 100) * 44;
  const sharp = (adj.sharpness / 100) * 1.35;
  const vignetteAmt = (adj.vignette / 100) * 0.86;
  const overlay = opts.overlay;
  const overlayAlpha = overlay ? overlay.opacity : 0;
  const keyed = Boolean(opts.keyed);
  const tol = ((opts.keyTolerance ?? 28) / 100) * 180;

  let keyR = 0;
  let keyG = 0;
  let keyB = 0;
  if (keyed) {
    const corners = [
      [2, 2],
      [targetW - 3, 2],
      [2, targetH - 3],
      [targetW - 3, targetH - 3],
    ];
    let r = 0;
    let g = 0;
    let b = 0;
    for (const [x, y] of corners) {
      const i = (y * targetW + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    keyR = r / corners.length;
    keyG = g / corners.length;
    keyB = b / corners.length;
  }

  const src = new Uint8ClampedArray(data);
  const cx = targetW / 2;
  const cy = targetH / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const i = (y * targetW + x) * 4;
      let r = src[i];
      let g = src[i + 1];
      let b = src[i + 2];

      if (keyed) {
        const dr = r - keyR;
        const dg = g - keyG;
        const db = b - keyB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist < tol) {
          const edge = Math.min(1, Math.max(0, (dist - tol * 0.6) / (tol * 0.4)));
          data[i + 3] = Math.round(255 * edge);
        }
      }

      r *= exposureMul;
      g *= exposureMul;
      b *= exposureMul;

      r = (r - 128) * contrastFactor + 128 + brightAdd;
      g = (g - 128) * contrastFactor + 128 + brightAdd;
      b = (b - 128) * contrastFactor + 128 + brightAdd;

      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (shadowAmt !== 0 && lum < 0.5) {
        const w = (1 - lum) * 2;
        r += shadowAmt * w * 0.55;
        g += shadowAmt * w * 0.55;
        b += shadowAmt * w * 0.55;
      }
      if (highlightAmt !== 0 && lum > 0.5) {
        const w = (lum - 0.5) * 2;
        r += highlightAmt * w * 0.5;
        g += highlightAmt * w * 0.5;
        b += highlightAmt * w * 0.5;
      }

      r += temperature;
      g += tint * 0.25;
      b -= temperature;
      r += tint * 0.32;
      g -= tint * 0.45;
      b += tint * 0.32;

      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = gray + (r - gray) * saturation;
      g = gray + (g - gray) * saturation;
      b = gray + (b - gray) * saturation;

      if (sharp > 0 && x > 0 && y > 0 && x < targetW - 1 && y < targetH - 1) {
        const iL = i - 4;
        const iR = i + 4;
        const iU = i - targetW * 4;
        const iD = i + targetW * 4;
        r += sharp * (r - (src[iL] + src[iR] + src[iU] + src[iD]) / 4);
        g += sharp * (g - (src[iL + 1] + src[iR + 1] + src[iU + 1] + src[iD + 1]) / 4);
        b += sharp * (b - (src[iL + 2] + src[iR + 2] + src[iU + 2] + src[iD + 2]) / 4);
      }

      if (fade > 0) {
        r = r * (1 - fade) + 132 * fade;
        g = g * (1 - fade) + 132 * fade;
        b = b * (1 - fade) + 132 * fade;
      }

      if (overlayAlpha > 0 && overlay) {
        r = r * (1 - overlayAlpha) + overlay.color[0] * overlayAlpha;
        g = g * (1 - overlayAlpha) + overlay.color[1] * overlayAlpha;
        b = b * (1 - overlayAlpha) + overlay.color[2] * overlayAlpha;
      }

      if (grainAmt > 0) {
        const n = (Math.random() - 0.5) * grainAmt;
        r += n;
        g += n;
        b += n;
      }

      if (vignetteAmt > 0) {
        const dx = (x - cx) / maxDist;
        const dy = (y - cy) / maxDist;
        const d = Math.sqrt(dx * dx + dy * dy);
        const v = 1 - vignetteAmt * Math.pow(Math.min(1, d), 2.2);
        r *= v;
        g *= v;
        b *= v;
      }

      data[i] = clamp255(r);
      data[i + 1] = clamp255(g);
      data[i + 2] = clamp255(b);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function composeBase(
  base: HTMLCanvasElement,
  rotation: number,
  flipX: boolean,
  flipY: boolean
): HTMLCanvasElement {
  const normalized = ((rotation % 360) + 360) % 360;
  if (normalized === 0 && !flipX && !flipY) return base;
  const swap = normalized === 90 || normalized === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? base.height : base.width;
  canvas.height = swap ? base.width : base.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return base;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.rotate((normalized * Math.PI) / 180);
  ctx.drawImage(base, -base.width / 2, -base.height / 2);
  return canvas;
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: PhotoBackground | undefined,
  width: number,
  height: number,
  base: HTMLCanvasElement
) {
  if (!background || background.type === "none") return;
  if (background.type === "transparent") {
    ctx.clearRect(0, 0, width, height);
    return;
  }
  if (background.type === "color") {
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (background.type === "gradient") {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, background.gradientFrom);
    grad.addColorStop(1, background.gradientTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (background.type === "blur") {
    ctx.save();
    const b = Math.max(4, (background.blurAmount / 100) * Math.min(width, height) * 0.08);
    ctx.filter = `blur(${b}px)`;
    const scale = 1.18;
    ctx.drawImage(
      base,
      -(width * (scale - 1)) / 2,
      -(height * (scale - 1)) / 2,
      width * scale,
      height * scale
    );
    ctx.restore();
  }
}

export function exportCanvas(
  base: HTMLCanvasElement,
  background: PhotoBackground | undefined,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  drawBackground(ctx, background, width, height, base);
  const fit = Math.min(width / base.width, height / base.height);
  const dw = base.width * fit;
  const dh = base.height * fit;
  ctx.drawImage(base, (width - dw) / 2, (height - dh) / 2, dw, dh);
  return canvas;
}

export function preparePhotoBase(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
  adj: Adjustments,
  doc: {
    crop?: { x: number; y: number; width: number; height: number } | null;
    background?: PhotoBackground;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
  },
  overlay: { color: [number, number, number]; opacity: number } | null,
  maxDim: number
): HTMLCanvasElement {
  const processed = processImage(source, adj, {
    crop: doc.crop,
    maxDim,
    overlay,
    keyed: Boolean(doc.background?.keyed),
    keyTolerance: doc.background?.keyTolerance,
  });
  return composeBase(processed, doc.rotation, doc.flipX, doc.flipY);
}
