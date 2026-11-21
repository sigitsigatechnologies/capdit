"use client";

import type { VideoClip, VideoDoc } from "./types";
import { buildCanvasFilter, clipEnd, getPreviousClip } from "./video";

export type SourceProvider = (clip: VideoClip) => CanvasImageSource | null;

function sourceSize(source: CanvasImageSource): { w: number; h: number } {
  if (source instanceof HTMLVideoElement) {
    return { w: source.videoWidth || 1, h: source.videoHeight || 1 };
  }
  if (source instanceof HTMLImageElement) {
    return { w: source.naturalWidth || source.width || 1, h: source.naturalHeight || source.height || 1 };
  }
  if (source instanceof HTMLCanvasElement) return { w: source.width, h: source.height };
  if (source instanceof ImageBitmap) return { w: source.width, h: source.height };
  return { w: 1, h: 1 };
}

function drawBackdrop(ctx: CanvasRenderingContext2D, doc: VideoDoc, width: number, height: number) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, width, height);
  const base = doc.background || "#07080c";
  grad.addColorStop(0, "#0d1017");
  grad.addColorStop(0.5, base);
  grad.addColorStop(1, "#05060a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawMedia(
  ctx: CanvasRenderingContext2D,
  clip: VideoClip,
  source: CanvasImageSource,
  time: number,
  width: number,
  height: number,
  extraAlpha = 1,
  extraBlur = 0
) {
  const { w: iw, h: ih } = sourceSize(source);
  const cropL = (clip.crop.left / 100) * iw;
  const cropT = (clip.crop.top / 100) * ih;
  const cropR = (clip.crop.right / 100) * iw;
  const cropB = (clip.crop.bottom / 100) * ih;
  const cw = Math.max(2, iw - cropL - cropR);
  const ch = Math.max(2, ih - cropT - cropB);
  const local = Math.max(0, time - clip.start);
  const p = clip.duration > 0 ? Math.min(1, local / clip.duration) : 1;

  let scale = clip.scale / 100;
  let xOff = (clip.x / 100) * width;
  let yOff = (clip.y / 100) * height;
  let alpha = (clip.opacity / 100) * extraAlpha;
  let filter = buildCanvasFilter(clip.adjustments, clip.filterId, clip.filterIntensity, extraBlur);

  switch (clip.effect) {
    case "freeze":
      break;
    case "zoomIn":
      scale *= 1 + 0.14 * p;
      break;
    case "zoomOut":
      scale *= 1.14 - 0.14 * p;
      break;
    case "shake":
      xOff += Math.sin(time * 38) * 6;
      yOff += Math.cos(time * 31) * 4;
      xOff += Math.sin(time * 73) * 2;
      break;
    case "panLeft":
      xOff -= (p - 0.5) * width * 0.14;
      break;
    case "panRight":
      xOff += (p - 0.5) * width * 0.14;
      break;
    case "blurPulse":
      filter = buildCanvasFilter(clip.adjustments, clip.filterId, clip.filterIntensity, Math.sin(p * Math.PI) * 9);
      break;
    case "glitch":
      xOff += Math.sin(time * 90) * 3;
      break;
    default:
      break;
  }

  if (clip.fadeIn > 0 && local < clip.fadeIn) alpha *= local / clip.fadeIn;
  if (clip.fadeOut > 0) {
    const remain = clip.duration - local;
    if (remain < clip.fadeOut) alpha *= Math.max(0, remain / clip.fadeOut);
  }
  alpha = Math.max(0, Math.min(1, alpha));

  const cover = Math.max(width / cw, height / ch) * scale;
  const dw = cw * cover;
  const dh = ch * cover;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = filter;
  ctx.translate(width / 2 + xOff, height / 2 + yOff);
  ctx.rotate((clip.rotation * Math.PI) / 180);
  ctx.scale(clip.flipX ? -1 : 1, clip.flipY ? -1 : 1);
  ctx.drawImage(source, cropL, cropT, cw, ch, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  if (clip.effect === "glitch") {
    const sliceY = (Math.sin(time * 11) * 0.5 + 0.5) * height * 0.7;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.globalCompositeOperation = "screen";
    ctx.filter = "hue-rotate(90deg)";
    ctx.translate(width / 2 + xOff + 6, height / 2 + yOff);
    ctx.scale(clip.flipX ? -1 : 1, clip.flipY ? -1 : 1);
    const s2 = Math.max(width / cw, height / ch) * scale;
    ctx.beginPath();
    ctx.rect(-width / 2, sliceY - height / 2, width, 12);
    ctx.clip();
    ctx.drawImage(source, cropL, cropT, cw, ch, (-cw * s2) / 2, (-ch * s2) / 2, cw * s2, ch * s2);
    ctx.restore();
  }
  if (clip.effect === "flash" && local < 0.22) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.7 - local * 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  if (clip.effect === "shake") {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function drawTextClip(ctx: CanvasRenderingContext2D, clip: VideoClip, time: number, width: number, height: number) {
  const local = Math.max(0, time - clip.start);
  const style = clip.textStyle;
  if (!style) return;
  let text = clip.text ?? "";
  let alpha = clip.opacity / 100;
  let offsetY = 0;
  let scale = 1;

  switch (clip.animation) {
    case "fade":
      alpha *= Math.min(1, local / 0.45) * Math.min(1, Math.max(0, (clip.duration - local) / 0.45));
      break;
    case "slide":
      alpha *= Math.min(1, local / 0.4);
      offsetY = (1 - Math.min(1, local / 0.5)) * height * 0.08;
      break;
    case "typewriter":
      text = text.slice(0, Math.max(1, Math.floor(text.length * Math.min(1, local / Math.max(0.6, clip.duration * 0.65)))));
      break;
    case "pop":
      scale = local < 0.25 ? 0.7 + (local / 0.25) * 0.38 : 1.08 - Math.min(0.08, (local - 0.25) * 0.3);
      alpha *= Math.min(1, local / 0.2);
      break;
    case "bounce":
      offsetY = Math.abs(Math.sin(local * 3.4)) * -14 * Math.max(0, 1 - local / 1.4);
      alpha *= Math.min(1, local / 0.3);
      break;
    case "zoom":
      scale = 0.6 + Math.min(1, local / 0.4) * 0.4;
      alpha *= Math.min(1, local / 0.3);
      break;
    default:
      break;
  }

  if (clip.fadeIn > 0 && local < clip.fadeIn) alpha *= local / clip.fadeIn;
  if (clip.fadeOut > 0) {
    const remain = clip.duration - local;
    if (remain < clip.fadeOut) alpha *= Math.max(0, remain / clip.fadeOut);
  }

  const resolutionScale = width / 1280;
  const baseFont = Math.max(10, style.fontSize * resolutionScale);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(width / 2 + (clip.x / 100) * width, height / 2 + (clip.y / 100) * height + offsetY);
  ctx.rotate((clip.rotation * Math.PI) / 180);
  ctx.scale(scale * (clip.scale / 100), scale * (clip.scale / 100));
  ctx.font = `${style.italic ? "italic " : ""}${style.bold ? "700" : "400"} ${baseFont}px ${style.fontFamily}, sans-serif`;
  ctx.textAlign = style.align;
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${style.letterSpacing * resolutionScale}px`;
  const maxWidth = width * 0.82;
  const lines = wrapLines(ctx, text, maxWidth);
  const lineHeight = baseFont * style.lineHeight;
  const totalHeight = lines.length * lineHeight;
  const anchorX = style.align === "center" ? 0 : style.align === "left" ? -maxWidth / 2 : maxWidth / 2;

  if (style.background && style.background !== "transparent") {
    let widest = 0;
    for (const line of lines) widest = Math.max(widest, ctx.measureText(line).width);
    const padX = baseFont * 0.35;
    const padY = baseFont * 0.22;
    ctx.save();
    ctx.fillStyle = style.background;
    roundRect(
      ctx,
      anchorX - (style.align === "center" ? widest / 2 : style.align === "left" ? 0 : widest) - padX,
      -totalHeight / 2 - padY,
      widest + padX * 2,
      totalHeight + padY * 2,
      baseFont * 0.18
    );
    ctx.fill();
    ctx.restore();
  }

  if (style.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = baseFont * 0.16;
    ctx.shadowOffsetY = baseFont * 0.05;
  }

  ctx.fillStyle = style.color;
  if (style.stroke && style.stroke !== "transparent") {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = Math.max(1, baseFont * 0.06);
    ctx.lineJoin = "round";
  }
  lines.forEach((line, i) => {
    const y = -totalHeight / 2 + lineHeight * (i + 0.5);
    if (style.stroke && style.stroke !== "transparent") ctx.strokeText(line, anchorX, y);
    ctx.fillText(line, anchorX, y);
  });
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split("\n");
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    out.push(line || " ");
  }
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawClip(
  ctx: CanvasRenderingContext2D,
  doc: VideoDoc,
  clip: VideoClip,
  time: number,
  width: number,
  height: number,
  getSource: SourceProvider
) {
  if (clip.kind === "text") {
    drawTextClip(ctx, clip, time, width, height);
    return;
  }
  const source = getSource(clip);
  if (!source) return;

  const transition = clip.transitionIn;
  const inTransition = transition.type !== "none" && transition.duration > 0 && time < clip.start + transition.duration;
  const prev = inTransition && transition.type !== "fade" ? getPreviousClip(doc.clips, clip) : undefined;
  const prevSource = prev ? getSource(prev) : null;

  if (inTransition && prev && prevSource) {
    ctx.save();
    if (transition.type === "blur") ctx.filter = "blur(10px)";
    drawMedia(ctx, prev, prevSource, Math.max(prev.start, clipEnd(prev) - 0.05), width, height);
    ctx.restore();
  }

  if (!inTransition || transition.type === "fade") {
    const alpha = inTransition ? Math.max(0, (time - clip.start) / Math.max(0.001, transition.duration)) : 1;
    drawMedia(ctx, clip, source, time, width, height, alpha);
    return;
  }

  const p = Math.max(0, Math.min(1, (time - clip.start) / transition.duration));
  switch (transition.type) {
    case "dissolve":
      drawMedia(ctx, clip, source, time, width, height, p);
      break;
    case "slide":
      ctx.save();
      ctx.translate((1 - p) * width * 0.32, 0);
      drawMedia(ctx, clip, source, time, width, height, 1);
      ctx.restore();
      break;
    case "zoom": {
      const z = 0.72 + 0.28 * p;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(z, z);
      ctx.translate(-width / 2, -height / 2);
      drawMedia(ctx, clip, source, time, width, height, p);
      ctx.restore();
      break;
    }
    case "wipe":
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width * p, height);
      ctx.clip();
      drawMedia(ctx, clip, source, time, width, height, 1);
      ctx.restore();
      break;
    case "blur":
      drawMedia(ctx, clip, source, time, width, height, p, (1 - p) * 14);
      break;
    default:
      drawMedia(ctx, clip, source, time, width, height, 1);
  }
}

export function renderVideoFrame(
  ctx: CanvasRenderingContext2D,
  doc: VideoDoc,
  time: number,
  width: number,
  height: number,
  getSource: SourceProvider
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawBackdrop(ctx, doc, width, height);
  const tracks = [...doc.tracks].reverse();
  for (const track of tracks) {
    if (track.type === "audio" || track.hidden) continue;
    const clips = doc.clips.filter((c) => c.trackId === track.id && time >= c.start && time < c.start + c.duration);
    for (const clip of clips) {
      if (track.muted) continue;
      drawClip(ctx, doc, clip, time, width, height, getSource);
    }
  }
  ctx.restore();
}

