export interface ResultEmailParams {
  examTitle: string;
  passingScore: number;
  totalPoints: number;
  candidate: { name: string; email: string };
  score: number;
  percentage: number;
  summary: { correct: number; incorrect: number; skipped: number };
  /**
   * When provided, the per-question breakdown table is rendered. Omit to
   * produce the compact version (score card + stat chips only).
   */
  answers?: Array<{
    questionText: string;
    correctAnswer: string | string[];
    candidateAnswer: string | string[] | null;
    isCorrect: boolean;
    points: number;
    awardedPoints: number;
  }>;
}

const FONT_STACK = `-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderAnswer(v: unknown): string {
  if (Array.isArray(v)) return (v as unknown[]).map(String).join(", ");
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export function renderResultEmail(p: ResultEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const passed = p.percentage >= p.passingScore;
  const barWidth = Math.min(Math.max(p.percentage, 0), 100);
  const accentBg = passed ? "#ecfdf5" : "#fef2f2";
  const accentBorder = passed ? "#a7f3d0" : "#fecaca";
  const accentText = passed ? "#047857" : "#b91c1c";
  const accentFill = passed ? "#059669" : "#dc2626";

  const breakdownRows = p.answers
    ? p.answers
        .map((a, i) => {
          const correct = Array.isArray(a.correctAnswer)
            ? a.correctAnswer.join(", ")
            : String(a.correctAnswer ?? "");
          const rowBg = i % 2 === 0 ? "#ffffff" : "#fafafa";
          const status = a.isCorrect ? "Correct" : "Incorrect";
          const statusBg = a.isCorrect ? "#d1fae5" : "#fee2e2";
          const statusFg = a.isCorrect ? "#047857" : "#b91c1c";
          return `<tr style="background-color:${rowBg};">
  <td style="padding:12px 10px;border-bottom:1px solid #f4f4f5;vertical-align:top;width:28px;font-size:12px;color:#a1a1aa;font-weight:600;">${i + 1}</td>
  <td style="padding:12px 10px;border-bottom:1px solid #f4f4f5;vertical-align:top;font-size:13px;color:#18181b;line-height:1.5;">
    <div style="margin-bottom:6px;">${esc(a.questionText)}</div>
    <div style="margin-top:6px;font-size:12px;"><span style="color:#71717a;">Your answer:</span> <span style="color:#18181b;">${esc(renderAnswer(a.candidateAnswer))}</span></div>
    ${a.isCorrect ? "" : `<div style="margin-top:4px;font-size:12px;"><span style="color:#71717a;">Correct:</span> <span style="color:#047857;">${esc(correct)}</span></div>`}
  </td>
  <td style="padding:12px 10px;border-bottom:1px solid #f4f4f5;vertical-align:top;text-align:right;white-space:nowrap;">
    <span style="display:inline-block;padding:3px 9px;font-size:11px;font-weight:600;border-radius:999px;background-color:${statusBg};color:${statusFg};">${status}</span>
    <div style="margin-top:6px;font-size:11px;color:#a1a1aa;">${a.awardedPoints} / ${a.points} pt${a.points !== 1 ? "s" : ""}</div>
  </td>
</tr>`;
        })
        .join("")
    : "";

  const breakdown = p.answers
    ? `<tr>
  <td style="padding:0 24px 24px 24px;">
    <p style="margin:0 0 10px 0;font-family:${FONT_STACK};font-size:13px;font-weight:600;color:#18181b;text-transform:uppercase;letter-spacing:0.5px;">Question-by-question breakdown</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;font-family:${FONT_STACK};">
      <thead>
        <tr style="background-color:#fafafa;">
          <th align="left" style="padding:10px;border-bottom:1px solid #e4e4e7;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;font-weight:600;">#</th>
          <th align="left" style="padding:10px;border-bottom:1px solid #e4e4e7;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;font-weight:600;">Question</th>
          <th align="right" style="padding:10px;border-bottom:1px solid #e4e4e7;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;font-weight:600;">Result</th>
        </tr>
      </thead>
      <tbody>${breakdownRows}</tbody>
    </table>
  </td>
