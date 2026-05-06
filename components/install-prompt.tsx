"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error legacy iOS API
      window.navigator.standalone === true;
    if (isIos && !isStandalone && !localStorage.getItem("dismissed-ios-install")) {
      setIosHint(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
  }

  if (deferred) {
    return (
      <button
        type="button"
        onClick={install}
        className="text-accent hover:text-paper-light transition"
      >
        + Install
      </button>
    );
  }

  if (iosHint) {
    return (
      <button
        type="button"
        onClick={() => {
          alert("Install: tap the Share button in Safari, then 'Add to Home Screen'.");
          localStorage.setItem("dismissed-ios-install", "1");
          setIosHint(false);
        }}
        className="text-accent hover:text-paper-light transition"
      >
        + Install
      </button>
    );
  }

  return null;
}
