import { ExamTaker } from "@/components/exam/exam-taker";

export default async function PublicExamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ExamTaker token={token} />;
}
