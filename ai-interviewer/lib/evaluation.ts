import type { Evaluation, Recommendation, Score } from "@/types/interview";
import { EVALUATION_KEYS } from "@/lib/prompts";

/**
 * Parse and validate the JSON evaluation produced by Claude.
 *
 * Claude is told to emit raw JSON, but we still tolerate ```json fences``` and
 * trailing whitespace. After parsing we shape-check critical fields and
 * coerce out-of-range scores into 1–5.
 */

export function parseEvaluation(raw: string): Evaluation {
  const cleaned = stripFences(raw).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Evaluator returned invalid JSON: ${(err as Error).message}\n${cleaned.slice(0, 200)}`,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Evaluator JSON is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  for (const key of EVALUATION_KEYS) {
    if (!(key in obj)) throw new Error(`Evaluation missing field: ${key}`);
  }

  return {
    overall_score: clampScore(obj.overall_score),
    recommendation: assertRecommendation(obj.recommendation),
    strengths: asStringArray(obj.strengths),
    concerns: asStringArray(obj.concerns),
    skill_assessment: clampSkillAssessment(obj.skill_assessment),
    key_quotes: asKeyQuotes(obj.key_quotes),
    next_step_suggestion: String(obj.next_step_suggestion ?? ""),
  };
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
}

function clampScore(v: unknown): Score {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return 3;
  return (Math.max(1, Math.min(5, n)) as Score);
}

function clampSkillAssessment(v: unknown): Evaluation["skill_assessment"] {
  const out: Record<string, Score> = {
    コミュニケーション: 3,
    論理的思考: 3,
    経験の深さ: 3,
    カルチャーフィット: 3,
    志望意欲: 3,
  };
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = clampScore(val);
    }
  }
  return out as Evaluation["skill_assessment"];
}

function assertRecommendation(v: unknown): Recommendation {
  if (v === "通過" || v === "保留" || v === "不合格") return v;
  return "保留";
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter((s) => s.length > 0);
}

function asKeyQuotes(v: unknown): Evaluation["key_quotes"] {
  if (!Array.isArray(v)) return [];
  return v
    .map((q) => {
      if (!q || typeof q !== "object") return null;
      const obj = q as { topic?: unknown; quote?: unknown };
      return {
        topic: String(obj.topic ?? ""),
        quote: String(obj.quote ?? ""),
      };
    })
    .filter((q): q is { topic: string; quote: string } => q !== null);
}
