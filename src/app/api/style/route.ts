import { NextResponse } from "next/server";
import {
  ADJUSTMENT_KEYS,
  DEFAULT_ADJUSTMENTS,
  clampAdjustments,
  summarizeAdjustments,
  type Adjustments,
} from "@/lib/adjustments";
import { generateStyleAdjustments } from "@/lib/style-engine";

type Provider = "gemini" | "openai";

const SYSTEM_PROMPT =
  "You design Adobe Lightroom presets from a style name. Return ONLY a JSON object with numeric fields: exposure, contrast, highlights, shadows, whites, blacks, temperature, tint, vibrance, saturation, clarity, texture, dehaze, sharpening, vignette, grain. Ranges: exposure -5..5; most others -100..100; sharpening and grain 0..100. Base the values on the requested style. No prose.";

function toOverrides(raw: string): Partial<Adjustments> {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return {};
  }
  const overrides: Partial<Adjustments> = {};
  ADJUSTMENT_KEYS.forEach((key) => {
    const value = Number(parsed[key]);
    if (Number.isFinite(value)) overrides[key] = value;
  });
  return overrides;
}

type ModelOutputStep = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

async function callGemini(text: string, apiKey: string, models: string[]): Promise<string | null> {
  const schema = {
    type: "object",
    properties: Object.fromEntries(ADJUSTMENT_KEYS.map((key) => [key, { type: "number" }])),
    required: ADJUSTMENT_KEYS,
  };

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/interactions",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              model,
              input: `${SYSTEM_PROMPT}\n\nStyle name: ${text}`,
              response_format: schema,
              generation_config: { temperature: 0.5 },
            }),
          }
        );
        if (response.status === 503) {
          await new Promise((resolve) => setTimeout(resolve, 700));
          continue;
        }
        if (!response.ok) break;
        const data = (await response.json()) as { steps?: ModelOutputStep[] };
        const content = (data.steps ?? [])
          .filter((step) => step.type === "model_output")
          .flatMap((step) => step.content ?? [])
          .map((part) => part.text ?? "")
          .join("");
        if (content.trim()) return content;
        break;
      } catch {
        break;
      }
    }
  }
  return null;
}

async function callOpenAI(text: string, apiKey: string, model: string): Promise<string | null> {
  try {
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let text = "";
  let requestedProvider: Provider | undefined;
  let providedKey: string | undefined;
  let providedModel: string | undefined;

  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text : "";
    if (body?.provider === "gemini" || body?.provider === "openai") requestedProvider = body.provider;
    if (typeof body?.apiKey === "string" && body.apiKey.trim()) providedKey = body.apiKey.trim();
    if (typeof body?.model === "string" && body.model.trim()) providedModel = body.model.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Empty prompt" }, { status: 400 });
  }

  const fallback = generateStyleAdjustments(text);

  const geminiEnvKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const provider: Provider =
    requestedProvider ?? (geminiEnvKey ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "gemini");

  const apiKey =
    providedKey ?? (provider === "gemini" ? geminiEnvKey : process.env.OPENAI_API_KEY);

  if (!apiKey) {
    return NextResponse.json({ ...fallback, source: "engine", provider: "engine" });
  }

  let content: string | null = null;
  if (provider === "gemini") {
    const models = providedModel
      ? [providedModel]
      : [
          process.env.GEMINI_MODEL,
          "gemini-flash-lite-latest",
          "gemini-3.5-flash-lite",
          "gemini-3.1-flash-lite",
          "gemini-flash-latest",
          "gemini-3.8-flash",
        ].filter((value): value is string => Boolean(value));
    content = await callGemini(text, apiKey, models);
  } else {
    content = await callOpenAI(text, apiKey, providedModel ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini");
  }

  if (!content) {
    return NextResponse.json({ ...fallback, source: "engine", provider });
  }

  const adjust = clampAdjustments({
    ...DEFAULT_ADJUSTMENTS,
    ...fallback.adjust,
    ...toOverrides(content),
  });

  return NextResponse.json({
    adjust,
    matched: fallback.matched,
    summary: summarizeAdjustments(adjust),
    source: "ai",
    provider,
  });
}
