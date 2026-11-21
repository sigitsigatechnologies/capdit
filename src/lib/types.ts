export type MediaKind = "image" | "video" | "audio";

export interface MediaAsset {
  id: string;
  name: string;
  kind: MediaKind;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
  createdAt: number;
}

export type ProjectMode = "photo" | "video";

export interface ProjectRecord {
  id: string;
  name: string;
  mode: ProjectMode;
  aspect: string;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  template?: string;
  photo?: PhotoDoc;
  video?: VideoDoc;
}

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  sharpness: number;
  blur: number;
  vignette: number;
  fade: number;
  grain: number;
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  blur: 0,
  vignette: 0,
  fade: 0,
  grain: 0,
};

export interface PhotoBackground {
  type: "none" | "color" | "gradient" | "blur" | "transparent";
  color: string;
  gradientFrom: string;
  gradientTo: string;
  blurAmount: number;
  keyed: boolean;
  keyTolerance: number;
}

export interface PhotoDoc {
  assetId?: string;
  adjustments: Adjustments;
  filterId: string | null;
  filterIntensity: number;
  background: PhotoBackground;
  presetName?: string;
  crop?: { x: number; y: number; width: number; height: number } | null;
  objects: SerializedObject[];
  aspect: string;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface SerializedObject {
  id: string;
  type: "text" | "sticker" | "shape";
  text?: string;
  content?: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  fill?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  charSpacing?: number;
  lineHeight?: number;
  underline?: boolean;
  stroke?: string;
  strokeWidth?: number;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number } | null;
  backgroundColor?: string;
  animation?: string;
}

export type TrackType = "video" | "image" | "text" | "audio" | "overlay";

export interface ClipTransition {
  type: "none" | "fade" | "dissolve" | "slide" | "zoom" | "wipe" | "blur";
  duration: number;
}

export interface VideoClip {
  id: string;
  trackId: string;
  assetId?: string;
  text?: string;
  name: string;
  kind: MediaKind | "text";
  start: number;
  duration: number;
  inPoint: number;
  speed: number;
  volume: number;
  muted: boolean;
  opacity: number;
  scale: number;
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  crop: { top: number; right: number; bottom: number; left: number };
  adjustments: Adjustments;
  filterId: string | null;
  filterIntensity: number;
  fadeIn: number;
  fadeOut: number;
  effect: string | null;
  transitionIn: ClipTransition;
  animation?: string;
  textStyle?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    background: string;
    bold: boolean;
    italic: boolean;
    align: "left" | "center" | "right";
    stroke: string;
    shadow: boolean;
    letterSpacing: number;
    lineHeight: number;
    preset?: string;
  };
}

export interface VideoTrack {
  id: string;
  type: TrackType;
  name: string;
  muted: boolean;
  locked: boolean;
  hidden: boolean;
}

export interface VideoDoc {
  tracks: VideoTrack[];
  clips: VideoClip[];
  duration: number;
  aspect: string;
  fps: number;
  background: string;
  template?: string;
}

export interface ExportSettings {
  format: string;
  quality: number;
  resolution: string;
  width: number;
  height: number;
  fps: number;
}

export interface AIProviderSettings {
  provider: "none" | "openai" | "replicate" | "custom";
  apiKey: string;
  baseUrl: string;
  model: string;
}
