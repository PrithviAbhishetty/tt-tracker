"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/sign-in");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="opacity-60 hover:opacity-100 transition disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
