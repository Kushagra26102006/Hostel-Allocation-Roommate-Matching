"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

interface TurnstileProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onError?: (errorCode?: string | number) => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (errorCode?: string | number) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
      getResponse?: (widgetId?: string) => string | undefined;
    };
  }
}

export function Turnstile({ siteKey, onVerify, onError, className = "" }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isRenderingRef = useRef<boolean>(false);
  const uniqueId = useId();
  const containerId = `turnstile-container-${uniqueId.replace(/:/g, "")}`;

  const effectiveSiteKey =
    (siteKey && siteKey.trim().length > 0
      ? siteKey
      : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    )?.trim() || "1x00000000000000000000AA";

  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [testVerified, setTestVerified] = useState(false);

  // Keep latest callbacks in refs so changes don't re-trigger the effect
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let isMounted = true;

    // If running in development or test without explicit NEXT_PUBLIC_TURNSTILE_SITE_KEY, automatically verify
    if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        setTestVerified(true);
        onVerifyRef.current("1x00000000000000000000AA-dummy-test-token");
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

    const tryRenderWidget = () => {
      if (!isMounted) return false;
      // Prevent rendering if already rendered or in the middle of rendering
      if (widgetIdRef.current || isRenderingRef.current) return true;
      if (!window.turnstile || !containerRef.current) return false;

      // Ensure container has no stale children
      if (containerRef.current.childElementCount > 0) {
        containerRef.current.innerHTML = "";
      }

      isRenderingRef.current = true;
      try {
        console.log("[Turnstile] widget render start");
        console.log(
          "[Turnstile] sitekey presence:",
          Boolean(effectiveSiteKey && effectiveSiteKey.trim().length > 0),
        );

        const id = window.turnstile.render(containerRef.current, {
          sitekey: effectiveSiteKey,
          callback: (token: string) => {
            console.log("[Turnstile] callback token received");
            if (!isMounted) return;
            setWidgetLoaded(true);
            onVerifyRef.current(token);
          },
          "error-callback": (errorCode?: string | number) => {
            console.error("[Turnstile] error code:", errorCode);
            if (!isMounted) return;
            onErrorRef.current?.(errorCode);
          },
          "expired-callback": () => {
            console.warn("[Turnstile] token expired");
            if (widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch {
                // Ignore reset error
              }
            }
          },
          theme: "auto",
        });

        widgetIdRef.current = id;
        console.log("[Turnstile] widget render success");
        setWidgetLoaded(true);
        return true;
      } catch (err) {
        console.error("[Turnstile] render exception:", err);
        return false;
      } finally {
        isRenderingRef.current = false;
      }
    };

    // If turnstile is already loaded, render immediately
    if (window.turnstile && containerRef.current) {
      if (tryRenderWidget()) {
        return () => {
          isMounted = false;
          if (widgetIdRef.current && window.turnstile) {
            try {
              window.turnstile.remove(widgetIdRef.current);
            } catch {
              // Ignore removal error
            }
            widgetIdRef.current = null;
          }
          if (containerRef.current) {
            containerRef.current.innerHTML = "";
          }
          isRenderingRef.current = false;
        };
      }
    }

    // Otherwise, poll until turnstile API is ready
    const interval = setInterval(() => {
      if (tryRenderWidget()) {
        clearInterval(interval);
      }
    }, 100);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (widgetIdRef.current && typeof window !== "undefined" && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore removal error
        }
        widgetIdRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      isRenderingRef.current = false;
    };
  }, [effectiveSiteKey]);

  return (
    <div className={`flex flex-col items-center justify-center p-2 ${className}`}>
      <div ref={containerRef} id={containerId} />
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
