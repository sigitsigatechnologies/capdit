import type { RefObject } from "react";
import * as MediaLibrary from "expo-media-library";
import { File, Paths } from "expo-file-system";
import { ImageFormat, type CanvasRef } from "@shopify/react-native-skia";
import { safeFileName } from "./utils";

export interface ExportResult {
  uri: string;
  saved: boolean;
}

export async function exportPhoto(
  canvas: RefObject<CanvasRef | null>,
  name: string,
  format: "jpeg" | "png" = "jpeg"
): Promise<ExportResult> {
  if (!canvas.current) throw new Error("Canvas is not ready yet.");
  const image = await canvas.current.makeImageSnapshotAsync();
  const extension = format === "png" ? "png" : "jpg";
  const file = new File(Paths.cache, `${safeFileName(name) || "capdit-export"}.${extension}`);
  const base64 = image.encodeToBase64(format === "png" ? ImageFormat.PNG : ImageFormat.JPEG, 92);
  await file.write(base64, { encoding: "base64" });

  let saved = false;
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (permission.granted) {
      await MediaLibrary.saveToLibraryAsync(file.uri);
      saved = true;
    }
  } catch {
    saved = false;
  }
  return { uri: file.uri, saved };
}
