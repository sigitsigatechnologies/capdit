import { z } from "zod";

const bounded = (min: number, max: number) => z.number().min(min).max(max);

export const adjustmentsSchema = z
  .object({
    exposure: bounded(-5, 5),
    contrast: bounded(-100, 100),
    highlights: bounded(-100, 100),
    shadows: bounded(-100, 100),
    whites: bounded(-100, 100),
    blacks: bounded(-100, 100),
    temperature: bounded(-100, 100),
    tint: bounded(-100, 100),
    vibrance: bounded(-100, 100),
    saturation: bounded(-100, 100),
    clarity: bounded(-100, 100),
    texture: bounded(-100, 100),
    dehaze: bounded(-100, 100),
    sharpening: bounded(0, 100),
    vignette: bounded(-100, 100),
    grain: bounded(0, 100),
  })
  .partial();

export const imageStatsSchema = z.object({
  brightness: z.number(),
  contrast: z.number(),
  saturation: z.number(),
  temperature: z.number(),
  tint: z.number(),
  highlightClip: z.number(),
  shadowClip: z.number(),
  sky: z.number(),
  greenery: z.number(),
  skin: z.number(),
  dominantColors: z.array(z.string()),
  width: z.number(),
  height: z.number(),
});

export const analysisInputSchema = z
  .object({
    stats: imageStatsSchema,
    sceneType: z.string().optional(),
    portrait: z.boolean().optional(),
    environment: z.string().optional(),
    lighting: z.string().optional(),
    exposure: z.string().optional(),
    whiteBalance: z.string().optional(),
    skinTone: z.string().optional(),
    dominantColors: z.array(z.string()).optional(),
    highlightCondition: z.string().optional(),
    shadowCondition: z.string().optional(),
    mood: z.string().optional(),
    summary: z.string().optional(),
    recommendedAdjustments: adjustmentsSchema.optional(),
    source: z.enum(["ai", "cv"]).optional(),
  })
  .passthrough();

export const referenceMatchSchema = z.object({
  stats: imageStatsSchema,
  similarity: z.number(),
  summary: z.string(),
});

export const generateRequestSchema = z.object({
  styleId: z.string().min(1),
  intensity: z.number().min(0).max(100),
  adaptive: z.boolean().optional().default(true),
  analysis: analysisInputSchema,
  reference: referenceMatchSchema.optional(),
});

export const exportRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  styleId: z.string().min(1),
  adjust: adjustmentsSchema,
});

export const aiAnalysisSchema = z.object({
  sceneType: z.string().default("general"),
  portrait: z.boolean().default(false),
  environment: z.string().default("outdoor"),
  lighting: z.string().default("natural light"),
  exposure: z.string().default("balanced"),
  whiteBalance: z.string().default("neutral"),
  skinTone: z.string().default("natural"),
  dominantColors: z.array(z.string()).default([]),
  highlightCondition: z.string().default("controlled"),
  shadowCondition: z.string().default("balanced"),
  mood: z.string().default("natural"),
  summary: z.string().default("Natural photographic look"),
  recommendedAdjustments: adjustmentsSchema.default({}),
});

export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
