"use client";

import { FabricText, Textbox, type FabricObject } from "fabric";
import type { SerializedObject } from "@/lib/types";
import { uid } from "@/lib/utils";

export const STICKERS = [
  "✨", "🔥", "💜", "⭐", "🌈", "⚡", "🎬", "📸", "🎵", "🎉", "💫", "🌙",
  "☀️", "🍿", "🎧", "🕹️", "🏆", "💎", "🌸", "🌊", "🦋", "👑", "🚀", "❤️",
];

export function createTextObject(partial: {
  text?: string;
  left: number;
  top: number;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  width?: number;
  backgroundColor?: string;
  stroke?: string;
  charSpacing?: number;
  lineHeight?: number;
  shadow?: SerializedObject["shadow"];
  id?: string;
}): Textbox {
  const obj = new Textbox(partial.text ?? "Your text", {
    left: partial.left,
    top: partial.top,
    width: partial.width ?? 460,
    fontSize: partial.fontSize ?? 52,
    fontFamily: partial.fontFamily ?? "Inter",
    fontWeight: (partial.fontWeight as "normal" | "bold") ?? "bold",
    fontStyle: partial.fontStyle === "italic" ? "italic" : "normal",
    textAlign: (partial.textAlign as "left" | "center" | "right") ?? "center",
    fill: partial.fill ?? "#ffffff",
    backgroundColor:
      partial.backgroundColor && partial.backgroundColor !== "transparent" ? partial.backgroundColor : undefined,
    stroke: partial.stroke && partial.stroke !== "transparent" ? partial.stroke : undefined,
    strokeWidth: partial.stroke && partial.stroke !== "transparent" ? 2 : 0,
    charSpacing: partial.charSpacing ?? 0,
    lineHeight: partial.lineHeight ?? 1.16,
    transparentCorners: false,
    cornerColor: "#8b5cf6",
    cornerStrokeColor: "#ffffff",
    borderColor: "#8b5cf6",
    cornerSize: 9,
    padding: 4,
  });
  if (partial.shadow) {
    obj.set("shadow", {
      color: partial.shadow.color,
      blur: partial.shadow.blur,
      offsetX: partial.shadow.offsetX,
      offsetY: partial.shadow.offsetY,
    } as never);
  }
  (obj as unknown as { capditId?: string }).capditId = partial.id ?? uid("obj");
  return obj;
}

export function createStickerObject(content: string, left: number, top: number, fontSize = 96): FabricText {
  const obj = new FabricText(content, {
    left,
    top,
    fontSize,
    originX: "center",
    originY: "center",
    transparentCorners: false,
    cornerColor: "#8b5cf6",
    cornerStrokeColor: "#ffffff",
    borderColor: "#8b5cf6",
    cornerSize: 9,
  });
  const tagged = obj as unknown as { capditId: string; isSticker: boolean };
  tagged.capditId = uid("obj");
  tagged.isSticker = true;
  return obj;
}

export function serializeObject(obj: FabricObject): SerializedObject {
  const raw = obj as unknown as {
    capditId?: string;
    isSticker?: boolean;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    fontStyle?: string;
    textAlign?: string;
    charSpacing?: number;
    lineHeight?: number;
    underline?: boolean;
    backgroundColor?: string;
    stroke?: string;
    strokeWidth?: number;
    width?: number;
    shadow?: { color?: string; blur?: number; offsetX?: number; offsetY?: number };
  };
  const isSticker = Boolean(raw.isSticker);
  return {
    id: raw.capditId ?? uid("obj"),
    type: isSticker ? "sticker" : "text",
    text: isSticker ? undefined : raw.text ?? "",
    content: isSticker ? raw.text ?? "" : undefined,
    left: obj.left ?? 0,
    top: obj.top ?? 0,
    width: raw.width,
    height: obj.height,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
    angle: obj.angle ?? 0,
    opacity: Math.round((obj.opacity ?? 1) * 100),
    fill: typeof obj.fill === "string" ? obj.fill : "#ffffff",
    fontFamily: raw.fontFamily,
    fontSize: raw.fontSize,
    fontWeight: String(raw.fontWeight ?? "normal"),
    fontStyle: raw.fontStyle,
    textAlign: raw.textAlign,
    charSpacing: raw.charSpacing,
    lineHeight: raw.lineHeight,
    underline: raw.underline,
    stroke: raw.stroke ?? "transparent",
    strokeWidth: raw.strokeWidth ?? 0,
    backgroundColor:
      raw.backgroundColor && raw.backgroundColor !== "rgba(0,0,0,0)" ? raw.backgroundColor : undefined,
    shadow: raw.shadow?.color
      ? {
          color: raw.shadow.color,
          blur: raw.shadow.blur ?? 0,
          offsetX: raw.shadow.offsetX ?? 0,
          offsetY: raw.shadow.offsetY ?? 0,
        }
      : null,
  };
}

export function objectFromSerialized(s: SerializedObject): FabricObject {
  if (s.type === "sticker") {
    const obj = new FabricText(s.content ?? "★", {
      left: s.left,
      top: s.top,
      fontSize: s.fontSize ?? 96,
      opacity: (s.opacity ?? 100) / 100,
      scaleX: s.scaleX ?? 1,
      scaleY: s.scaleY ?? 1,
      angle: s.angle ?? 0,
      fill: s.fill ?? "#ffffff",
      transparentCorners: false,
      cornerColor: "#8b5cf6",
      cornerStrokeColor: "#ffffff",
      borderColor: "#8b5cf6",
      cornerSize: 9,
    });
    const tagged = obj as unknown as { capditId: string; isSticker: boolean };
    tagged.capditId = s.id;
    tagged.isSticker = true;
    return obj;
  }
  const obj = createTextObject({
    id: s.id,
    text: s.text ?? "",
    left: s.left,
    top: s.top,
    width: s.width,
    fontSize: s.fontSize,
    fontFamily: s.fontFamily,
    fill: s.fill,
    fontWeight: s.fontWeight,
    fontStyle: s.fontStyle,
    textAlign: s.textAlign,
    backgroundColor: s.backgroundColor,
    stroke: s.stroke,
    charSpacing: s.charSpacing,
    lineHeight: s.lineHeight,
    shadow: s.shadow,
  });
  obj.set({
    opacity: (s.opacity ?? 100) / 100,
    scaleX: s.scaleX ?? 1,
    scaleY: s.scaleY ?? 1,
    angle: s.angle ?? 0,
    underline: Boolean(s.underline),
  });
  return obj;
}
