import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { sendMail } from "@/lib/email";

export async function POST() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({ where: { id: userId! } });
  if (!user?.email) return apiError("Your account has no email address", 400);

  try {
    await sendMail({
      to: user.email,
      subject: "GenExam — SMTP test",
      text: "This is a test email from GenExam. If you see this, your SMTP configuration is working.",
      html: `<p>This is a test email from <strong>GenExam</strong>.</p>
<p>If you see this, your SMTP configuration is working.</p>`,
      userId: userId!,
    });
    return NextResponse.json({ success: true, sentTo: user.email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return apiError(`Test email failed: ${msg}`, 500);
  }
}
