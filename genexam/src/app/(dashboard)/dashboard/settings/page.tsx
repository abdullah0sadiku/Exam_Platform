import { auth } from "@/lib/auth";
import { SettingsTabs } from "@/components/dashboard/settings-tabs";

export default async function SettingsPage() {
  const session = await auth();
  const user = session!.user!;
  return <SettingsTabs user={{ name: user.name, email: user.email }} />;
}
