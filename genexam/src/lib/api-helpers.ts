import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), userId: null };
  }
  return { error: null, userId: session.user.id };
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
