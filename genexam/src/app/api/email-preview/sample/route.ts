import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { renderResultEmail, SAMPLE_RESULT_PARAMS } from "@/lib/email-templates/result";

/**
 * Mock preview of the candidate-result email, for authors who want to see the
 * template before any candidate has submitted. Auth-gated so we don't leak
 * the template to anonymous visitors.
 *
 * Query params:
 *   breakdown=0|1   include the per-question table (default 1)
 *   failed=1        render the "not passed" colour variant instead of passed
 */
export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const includeBreakdown = searchParams.get("breakdown") !== "0";
  const failed = searchParams.get("failed") === "1";

  const params = failed
    ? {
        ...SAMPLE_RESULT_PARAMS,
        score: 9,
        percentage: 45,
        summary: { correct: 4, incorrect: 5, skipped: 1 },
      }
    : SAMPLE_RESULT_PARAMS;

  const { html } = renderResultEmail({
    ...params,
    answers: includeBreakdown ? params.answers : undefined,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
