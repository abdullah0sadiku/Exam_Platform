import { NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { sendMail } from "@/lib/email";
import { renderResultEmail } from "@/lib/email-templates/result";
import { loadAttemptForOwner } from "@/lib/email-templates/load-result-params";
import { z } from "zod";

const bodySchema = z.object({
  includeBreakdown: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { id: examId, attemptId } = await params;

  let includeBreakdown = false;
  try {
    const raw = await req.json().catch(() => ({}));
    includeBreakdown = bodySchema.parse(raw).includeBreakdown;
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
  }

  const loaded = await loadAttemptForOwner(examId, attemptId, userId!);
  if (loaded.kind === "error") return loaded.response;

  const { subject, html, text } = renderResultEmail({
    ...loaded.params,
    answers: includeBreakdown ? loaded.params.answers : undefined,
  });

  try {
    await sendMail({
      to: loaded.params.candidate.email,
      subject,
      html,
      text,
      userId: userId!,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown email error";
    console.error("[attempt email] send failed:", err);
    return apiError(`Failed to send email: ${msg}`, 500);
  }
}
