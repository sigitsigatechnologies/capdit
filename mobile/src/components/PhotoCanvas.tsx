import React from "react";
import type { RefObject } from "react";
import {
  Blur,
  Canvas,
  ColorMatrix,
  Fill,
  Image as SkiaImage,
  RadialGradient,
  Rect,
  useImage,
  vec,
} from "@shopify/react-native-skia";
import type { CanvasRef } from "@shopify/react-native-skia";
import type { PhotoDoc } from "../types";
import { colors } from "../theme";
import { buildColorMatrix } from "../lib/color";
import { useProjectStore } from "../store/projects";

export function PhotoCanvas({
  photo,
  width,
  height,
  canvasRef,
}: {
  photo: PhotoDoc;
  width: number;
  height: number;
  canvasRef?: RefObject<CanvasRef | null>;
}) {
  const asset = useProjectStore((state) =>
    photo.assetId ? state.assets.find((a) => a.id === photo.assetId) : undefined
  );
  const image = useImage(asset?.uri ?? null);
  const blur = (photo.adjustments.blur / 100) * 14;
  const vignette = photo.adjustments.vignette / 100;

  return (
    <Canvas ref={canvasRef} style={{ width, height, backgroundColor: colors.bg }}>
      <Fill color={colors.bg} />
      {image ? (
        <SkiaImage image={image} x={0} y={0} width={width} height={height} fit={photo.fit}>
          <ColorMatrix matrix={buildColorMatrix(photo.adjustments, photo.filterId, photo.filterIntensity)} />
          {blur > 0.1 ? <Blur blur={blur} /> : null}
        </SkiaImage>
      ) : null}
      {vignette > 0.01 ? (
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width / 2, height / 2)}
            r={Math.max(width, height) * 0.72}
            colors={["rgba(0,0,0,0)", `rgba(0,0,0,${0.75 * vignette})`]}
            positions={[0.55, 1]}
          />
        </Rect>
      ) : null}
    </Canvas>
  );
}
