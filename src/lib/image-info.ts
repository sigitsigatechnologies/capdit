import type { UploadedImage } from "./types";

export async function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to read image"));
    });
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createUploadedImage(file: File): Promise<UploadedImage> {
  return getImageDimensions(file).then(({ width, height }) => ({
    id: `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    file,
    previewUrl: URL.createObjectURL(file),
    name: file.name,
    size: file.size,
    width,
    height,
  }));
}
