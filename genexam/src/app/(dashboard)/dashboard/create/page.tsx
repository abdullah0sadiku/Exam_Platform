"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, BookOpen, Upload, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type Step = "mode" | "configure" | "generating" | "done";
type Mode = "topic" | "document";

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "MULTIPLE_SELECT", label: "Multiple Select" },
  { value: "TRUE_FALSE", label: "True / False" },
  { value: "SHORT_ANSWER", label: "Short Answer" },
  { value: "OPEN_ENDED", label: "Open Ended" },
];

export default function CreateExamPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<Mode>("topic");
  const [error, setError] = useState("");

  // Topic form
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [subtopics, setSubtopics] = useState("");
  const [audience, setAudience] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [questionCount, setQuestionCount] = useState("10");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["MULTIPLE_CHOICE"]);
  const [timeLimit, setTimeLimit] = useState("");
  const [language, setLanguage] = useState("English");
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");

  // Document form
  const [file, setFile] = useState<File | null>(null);
  const [strictGrounding, setStrictGrounding] = useState(true);

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleGenerate() {
    setError("");
    setStep("generating");

    try {
      let examId: string;

      if (mode === "topic") {
        const res = await fetch("/api/generate/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            topic,
            subtopics,
            targetAudience: audience,
            difficulty,
            questionCount: Number(questionCount),
            questionTypes: selectedTypes,
            timeLimitMinutes: timeLimit ? Number(timeLimit) : undefined,
            language,
            includeExplanations,
            customInstructions,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        examId = data.examId;
      } else {
        if (!file) throw new Error("Please select a file");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("questionCount", questionCount);
        formData.append("difficulty", difficulty);
        formData.append("questionTypes", JSON.stringify(selectedTypes));
        formData.append("includeExplanations", String(includeExplanations));
        formData.append("strictGrounding", String(strictGrounding));
        if (customInstructions) formData.append("customInstructions", customInstructions);

        const res = await fetch("/api/generate/document", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        examId = data.examId;
      }

      setStep("done");
      setTimeout(() => router.push(`/dashboard/exams/${examId}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("configure");
    }
  }

  if (step === "generating") {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-7 h-7 text-zinc-600 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Generating exam…</h2>
        <p className="text-zinc-500 text-sm">The AI is creating your questions. This may take 15–30 seconds.</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Exam created!</h2>
        <p className="text-zinc-500 text-sm">Redirecting to editor…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Create exam</h1>
          <p className="text-sm text-zinc-500">Choose how you want to generate it</p>
        </div>
      </div>

      {step === "mode" && (
        <div className="grid grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-2 ${mode === "topic" ? "border-zinc-900" : "border-zinc-200"}`}
            onClick={() => setMode("topic")}
          >
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center mb-2">
                <BookOpen className="w-5 h-5 text-zinc-600" />
              </div>
              <CardTitle className="text-base">From topics</CardTitle>
              <CardDescription>Describe the subject and let AI build the exam from scratch</CardDescription>
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-2 ${mode === "document" ? "border-zinc-900" : "border-zinc-200"}`}
            onClick={() => setMode("document")}
          >
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center mb-2">
                <FileText className="w-5 h-5 text-zinc-600" />
              </div>
              <CardTitle className="text-base">From document</CardTitle>
              <CardDescription>Upload a PDF, DOCX, or TXT and generate questions grounded in it</CardDescription>
            </CardHeader>
          </Card>
          <div className="col-span-2 flex justify-end">
            <Button onClick={() => setStep("configure")}>Continue</Button>
          </div>
        </div>
      )}

      {step === "configure" && (
        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {mode === "topic" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exam details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Exam title *</Label>
                  <Input placeholder="e.g. Python Fundamentals Assessment" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Topic *</Label>
                  <Input placeholder="e.g. Python programming" value={topic} onChange={(e) => setTopic(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtopics <span className="text-zinc-400">(optional)</span></Label>
                  <Textarea placeholder="e.g. variables, loops, functions, OOP" rows={2} value={subtopics} onChange={(e) => setSubtopics(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Target audience</Label>
                    <Input placeholder="e.g. Beginner developers" value={audience} onChange={(e) => setAudience(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Language</Label>
                    <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload document</CardTitle>
                <CardDescription>PDF, DOCX, or TXT — max 10MB</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-zinc-200 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-400 transition-colors"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                  {file ? (
                    <p className="text-sm font-medium text-zinc-900">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-zinc-600 font-medium">Click to upload</p>
                      <p className="text-xs text-zinc-400 mt-1">PDF, DOCX, TXT</p>
                    </>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={strictGrounding} onChange={(e) => setStrictGrounding(e.target.checked)} className="rounded" />
                  <span className="text-zinc-700">Strict grounding (only use document content)</span>
                </label>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generation settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Number of questions</Label>
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20, 25, 30, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                      <SelectItem value="MIXED">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Question types</Label>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => toggleType(t.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        selectedTypes.includes(t.value)
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Time limit (minutes) <span className="text-zinc-400">optional</span></Label>
                  <Input type="number" placeholder="e.g. 60" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={includeExplanations} onChange={(e) => setIncludeExplanations(e.target.checked)} className="rounded" />
                    <span className="text-zinc-700">Include explanations</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Custom instructions <span className="text-zinc-400">optional</span></Label>
                <Textarea placeholder="Any special requirements..." rows={2} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep("mode")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button
              onClick={handleGenerate}
              disabled={mode === "topic" ? !title || !topic || selectedTypes.length === 0 : !file || selectedTypes.length === 0}
            >
              Generate exam
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
