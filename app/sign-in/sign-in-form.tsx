"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback${
    next ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  function signInWithGoogle() {
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) setError(error.message);
    });
  }

  function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setStage("code");
    });
  }

  function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error) {
        setError(error.message);
        return;
      }
      try {
        await fetch("/auth/post-sign-in", { method: "POST" });
      } catch {}
      router.replace(next || "/");
      router.refresh();
    });
  }

  const inputBase =
    "w-full border border-paper-edge/60 bg-paper-light/60 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-accent focus:bg-paper-light outline-none transition";
  const primary =
    "tt-press w-full bg-accent text-paper-light px-4 py-2.5 text-sm font-medium hover:bg-accent-deep transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        className="tt-press w-full border border-paper-edge/60 bg-paper-light px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper-light/70 transition disabled:opacity-50"
      >
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        <div className="h-px flex-1 bg-paper-edge/40" />
        or email
        <div className="h-px flex-1 bg-paper-edge/40" />
      </div>

      {stage === "email" ? (
        <form onSubmit={sendOtp} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputBase}
          />
          <button type="submit" disabled={pending || !email} className={primary}>
            Send code
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-3">
          <p className="text-sm text-ink-soft">
            Code sent to <span className="text-ink mono">{email}</span>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${inputBase} display tracking-[0.5em] text-center text-xl text-ink`}
          />
          <button type="submit" disabled={pending || code.trim().length < 6} className={primary}>
            Verify
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("email");
              setCode("");
              setError(null);
            }}
            className="w-full text-xs text-ink-soft hover:text-ink transition"
          >
            ← Different email
          </button>
        </form>
      )}

      {error && <p className="text-sm text-paper-edge">{error}</p>}
    </div>
  );
}
