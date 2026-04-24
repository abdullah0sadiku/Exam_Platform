"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Loader2, Mail, Save, Send, Trash2 } from "lucide-react";

interface UserSlice {
  name?: string | null;
  email?: string | null;
}

interface EmailConfigView {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  fromAddress: string;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
}

const BLANK_FORM: FormState = {
  host: "",
  port: 587,
  secure: false,
  username: "",
  password: "",
  fromAddress: "",
};

export function SettingsTabs({ user }: { user: UserSlice }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Settings</h1>
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card className="mt-2">
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-semibold text-zinc-600">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-zinc-900">{user.name}</p>
                  <p className="text-sm text-zinc-500">{user.email}</p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  Owner
                </Badge>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-sm text-zinc-500">
            <p className="font-medium text-zinc-700 mb-1">GenExam v1.0</p>
            <p>
              AI-powered internal exam platform. Configure AI providers in the AI Providers section
              to get started.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="email">
          <EmailSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [envFallback, setEnvFallback] = useState(false);
  const [existing, setExisting] = useState<EmailConfigView | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/email");
        const data = await res.json();
        setEnvFallback(Boolean(data.envFallback));
        if (data.config) {
          const c: EmailConfigView = data.config;
          setExisting(c);
          setForm({
            host: c.host,
            port: c.port,
            secure: c.secure,
            username: c.username ?? "",
            password: "", // never populate — masked
            fromAddress: c.fromAddress,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        host: form.host,
        port: Number(form.port),
        secure: form.secure,
        username: form.username || null,
        fromAddress: form.fromAddress,
      };
      // Only send password when user typed something, so saving without
      // retyping keeps the existing password.
      if (form.password.length > 0) body.password = form.password;

      const res = await fetch("/api/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setExisting(data);
        setForm((f) => ({ ...f, password: "" }));
        showToast("success", "Email settings saved");
      } else {
        const msg = typeof data.error === "string" ? data.error : "Save failed";
        showToast("error", msg);
      }
    } catch {
      showToast("error", "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete your SMTP settings? The email feature will fall back to server env vars if they're configured.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/email", { method: "DELETE" });
      if (res.ok) {
        setExisting(null);
        setForm(BLANK_FORM);
        showToast("success", "Email settings deleted");
      } else {
        showToast("error", "Delete failed");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function testSend() {
    setTesting(true);
    try {
      const res = await fetch("/api/settings/email/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `Test email sent to ${data.sentTo}`);
      } else {
        const msg = typeof data.error === "string" ? data.error : "Test send failed";
        showToast("error", msg);
      }
    } catch {
      showToast("error", "Test send failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const canSave =
    form.host.trim().length > 0 &&
    form.fromAddress.trim().length > 0 &&
    Number(form.port) > 0;

  return (
    <div className="mt-2 space-y-4">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            SMTP settings
          </CardTitle>
          <CardDescription>
            Used to send candidate result emails. Stored per-user, encrypted at rest.
            {!existing && envFallback && (
              <> Currently falling back to the server SMTP_* env vars.</>
            )}
            {!existing && !envFallback && (
              <> No SMTP configured — the &ldquo;Email result&rdquo; button will fail until you save settings here.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Host</Label>
              <Input
                placeholder="smtp.example.com"
                value={form.host}
                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-700">Use TLS (implicit)</p>
              <p className="text-xs text-zinc-400">
                Leave off unless your provider docs specifically say &ldquo;SSL&rdquo; on port 465.
                Ports 587 / 2525 (incl. Mailtrap) use STARTTLS — keep this off.
              </p>
            </div>
            <Switch
              checked={form.secure}
              onCheckedChange={(v) => setForm((f) => ({ ...f, secure: v }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                placeholder="optional"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder={existing?.hasPassword ? "•••••••• (leave blank to keep)" : "optional"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>From address</Label>
            <Input
              placeholder='"GenExam" <noreply@example.com>'
              value={form.fromAddress}
              onChange={(e) => setForm((f) => ({ ...f, fromAddress: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <Button onClick={save} disabled={!canSave || saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Save
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={testSend} disabled={testing || (!existing && !envFallback)}>
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Send test
                  </>
                )}
              </Button>
            </div>
            {existing && (
              <Button variant="outline" onClick={remove} disabled={deleting}>
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-sm text-zinc-500 leading-relaxed">
        <p className="font-medium text-zinc-700 mb-1">How resolution works</p>
        <p>
          When you send a candidate result, GenExam looks up <strong>your</strong> saved SMTP
          settings first. If none are saved, it falls back to the server&apos;s{" "}
          <code className="text-xs bg-white px-1 py-0.5 rounded border border-zinc-200">SMTP_*</code>{" "}
          environment variables. Infra-level secrets
          (<code className="text-xs bg-white px-1 py-0.5 rounded border border-zinc-200">DATABASE_URL</code>,{" "}
          <code className="text-xs bg-white px-1 py-0.5 rounded border border-zinc-200">NEXTAUTH_SECRET</code>,{" "}
          <code className="text-xs bg-white px-1 py-0.5 rounded border border-zinc-200">ENCRYPTION_KEY</code>)
          can only be set via env.
        </p>
      </div>
    </div>
  );
}
