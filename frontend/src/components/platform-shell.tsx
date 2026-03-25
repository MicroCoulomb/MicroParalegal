"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clearSession, type FakeSession } from "@/lib/session";

export function PlatformShell({
  children,
  session,
}: {
  children: ReactNode;
  session: FakeSession;
}) {
  const router = useRouter();

  function signOut() {
    clearSession();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f3f8ff_0%,_#f9f2ff_34%,_#fff8eb_100%)] px-4 py-6 text-[#032147] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.94),_rgba(244,249,255,0.92))] px-6 py-5 shadow-[0_24px_70px_rgba(3,33,71,0.12)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#209dd7]">
                MicroPrelegal Platform
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#032147]">
                Mutual NDA drafting workspace
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#5d6b86]">
                Fake login at the edge, AI-assisted Mutual NDA drafting inside.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-[#d5dfeb] bg-white px-4 py-2 text-sm text-[#032147]">
                {session.name} | {session.email}
              </div>
              <button
                className="rounded-full bg-[#ecad0a] px-4 py-2 text-sm font-semibold text-[#032147] transition hover:bg-[#d89d08]"
                onClick={signOut}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
