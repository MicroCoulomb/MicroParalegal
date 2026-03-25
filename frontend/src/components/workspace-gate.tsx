"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentWorkspace } from "@/components/document-workspace";
import { PlatformShell } from "@/components/platform-shell";
import { readSession, type FakeSession } from "@/lib/session";

export function WorkspaceGate() {
  const router = useRouter();
  const [session, setSession] = useState<FakeSession | null | undefined>(undefined);

  useEffect(() => {
    const currentSession = readSession();

    if (!currentSession) {
      router.replace("/login");
      setSession(null);
      return;
    }

    setSession(currentSession);
  }, [router]);

  if (session === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f8ff] text-sm text-[#5d6b86]">
        Loading workspace...
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <PlatformShell session={session}>
      <DocumentWorkspace />
    </PlatformShell>
  );
}
