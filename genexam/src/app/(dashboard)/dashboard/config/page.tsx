"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Star, Loader2, Eye, EyeOff, Cpu, CheckCircle, AlertCircle } from "lucide-react";

interface ProviderConfig {
  id: string;
  providerType: string;
  label: string;
  modelName: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  encryptedApiKey: string;
  isDefault: boolean;
  createdAt: string;
}

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  databricks: ["databricks-meta-llama-3-3-70b-instruct", "databricks-dbrx-instruct", "custom-endpoint"],
  custom: ["custom"],
};

export default function ConfigPage() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [providerType, setProviderType] = useState("openai");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [modelName, setModelName] = useState("gpt-4o-mini");
  const [baseUrl, setBaseUrl] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("4096");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then(setConfigs)
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType, label, apiKey, modelName,
          baseUrl: baseUrl || undefined,
          temperature: Number(temperature),
          maxTokens: Number(maxTokens),
          systemPrompt: systemPrompt || undefined,
          isDefault,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfigs((p) => isDefault
          ? [data, ...p.map((c) => ({ ...c, isDefault: false }))]
          : [data, ...p]
        );
        setShowAdd(false);
        resetForm();
        showToast("success", "Provider added");
      } else {
        showToast("error", data.error || "Failed");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this provider?")) return;
    const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfigs((p) => p.filter((c) => c.id !== id));
      showToast("success", "Removed");
    }
  }

  async function setDefault(id: string) {
    const res = await fetch(`/api/providers/${id}`, { method: "POST" });
    if (res.ok) {
      setConfigs((p) => p.map((c) => ({ ...c, isDefault: c.id === id })));
    }
  }

  function resetForm() {
    setLabel(""); setApiKey(""); setModelName("gpt-4o-mini"); setBaseUrl("");
    setTemperature("0.7"); setMaxTokens("4096"); setSystemPrompt(""); setIsDefault(false);
    setProviderType("openai");
  }

  return (
    <div className="max-w-3xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">AI Providers</h1>
          <p className="text-sm text-zinc-500">Configure the AI providers used for exam generation</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add provider</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
      ) : configs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-xl">
          <Cpu className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="font-medium text-zinc-700 mb-1">No providers configured</h3>
          <p className="text-sm text-zinc-400 mb-4">Add at least one AI provider to start generating exams</p>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add provider</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <Card key={cfg.id}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold">{cfg.label}</CardTitle>
                        {cfg.isDefault && <Badge variant="info" className="text-xs">Default</Badge>}
                        <Badge variant="outline" className="text-xs capitalize">{cfg.providerType}</Badge>
                      </div>
                      <CardDescription className="text-xs">{cfg.modelName} · temp {cfg.temperature}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!cfg.isDefault && (
                      <Button variant="ghost" size="sm" onClick={() => setDefault(cfg.id)}>
                        <Star className="w-3.5 h-3.5 mr-1" /> Set default
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cfg.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="text-xs text-zinc-400 font-mono bg-zinc-50 rounded px-2 py-1">
                  API key: {cfg.encryptedApiKey}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Provider Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add AI provider</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Provider *</Label>
                <Select value={providerType} onValueChange={(v) => { setProviderType(v); setModelName(PROVIDER_MODELS[v]?.[0] || ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="databricks">Databricks</SelectItem>
                    <SelectItem value="custom">Custom (OpenAI-compatible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Label *</Label>
                <Input required placeholder="e.g. GPT-4o Production" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>API key *</Label>
              <div className="relative">
                <Input
                  required
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowKey((p) => !p)} className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Model *</Label>
                {PROVIDER_MODELS[providerType]?.[0] === "custom" ? (
                  <Input required placeholder="model-name" value={modelName} onChange={(e) => setModelName(e.target.value)} />
                ) : (
                  <Select value={modelName} onValueChange={setModelName}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(PROVIDER_MODELS[providerType] || []).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Temperature</Label>
                <Input type="number" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(e.target.value)} />
              </div>
            </div>

            {(providerType === "databricks" || providerType === "custom") && (
              <div className="space-y-1.5">
                <Label>Base URL</Label>
                <Input placeholder="https://..." value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Max tokens</Label>
              <Input type="number" min={256} value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>System prompt override <span className="text-zinc-400">(optional)</span></Label>
              <Textarea rows={2} placeholder="Override default system instructions..." value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
              <span className="text-zinc-700">Set as default provider</span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Adding…</> : "Add provider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