</tr>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Exam results — ${esc(p.examTitle)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${FONT_STACK};color:#18181b;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;visibility:hidden;">Your score: ${p.score} / ${p.totalPoints} (${p.percentage}%) · ${passed ? "Passed" : "Did not pass"}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:18px 24px;border-bottom:1px solid #e4e4e7;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:#18181b;width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;font-family:${FONT_STACK};">
                  <span style="color:#ffffff;font-weight:700;font-size:14px;line-height:32px;">G</span>
                </td>
                <td style="padding-left:10px;font-family:${FONT_STACK};font-weight:700;font-size:15px;color:#18181b;vertical-align:middle;">GenExam</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 6px 24px;font-family:${FONT_STACK};">
            <p style="margin:0 0 6px 0;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Your exam results</p>
            <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#18181b;font-weight:700;">${esc(p.examTitle)}</h1>
            <p style="margin:0 0 22px 0;font-size:14px;line-height:1.6;color:#52525b;">Hi ${esc(p.candidate.name)}, here&rsquo;s how you did on this exam.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 22px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${accentBg};border:1px solid ${accentBorder};border-radius:12px;">
              <tr>
                <td align="center" style="padding:26px 20px;font-family:${FONT_STACK};">
                  <p style="margin:0;font-size:48px;line-height:1;font-weight:800;color:${accentText};letter-spacing:-1px;">${p.percentage}%</p>
                  <p style="margin:8px 0 16px 0;font-size:13px;color:${accentText};">${p.score} / ${p.totalPoints} points</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:340px;margin:0 auto;">
                    <tr>
                      <td style="background-color:#ffffff;border-radius:999px;padding:0;font-size:0;line-height:0;" height="8">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:${barWidth}%;background-color:${accentFill};border-radius:999px;">
                          <tr><td height="8" style="font-size:0;line-height:0;">&nbsp;</td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:18px 0 0 0;">
                    <span style="display:inline-block;padding:5px 12px;font-size:12px;font-weight:700;border-radius:999px;background-color:${accentFill};color:#ffffff;letter-spacing:0.3px;">${passed ? "PASSED" : "NOT PASSED"}</span>
                    <span style="display:inline-block;padding:5px 10px;font-size:12px;color:${accentText};">Passing score: ${p.passingScore}%</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="33.33%" valign="top" style="padding-right:6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;">
                    <tr><td align="center" style="padding:14px 8px;font-family:${FONT_STACK};">
                      <p style="margin:0;font-size:24px;font-weight:700;color:#047857;">${p.summary.correct}</p>
                      <p style="margin:4px 0 0 0;font-size:11px;color:#047857;text-transform:uppercase;letter-spacing:0.5px;">Correct</p>
                    </td></tr>
                  </table>
                </td>
                <td width="33.33%" valign="top" style="padding:0 6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
                    <tr><td align="center" style="padding:14px 8px;font-family:${FONT_STACK};">
                      <p style="margin:0;font-size:24px;font-weight:700;color:#b91c1c;">${p.summary.incorrect}</p>
                      <p style="margin:4px 0 0 0;font-size:11px;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">Incorrect</p>
                    </td></tr>
                  </table>
                </td>
                <td width="33.33%" valign="top" style="padding-left:6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;">
                    <tr><td align="center" style="padding:14px 8px;font-family:${FONT_STACK};">
                      <p style="margin:0;font-size:24px;font-weight:700;color:#52525b;">${p.summary.skipped}</p>
                      <p style="margin:4px 0 0 0;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;">Skipped</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${breakdown}
        <tr>
          <td style="padding:16px 24px 20px 24px;border-top:1px solid #e4e4e7;background-color:#fafafa;">
            <p style="margin:0;font-family:${FONT_STACK};font-size:12px;color:#a1a1aa;line-height:1.5;">Sent by GenExam on behalf of the exam author. Reply to this email or contact the sender directly if you have questions about your result.</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0 0;font-family:${FONT_STACK};font-size:11px;color:#a1a1aa;">This email was sent to ${esc(p.candidate.email)}.</p>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = `Exam: ${p.examTitle}
Score: ${p.score}/${p.totalPoints} (${p.percentage}%)
Passing score: ${p.passingScore}%
Outcome: ${passed ? "Passed" : "Did not pass"}
Correct: ${p.summary.correct} · Incorrect: ${p.summary.incorrect} · Skipped: ${p.summary.skipped}`;

  return {
    subject: `Your results for ${p.examTitle}`,
    html,
    text,
  };
}

/**
 * Sample params for the preview route so authors can eyeball the template
 * before an attempt even exists.
 */
export const SAMPLE_RESULT_PARAMS: ResultEmailParams = {
  examTitle: "Sample Exam — JavaScript Fundamentals",
  passingScore: 70,
  totalPoints: 20,
  candidate: { name: "Alex Rivera", email: "alex.rivera@example.com" },
  score: 17,
  percentage: 85,
  summary: { correct: 8, incorrect: 1, skipped: 1 },
  answers: [
    {
      questionText: "What does the === operator check in JavaScript?",
      correctAnswer: "Value and type equality",
      candidateAnswer: "Value and type equality",
      isCorrect: true,
      points: 2,
      awardedPoints: 2,
    },
    {
      questionText: "Which keyword declares a block-scoped variable that cannot be reassigned?",
      correctAnswer: "const",
      candidateAnswer: "let",
      isCorrect: false,
      points: 2,
      awardedPoints: 0,
    },
    {
      questionText: "Select all array methods that mutate the original array.",
      correctAnswer: ["push", "pop", "splice"],
      candidateAnswer: ["push", "pop", "splice"],
      isCorrect: true,
      points: 3,
      awardedPoints: 3,
    },
    {
      questionText: "What is the output of typeof null?",
      correctAnswer: "object",
      candidateAnswer: null,
      isCorrect: false,
      points: 2,
      awardedPoints: 0,
    },
  ],
};
