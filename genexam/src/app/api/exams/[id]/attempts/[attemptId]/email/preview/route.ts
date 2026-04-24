import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { renderResultEmail } from "@/lib/email-templates/result";
import { loadAttemptForOwner } from "@/lib/email-templates/load-result-params";

/**
 * Renders the candidate-result email HTML for a given attempt, so the exam
 * author can eyeball the template before clicking "Email result". No mail
 * is sent. Owner-gated identically to the send route.
 *
 * Query params:
 *   breakdown=0|1   include the per-question table (default 1)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { id: examId, attemptId } = await params;
  const { searchParams } = new URL(req.url);
  const includeBreakdown = searchParams.get("breakdown") !== "0";

  const loaded = await loadAttemptForOwner(examId, attemptId, userId!);
  if (loaded.kind === "error") return loaded.response;

  const { html } = renderResultEmail({
    ...loaded.params,
    answers: includeBreakdown ? loaded.params.answers : undefined,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Belt-and-braces: prevent the browser from caching the preview so an
      // edited template reflects immediately.
      "Cache-Control": "no-store",
    },
  });
}
