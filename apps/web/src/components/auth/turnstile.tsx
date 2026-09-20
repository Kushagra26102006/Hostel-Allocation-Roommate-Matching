"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

interface TurnstileProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export function Turnstile({
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA",
  onVerify,
  onError,
  className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [testVerified, setTestVerified] = useState(false);

  useEffect(() => {
    // If running in development or test, automatically verify with test token if desired
    if (process.env.NODE_ENV === "development") {
      const timer = setTimeout(() => {
        setTestVerified(true);
        onVerify("1x00000000000000000000AA-dummy-test-token");
      }, 300);
      return () => clearTimeout(timer);
    }

    if (typeof window === "undefined") return;

    const scriptId = "cloudflare-turnstile-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const interval = setInterval(() => {
      if (window.turnstile && containerRef.current) {
        clearInterval(interval);
        setWidgetLoaded(true);
        try {
          const renderParams: {
            sitekey: string;
            callback: (token: string) => void;
            "error-callback"?: () => void;
            theme: "auto";
          } = {
            sitekey: siteKey,
            callback: (token: string) => onVerify(token),
            theme: "auto",
            ...(onError ? { "error-callback": onError } : {}),
          };
          window.turnstile.render(containerRef.current, renderParams);
        } catch {
          // Already rendered or fallback
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [siteKey, onVerify, onError]);

  return (
    <div className={`flex flex-col items-center justify-center p-2 ${className}`}>
      <div ref={containerRef} id="turnstile-container" />
      {testVerified && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-full mt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Cloudflare Turnstile Verified (Test Key)</span>
        </div>
      )}
      {!widgetLoaded && !testVerified && (
        <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse py-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Verifying human interaction...</span>
        </div>
      )}
    </div>
  );
}
