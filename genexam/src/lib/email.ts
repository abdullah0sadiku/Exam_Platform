import { Resend } from "resend";
import { buildResultEmail, type ResultEmailParams } from "@/lib/email-templates/result";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Examy <onboarding@resend.dev>";
}

export async function sendResultEmail(params: ResultEmailParams): Promise<void> {
  const resend = getResend();
  const { subject, html, text } = buildResultEmail(params);

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: params.candidateEmail,
    subject,
    html,
    text,
  });

  if (error) throw new Error(error.message);
}
