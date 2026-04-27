import { NextResponse } from "next/server";
import type { HeyGenTokenResponse } from "@/types/interview";

/**
 * POST /api/heygen-token
 *
 * Issues a short-lived HeyGen Streaming Avatar session token.
 * The HEYGEN_API_KEY stays on the server; the browser receives only a token.
 *
 * Quick test:
 *   curl -X POST http://localhost:3000/api/heygen-token | jq .
 *
 * HeyGen tokens are short-lived (currently ~minutes), so callers should
 * fetch a fresh token immediately before starting a streaming session.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEYGEN_TOKEN_ENDPOINT = "https://api.heygen.com/v1/streaming.create_token";
// HeyGen does not return a TTL; we treat tokens as ~5min as documented.
const ASSUMED_TOKEN_TTL_SEC = 5 * 60;

export async function POST() {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "HEYGEN_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(HEYGEN_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    });
  } catch (err) {
    console.error("[heygen-token] network error", err);
    return NextResponse.json(
      { error: "Failed to reach HeyGen API." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("[heygen-token] upstream error", upstream.status, detail);
    return NextResponse.json(
      { error: `HeyGen returned ${upstream.status}.` },
      { status: 502 },
    );
  }

  const json = (await upstream.json().catch(() => null)) as
    | { data?: { token?: string } }
    | null;
  const token = json?.data?.token;
  if (!token) {
    console.error("[heygen-token] missing token in response", json);
    return NextResponse.json(
      { error: "HeyGen response did not include a token." },
      { status: 502 },
    );
  }

  const body: HeyGenTokenResponse = {
    token,
    expiresAt: Math.floor(Date.now() / 1000) + ASSUMED_TOKEN_TTL_SEC,
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
