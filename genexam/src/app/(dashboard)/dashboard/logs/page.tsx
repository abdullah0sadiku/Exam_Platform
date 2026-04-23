"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Log {
  id: string;
  generationMode: string;
  status: string;
  promptVersion: string;
  tokenUsage: Record<string, number>;
  createdAt: string;
  errorMessage?: string;
  exam?: { title: string };
  providerConfig?: { label: string; modelName: string };
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => r.json())
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Generation Logs</h1>
        <p className="text-sm text-zinc-500">Debug and audit AI generation activity</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
          <p className="font-medium text-zinc-600">No logs yet</p>
          <p className="text-sm">Generation logs will appear here once you create exams</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.status === "SUCCESS" ? "bg-emerald-500" : log.status === "FAILED" ? "bg-red-500" : "bg-amber-400"}`} />
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {log.generationMode} generation{log.exam ? ` — ${log.exam.title}` : ""}
                      </CardTitle>
                      <p className="text-xs text-zinc-400">
                        {log.providerConfig ? `${log.providerConfig.label} · ${log.providerConfig.modelName}` : "Unknown provider"}
                        {" · "} v{log.promptVersion}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={log.status === "SUCCESS" ? "success" : log.status === "FAILED" ? "destructive" : "warning"}
                      className="text-xs"
                    >
                      {log.status === "SUCCESS" ? <CheckCircle className="w-3 h-3 mr-1 inline" /> : log.status === "FAILED" ? <AlertCircle className="w-3 h-3 mr-1 inline" /> : <Clock className="w-3 h-3 mr-1 inline" />}
                      {log.status}
                    </Badge>
                    <span className="text-xs text-zinc-400">{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              </CardHeader>
              {(log.tokenUsage?.totalTokens || log.errorMessage) && (
                <CardContent className="pt-0 pb-3">
                  {log.tokenUsage?.totalTokens && (
                    <p className="text-xs text-zinc-500">
                      Tokens: {log.tokenUsage.promptTokens} prompt + {log.tokenUsage.completionTokens} completion = {log.tokenUsage.totalTokens} total
                    </p>
                  )}
                  {log.errorMessage && (
                    <p className="text-xs text-red-600 mt-1 font-mono bg-red-50 rounded px-2 py-1">{log.errorMessage}</p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
