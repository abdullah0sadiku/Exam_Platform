import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const session = await auth();
  const user = session!.user!;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Settings</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-semibold text-zinc-600">
              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-zinc-900">{user.name}</p>
              <p className="text-sm text-zinc-500">{user.email}</p>
            </div>
            <Badge variant="secondary" className="ml-auto">Owner</Badge>
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-sm text-zinc-500">
        <p className="font-medium text-zinc-700 mb-1">GenExam v1.0</p>
        <p>AI-powered internal exam platform. Configure AI providers in the AI Providers section to get started.</p>
      </div>
    </div>
  );
}
