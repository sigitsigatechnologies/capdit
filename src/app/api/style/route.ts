import { NextResponse } from "next/server";
import {
  ADJUSTMENT_KEYS,
  DEFAULT_ADJUSTMENTS,
  clampAdjustments,
  summarizeAdjustments,
  type Adjustments,
} from "@/lib/adjustments";
import { generateStyleAdjustments } from "@/lib/style-engine";

export async function POST(request: Request) {
  let text = "";
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Empty prompt" }, { status: 400 });
  }

  const fallback = generateStyleAdjustments(text);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ...fallback, source: "engine" });
  }

  try {
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You design Adobe Lightroom presets from a style name. Return ONLY a JSON object with numeric fields: exposure, contrast, highlights, shadows, whites, blacks, temperature, tint, vibrance, saturation, clarity, texture, dehaze, sharpening, vignette, grain. Ranges: exposure -5..5; most others -100..100; sharpening and grain 0..100. No prose.",
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) throw new Error("Provider rejected the request");

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as Record<string, unknown>;

    const overrides: Partial<Adjustments> = {};
    ADJUSTMENT_KEYS.forEach((key) => {
      const value = Number(parsed[key]);
      if (Number.isFinite(value)) overrides[key] = value;
    });

    const adjust = clampAdjustments({ ...DEFAULT_ADJUSTMENTS, ...fallback.adjust, ...overrides });
    return NextResponse.json({
      adjust,
      matched: fallback.matched,
      summary: summarizeAdjustments(adjust),
      source: "ai",
    });
  } catch {
    return NextResponse.json({ ...fallback, source: "engine" });
  }
}
