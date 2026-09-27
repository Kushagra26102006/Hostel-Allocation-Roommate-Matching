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
  citations?: string[] | undefined;
  feedbackGiven?: "up" | "down" | null | undefined;
  isStreaming?: boolean | undefined;
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
          const data = (await res.json()) as { answer?: string; citations?: string[] };
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
                      "I'm temporarily having trouble reaching the policy service. Please refer to the policy guidelines or submit an appeal if needed.",
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
      {/* Floating Action Button with Tooltip */}
      {!isOpen && (
        <div className="relative group">
          <Button
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Policy Assistant (Ctrl+Shift+H)"
            id="assistant-fab"
            className="h-13 w-13 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-xl shadow-brand-500/25 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="h-5 w-5" />
          </Button>

          {/* Hover Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in duration-150">
            <span>Ask Housing Policy Assistant</span>
            <span className="text-[10px] text-muted-foreground font-mono bg-surface-muted px-1.5 py-0.5 rounded">
              Ctrl+Shift+H
            </span>
          </div>
        </div>
      )}

      {/* Chat Window Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Campus Housing Policy Assistant"
          aria-modal="true"
          id="assistant-dialog"
          className="w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh] rounded-2xl border border-border/80 bg-surface/95 backdrop-blur-xl text-foreground shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-surface-muted/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  Housing Policy Assistant
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/20">
                    AI
                  </span>
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Instant answers to university housing rules &amp; results
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
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                aria-label="Close Assistant (Escape)"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Persistent Disclaimer Banner */}
          <div
            className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-1.5 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300"
            role="status"
            aria-live="polite"
          >
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              AI responses are informational. Official decisions follow university ordinances.
            </span>
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
                    "p-3.5 rounded-2xl leading-relaxed shadow-sm text-xs",
                    m.role === "user"
                      ? "bg-brand-500 text-white rounded-br-sm"
                      : "bg-surface-muted/60 border border-border/80 text-foreground rounded-bl-sm",
                  )}
                >
                  <p className="whitespace-pre-wrap">
                    {m.content}
                    {m.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-brand-400 ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </p>

                  {/* Citations if available */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-wrap gap-1">
                      {m.citations.map((c, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 px-2 py-0.5 rounded-md border border-brand-200/50"
                        >
                          📄 {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Feedback */}
                {m.role === "assistant" && m.id !== "welcome-1" && !m.isStreaming && (
                  <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-muted-foreground">
                    {m.feedbackGiven ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Feedback recorded
                      </span>
                    ) : (
                      <>
                        <span>Was this helpful?</span>
                        <button
                          type="button"
                          onClick={() => handleFeedback(m.id, true)}
                          aria-label="Mark response as helpful"
                          className="hover:text-emerald-600 transition-colors p-0.5"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(m.id, false)}
                          aria-label="Mark response as unhelpful"
                          className="hover:text-red-500 transition-colors p-0.5"
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
              <div className="text-center text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in duration-300">
                {feedbackSuccess}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions Chips */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Common Inquiries
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    aria-label={`Ask: ${q}`}
                    className="text-[11px] text-left px-2.5 py-1 rounded-full bg-surface-muted/60 border border-border/80 hover:bg-brand-500/10 hover:text-brand-600 text-muted-foreground transition-colors"
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
            className="p-3 border-t border-border/60 bg-surface-muted/30 flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a policy question..."
              disabled={isLoading}
              aria-label="Type your policy question"
              id="assistant-input"
              className="h-10 bg-background border-border text-foreground placeholder:text-muted-foreground text-xs focus-visible:ring-1 focus-visible:ring-brand-500 rounded-xl"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              id="assistant-send-btn"
              className="h-10 px-3.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          {/* Keyboard shortcut hint */}
          <div className="px-3 pb-1.5 flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
            <Keyboard className="w-2.5 h-2.5" />
            <span>Ctrl+Shift+H to toggle · Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
