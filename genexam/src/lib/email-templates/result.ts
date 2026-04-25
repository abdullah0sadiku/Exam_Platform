export interface ResultEmailParams {
  candidateName: string;
  candidateEmail: string;
  examTitle: string;
  percentage: number;
  score: number;
  totalPoints: number;
  passingScore: number;
  passed: boolean;
  correct: number;
  incorrect: number;
  skipped: number;
  submittedAt: Date;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildResultEmail(p: ResultEmailParams): { subject: string; html: string; text: string } {
  const subject = `Your results for "${p.examTitle}"`;

  const passColor = p.passed ? "#16a34a" : "#dc2626";
  const passBg = p.passed ? "#dcfce7" : "#fee2e2";
  const passLabel = p.passed ? "PASSED" : "FAILED";
  const barWidth = Math.round(Math.min(p.percentage, 100));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">GenExam</p>
            <p style="margin:4px 0 0;font-size:13px;color:#a1a1aa;">Exam Results</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <p style="margin:0 0 8px;font-size:16px;color:#3f3f46;">Hi <strong>${esc(p.candidateName)}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Here are your results for <strong>${esc(p.examTitle)}</strong>.</p>

            <!-- Score block -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:24px;" align="center">
                  <p style="margin:0 0 4px;font-size:48px;font-weight:800;color:${passColor};line-height:1;">${p.percentage}%</p>
                  <p style="margin:0 0 12px;font-size:13px;color:#71717a;">${p.score} / ${p.totalPoints} points</p>
                  <span style="display:inline-block;padding:4px 14px;border-radius:99px;background:${passBg};color:${passColor};font-size:12px;font-weight:700;letter-spacing:.5px;">${passLabel}</span>
                  <p style="margin:12px 0 4px;font-size:12px;color:#a1a1aa;">Passing score: ${p.passingScore}%</p>

                  <!-- Progress bar -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                    <tr>
                      <td style="background:#e4e4e7;border-radius:99px;height:8px;overflow:hidden;">
                        <div style="width:${barWidth}%;height:8px;background:${passColor};border-radius:99px;"></div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Summary row -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td width="33%" align="center" style="padding:16px 8px;background:#f0fdf4;border-radius:8px;">
                  <p style="margin:0;font-size:26px;font-weight:700;color:#16a34a;">${p.correct}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#15803d;">Correct</p>
                </td>
                <td width="4px"></td>
                <td width="33%" align="center" style="padding:16px 8px;background:#fef2f2;border-radius:8px;">
                  <p style="margin:0;font-size:26px;font-weight:700;color:#dc2626;">${p.incorrect}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#b91c1c;">Incorrect</p>
                </td>
                <td width="4px"></td>
                <td width="33%" align="center" style="padding:16px 8px;background:#fafafa;border-radius:8px;border:1px solid #e4e4e7;">
                  <p style="margin:0;font-size:26px;font-weight:700;color:#71717a;">${p.skipped}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Skipped</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#a1a1aa;">
              Submitted on ${new Date(p.submittedAt).toLocaleDateString("en-US", { dateStyle: "long" })}
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f4f4f5;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
              Sent by GenExam &mdash; This email was generated automatically.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${p.candidateName},

Here are your results for "${p.examTitle}".

Score: ${p.percentage}% (${p.score}/${p.totalPoints} points) — ${passLabel}
Passing score: ${p.passingScore}%

Correct:   ${p.correct}
Incorrect: ${p.incorrect}
Skipped:   ${p.skipped}

Submitted: ${new Date(p.submittedAt).toLocaleDateString("en-US", { dateStyle: "long" })}

— GenExam`;

  return { subject, html, text };
}
