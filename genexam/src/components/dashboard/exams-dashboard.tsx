"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Plus, Search, FileText, BookOpen, Clock, Users, MoreHorizontal,
  Pencil, Trash2, Copy, Share2, Eye, EyeOff, Grid, List
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ExamStatus } from "@/types";

interface Exam {
  id: string;
  title: string;
  description?: string | null;
  sourceType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  durationMinutes?: number | null;
  _count: { questions: number; attempts: number };
  shareLinks: { token: string }[];
}

const statusConfig: Record<ExamStatus, { label: string; variant: "success" | "secondary" | "warning" }> = {
  PUBLISHED: { label: "Published", variant: "success" },
  DRAFT: { label: "Draft", variant: "secondary" },
  ARCHIVED: { label: "Archived", variant: "warning" },
};

export function ExamsDashboard({ initialExams }: { initialExams: Exam[] }) {
  const router = useRouter();
  const [exams, setExams] = useState(initialExams);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = exams.filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this exam? This cannot be undone.")) return;
    await fetch(`/api/exams/${id}`, { method: "DELETE" });
    setExams((p) => p.filter((e) => e.id !== id));
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/exams/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setExams((p) => [data, ...p]);
    }
  }

  async function handlePublishToggle(exam: Exam) {
    const endpoint = `/api/exams/${exam.id}/publish`;
    const method = exam.status === "PUBLISHED" ? "DELETE" : "POST";
    const res = await fetch(endpoint, { method });
    if (res.ok) {
      setExams((p) =>
        p.map((e) => e.id === exam.id ? { ...e, status: exam.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" } : e)
      );
    }
  }

  function copyShareLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/exam/${token}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Exams</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{exams.length} exam{exams.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/dashboard/create">
          <Button>
            <Plus className="w-4 h-4" /> New exam
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-400" />
          <Input placeholder="Search exams..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 border border-zinc-200 rounded-md p-1 bg-white">
          {["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${statusFilter === s ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex border border-zinc-200 rounded-md overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-zinc-100" : "bg-white hover:bg-zinc-50"}`}>
            <Grid className="w-4 h-4 text-zinc-600" />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-zinc-100" : "bg-white hover:bg-zinc-50"}`}>
            <List className="w-4 h-4 text-zinc-600" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="font-medium text-zinc-900 mb-1">No exams found</h3>
          <p className="text-sm text-zinc-500 mb-4">
            {search || statusFilter !== "ALL" ? "Try adjusting your filters" : "Create your first AI-powered exam"}
          </p>
          {!search && statusFilter === "ALL" && (
            <Link href="/dashboard/create"><Button size="sm"><Plus className="w-4 h-4" /> Create exam</Button></Link>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exam) => (
            <Card key={exam.id} className="group hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusConfig[exam.status as ExamStatus]?.variant || "secondary"}>
                        {statusConfig[exam.status as ExamStatus]?.label || exam.status}
                      </Badge>
                      <Badge variant="outline">
                        {exam.sourceType === "DOCUMENT" ? <FileText className="w-3 h-3 mr-1 inline" /> : <BookOpen className="w-3 h-3 mr-1 inline" />}
                        {exam.sourceType === "DOCUMENT" ? "Doc" : "Topic"}
                      </Badge>
                    </div>
                    <Link href={`/dashboard/exams/${exam.id}`}>
                      <h3 className="font-semibold text-zinc-900 truncate hover:text-zinc-600 transition-colors">{exam.title}</h3>
                    </Link>
                    {exam.description && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{exam.description}</p>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === exam.id ? null : exam.id)}
                      className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openMenuId === exam.id && (
                      <ExamMenu
                        exam={exam}
                        onClose={() => setOpenMenuId(null)}
                        onDelete={() => { handleDelete(exam.id); setOpenMenuId(null); }}
                        onDuplicate={() => { handleDuplicate(exam.id); setOpenMenuId(null); }}
                        onPublishToggle={() => { handlePublishToggle(exam); setOpenMenuId(null); }}
                        onShareCopy={() => { if (exam.shareLinks[0]) copyShareLink(exam.shareLinks[0].token); setOpenMenuId(null); }}
                        onEdit={() => { router.push(`/dashboard/exams/${exam.id}`); setOpenMenuId(null); }}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{exam._count.questions} questions</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{exam._count.attempts} attempts</span>
                  {exam.durationMinutes && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{exam.durationMinutes}m</span>}
                </div>
                <p className="text-xs text-zinc-400 mt-2">{formatDate(exam.updatedAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((exam) => (
            <div key={exam.id} className="flex items-center gap-4 px-4 py-3 bg-white rounded-lg border border-zinc-200 hover:shadow-sm transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/exams/${exam.id}`} className="font-medium text-zinc-900 hover:text-zinc-600 truncate">{exam.title}</Link>
                  <Badge variant={statusConfig[exam.status as ExamStatus]?.variant || "secondary"} className="shrink-0">
                    {statusConfig[exam.status as ExamStatus]?.label || exam.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                  <span>{exam._count.questions} questions</span>
                  <span>{exam._count.attempts} attempts</span>
                  <span>{formatDate(exam.updatedAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/dashboard/exams/${exam.id}`}>
                  <Button variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5" /></Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handlePublishToggle(exam)}>
                  {exam.status === "PUBLISHED" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                {exam.status === "PUBLISHED" && exam.shareLinks[0] && (
                  <Button variant="ghost" size="sm" onClick={() => copyShareLink(exam.shareLinks[0].token)}>
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDuplicate(exam.id)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(exam.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExamMenu({ exam, onClose, onDelete, onDuplicate, onPublishToggle, onShareCopy, onEdit }: {
  exam: Exam;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPublishToggle: () => void;
  onShareCopy: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-7 z-20 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 text-sm">
        <button onClick={onEdit} className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-zinc-50 text-zinc-700"><Pencil className="w-3.5 h-3.5" /> Edit</button>
        <button onClick={onPublishToggle} className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-zinc-50 text-zinc-700">
          {exam.status === "PUBLISHED" ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
        </button>
        {exam.status === "PUBLISHED" && exam.shareLinks.length > 0 && (
          <button onClick={onShareCopy} className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-zinc-50 text-zinc-700"><Share2 className="w-3.5 h-3.5" /> Copy link</button>
        )}
        <button onClick={onDuplicate} className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-zinc-50 text-zinc-700"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
        <div className="border-t border-zinc-100 my-1" />
        <button onClick={onDelete} className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-zinc-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
      </div>
    </>
  );
}
