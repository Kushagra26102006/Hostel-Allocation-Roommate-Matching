"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Send,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Info,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  feedbackGiven?: "up" | "down" | null;
  isStreaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "What is the hostel gate curfew?",
  "Why was I allotted this room?",
  "How are roommate scores calculated?",
  "What is the deadline for appeals?",
  "How does bed waitlist work?",
  "Can I swap rooms with a friend?",
];

export function PolicyAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hello! I'm your Campus Housing Policy Assistant. Ask me about allocation rules, hostel curfews, roommate matching, or why you were matched to your room.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Keyboard shortcuts: Escape closes, Ctrl+Shift+H toggles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "H") {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? input).trim();
      if (!text || isLoading) return;

      const userMessage: Message = {
        id: `usr-${Date.now()}`,
        role: "user",
        content: text,
      };

      const assistantMessageId = `asst-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          feedbackGiven: null,
          isStreaming: true,
        },
      ]);
      setInput("");
      setIsLoading(true);

      // Try streaming endpoint first
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/v1/assistant/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            includeExplanation:
              text.toLowerCase().includes("why") || text.toLowerCase().includes("room"),
          }),
          signal: controller.signal,
        });

        if (res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
          // Stream SSE response
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let accumulatedText = "";
          let finalCitations: string[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;
                try {
                  const parsed = JSON.parse(jsonStr) as {
                    text?: string;
                    done?: boolean;
                    citations?: string[];
                  };
                  if (parsed.text) {
                    accumulatedText += parsed.text;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, content: accumulatedText } : m,
                      ),
                    );
                  }
                  if (parsed.citations) {
                    finalCitations = parsed.citations;
                  }
                } catch {
                  // Skip malformed SSE
                }
              }
            }
          }

          // Finalize: mark streaming done, attach citations
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: accumulatedText || "I could not retrieve an answer at this time.",
                    citations: finalCitations,
                    isStreaming: false,
                  }
                : m,
            ),
          );
        } else {
          // Non-streaming JSON response (fallback / disabled adapter)
          const data = await res.json();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content:
                      data.answer ||
                      "I could not retrieve an answer at this time. Please check the policy guidelines.",
                    citations: data.citations,
                    isStreaming: false,
                  }
                : m,
            ),
          );
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content:
                      "I'm temporarily having trouble reaching the policy service. Please refer to the FAQ section or submit an appeal on /room if you need immediate assistance.",
                    isStreaming: false,
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [input, isLoading, messages],
  );

  const handleFeedback = async (messageId: string, helpful: boolean) => {
    try {
      await fetch("/api/v1/assistant/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful, optInToMessageLogging: false }),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, feedbackGiven: helpful ? "up" : "down" } : m,
        ),
      );

      setFeedbackSuccess("Thank you for your feedback!");
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } catch {
      // Ignore network errors on feedback
    }
  };

  const handleReset = () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "Hello! I'm your Campus Housing Policy Assistant. Ask me about allocation rules, hostel curfews, roommate matching, or why you were matched to your room.",
      },
    ]);
    setIsLoading(false);
    setInput("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" id="policy-assistant-widget">
      {/* Floating Action Button */}
      {!isOpen && (
        <div className="relative group">
          {/* Ambient Glow */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 via-brand-500 to-cyan-400 opacity-60 blur-md group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />

          {/* Trigger Button with Hover Label */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open HostelHub AI Assistant (Ctrl+Shift+H)"
            id="assistant-fab"
            className="relative flex items-center gap-2 h-12 rounded-full bg-gradient-to-r from-indigo-600 via-brand-600 to-cyan-500 px-3.5 text-white shadow-xl shadow-brand-500/30 transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs">
              <Sparkles className="h-4 w-4 animate-spin-slow text-white" />
            </div>
            <span className="font-heading text-xs font-bold tracking-tight text-white pr-1">
              HostelHub AI
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300" />
            </span>
          </button>
        </div>
      )}

      {/* Chat Window Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Campus Housing Policy Assistant"
          aria-modal="true"
          id="assistant-dialog"
          className="w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh] rounded-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-xl text-slate-100 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Housing Policy Assistant
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    AI
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Instant answers to housing rules &amp; results
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                aria-label="Reset conversation"
                title="New conversation"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                aria-label="Close Assistant (Escape)"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Persistent Disclaimer Banner */}
          <div
            className="bg-amber-950/30 border-b border-amber-500/20 px-3.5 py-1.5 flex items-center gap-2 text-[11px] text-amber-300"
            role="status"
            aria-live="polite"
          >
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>AI assistant — may be wrong; check official policy.</span>
          </div>

          {/* Message List */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4 text-xs"
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-label="Conversation messages"
            id="assistant-messages"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col max-w-[85%] transition-opacity duration-200",
                  m.role === "user" ? "ml-auto items-end" : "mr-auto items-start",
                )}
              >
                <div
                  className={cn(
                    "p-3 rounded-2xl leading-relaxed shadow-sm",
                    m.role === "user"
                      ? "bg-sky-600 text-white rounded-br-sm"
                      : "bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-sm",
                  )}
                >
                  <p className="whitespace-pre-wrap">
                    {m.content}
                    {m.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-sky-400 ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </p>

                  {/* Citations if available */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1">
                      {m.citations.map((c, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-sky-300 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-500/30"
                        >
                          📄 {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* "Was this helpful?" Feedback on assistant responses */}
                {m.role === "assistant" && m.id !== "welcome-1" && !m.isStreaming && (
                  <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-slate-400">
                    {m.feedbackGiven ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Feedback recorded
                      </span>
                    ) : (
                      <>
                        <span>Was this helpful?</span>
                        <button
                          type="button"
                          onClick={() => handleFeedback(m.id, true)}
                          aria-label="Mark response as helpful"
                          className="hover:text-emerald-400 transition-colors p-0.5"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(m.id, false)}
                          aria-label="Mark response as unhelpful"
                          className="hover:text-rose-400 transition-colors p-0.5"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {feedbackSuccess && (
              <div className="text-center text-[11px] text-emerald-400 font-medium animate-in fade-in duration-300">
                {feedbackSuccess}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions Chips */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                Suggested Questions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    aria-label={`Ask: ${q}`}
                    className="text-[11px] text-left px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a policy question..."
              disabled={isLoading}
              aria-label="Type your policy question"
              id="assistant-input"
              className="h-10 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs focus-visible:ring-1 focus-visible:ring-sky-500 rounded-xl"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              id="assistant-send-btn"
              className="h-10 px-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          {/* Keyboard shortcut hint */}
          <div className="px-3 pb-1.5 flex items-center justify-center gap-1 text-[9px] text-slate-500">
            <Keyboard className="w-2.5 h-2.5" />
            <span>Ctrl+Shift+H to toggle · Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
