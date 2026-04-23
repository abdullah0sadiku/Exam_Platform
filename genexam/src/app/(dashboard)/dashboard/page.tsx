import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExamsDashboard } from "@/components/dashboard/exams-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  const examsRaw = await prisma.exam.findMany({
    where: { userId: session!.user!.id! },
    include: {
      _count: { select: { questions: true, attempts: true } },
      shareLinks: { where: { isActive: true }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Serialise dates for client component
  const exams = examsRaw.map((e) => ({
    ...e,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    shareLinks: e.shareLinks.map((sl) => ({ token: sl.token })),
  }));

  return <ExamsDashboard initialExams={exams} />;
}
