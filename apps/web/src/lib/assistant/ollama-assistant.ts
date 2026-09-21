import type { AssistantPort, AssistantRequest, AssistantResponse } from "./assistant-port";
import { AssistantGuardrails } from "./guardrails";
import { RedactionService } from "./redaction";

export class OllamaAssistant implements AssistantPort {
  readonly providerName = "ollama";
  private host: string;
  private model: string;
  private timeoutMs: number;

  constructor(options?: { host?: string; model?: string; timeoutMs?: number }) {
    this.host = options?.host ?? process.env["OLLAMA_HOST"] ?? "http://127.0.0.1:11434";
    this.model = options?.model ?? process.env["OLLAMA_MODEL"] ?? "llama3";
    this.timeoutMs = options?.timeoutMs ?? 10000;
  }

  async generateResponse(request: AssistantRequest): Promise<AssistantResponse> {
    const startTime = Date.now();

    // 1. Guardrail inspection
    const lastUserMessage = request.messages.filter((m) => m.role === "user").pop();
    if (lastUserMessage) {
      const guardrailResult = AssistantGuardrails.inspectUserInput(lastUserMessage.content);
      if (!guardrailResult.allowed) {
        return {
          content: guardrailResult.refusalReason ?? "I cannot fulfill this request.",
          provider: this.providerName,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // 2. Build augmented prompt & apply Privacy Redaction
    const augmentedMessages = AssistantGuardrails.buildPromptPayload(
      request.messages,
      request.contextDocuments,
      request.studentExplanation,
    );

    for (const msg of augmentedMessages) {
      const { sanitized } = RedactionService.redact(msg.content);
      msg.content = sanitized;
      RedactionService.assertPayloadPrivacy(msg.content);
    }

    // 3. Send HTTP request to local Ollama daemon
    try {
      const response = await fetch(`${this.host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: augmentedMessages,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.2,
            num_predict: request.maxTokens ?? 512,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`Ollama responded with status ${response.status}`);
      }

      const data = (await response.json()) as {
        message?: { content?: string };
      };

      const reply =
        data.message?.content?.trim() ??
        "I could not retrieve an answer at this time. Please refer to the official policy documents.";

      return {
        content: reply,
        provider: this.providerName,
        citations: request.contextDocuments?.map((d) => d.title),
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      console.warn("OllamaAssistant connection failed or timed out:", err);
      return {
        content:
          "The local policy assistant is currently offline or unreachable. Please consult the published hostel guidelines or contact the warden office.",
        provider: `${this.providerName}-offline-fallback`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Streaming variant for the typing animation UI.
   * Uses Ollama native streaming mode (NDJSON lines).
   */
  async *generateStream(request: AssistantRequest): AsyncIterable<string> {
    // 1. Guardrail inspection
    const lastUserMessage = request.messages.filter((m) => m.role === "user").pop();
    if (lastUserMessage) {
      const guardrailResult = AssistantGuardrails.inspectUserInput(lastUserMessage.content);
      if (!guardrailResult.allowed) {
        yield guardrailResult.refusalReason ?? "I cannot fulfill this request.";
        return;
      }
    }

    // 2. Build augmented prompt & apply Privacy Redaction
    const augmentedMessages = AssistantGuardrails.buildPromptPayload(
      request.messages,
      request.contextDocuments,
      request.studentExplanation,
    );

    for (const msg of augmentedMessages) {
      const { sanitized } = RedactionService.redact(msg.content);
      msg.content = sanitized;
      RedactionService.assertPayloadPrivacy(msg.content);
    }

    try {
      const response = await fetch(`${this.host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: augmentedMessages,
          stream: true,
          options: {
            temperature: request.temperature ?? 0.2,
            num_predict: request.maxTokens ?? 512,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok || !response.body) {
        yield "The local policy assistant is currently offline.";
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed) as {
              message?: { content?: string };
              done?: boolean;
            };
            if (parsed.message?.content) {
              yield parsed.message.content;
            }
          } catch {
            // Skip malformed NDJSON chunks
          }
        }
      }
    } catch (err: unknown) {
      console.warn("OllamaAssistant stream failed:", err);
      yield "The local policy assistant is currently offline.";
    }
  }
}
