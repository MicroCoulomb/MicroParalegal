"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { writeSession } from "@/lib/session";

export function FakeLogin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    writeSession({
      email: email.trim() || "demo@microprelegal.local",
      name: name.trim() || "Demo User",
    });

    router.push("/workspace");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f8fbff_0%,_#eef6ff_42%,_#fff9ea_100%)] px-4 py-6 text-[#032147] sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top,_rgba(32,157,215,0.18),_transparent_38%),linear-gradient(145deg,_rgba(255,255,255,0.94),_rgba(255,248,230,0.9))] p-8 shadow-[0_30px_90px_rgba(3,33,71,0.12)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.36em] text-[#209dd7]">
            MicroPrelegal
          </p>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-tight text-[#032147]">
            AI-assisted Mutual NDA drafting inside a simple platform shell.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#4b607e]">
            Enter the current prototype to chat with the assistant, gather Mutual NDA details, and
            watch the draft update live.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[#d8e6f2] bg-white/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#209dd7]">
                Frontend
              </p>
              <p className="mt-3 text-sm leading-6 text-[#4b607e]">
                Fake login entry into the platform with the AI drafting workspace as the first
                screen.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#d8e6f2] bg-white/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#209dd7]">
                Backend
              </p>
              <p className="mt-3 text-sm leading-6 text-[#4b607e]">
                FastAPI now serves the built frontend, health endpoint, and NDA chat API from one
                container.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#d8e6f2] bg-white/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#209dd7]">
                Database
              </p>
              <p className="mt-3 text-sm leading-6 text-[#4b607e]">
                Temporary SQLite storage still resets on each container start for the current fake
                auth foundation.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#d8e6f2] bg-white p-8 shadow-[0_30px_90px_rgba(3,33,71,0.14)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#753991]">
            Fake Login
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#032147]">
            Enter the platform
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#66758f]">
            This form does not authenticate. It creates a temporary frontend session and takes you
            into the current AI drafting workspace.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#032147]">Name</span>
              <input
                className="rounded-[1.25rem] border border-[#c8d9e8] bg-[#fdfefe] px-4 py-3 text-sm text-[#032147] outline-none transition focus:border-[#209dd7] focus:ring-4 focus:ring-[#209dd7]/15"
                onChange={(event) => setName(event.target.value)}
                placeholder="Avery Stone"
                value={name}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#032147]">Email</span>
              <input
                className="rounded-[1.25rem] border border-[#c8d9e8] bg-[#fdfefe] px-4 py-3 text-sm text-[#032147] outline-none transition focus:border-[#209dd7] focus:ring-4 focus:ring-[#209dd7]/15"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="avery@northstarlabs.com"
                type="email"
                value={email}
              />
            </label>
            <button
              className="w-full rounded-full bg-[#753991] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#62307a]"
              type="submit"
            >
              Continue to workspace
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
