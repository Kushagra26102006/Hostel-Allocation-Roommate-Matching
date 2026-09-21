import type { AssistantPort, AssistantRequest, AssistantResponse } from "./assistant-port";
import { AssistantGuardrails } from "./guardrails";
import { RedactionService } from "./redaction";

export class GeminiAssistant implements AssistantPort {
  readonly providerName = "gemini";
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(options?: { apiKey?: string; model?: string; timeoutMs?: number }) {
    this.apiKey = options?.apiKey ?? process.env["GEMINI_API_KEY"] ?? "";
    this.model = options?.model ?? process.env["GEMINI_MODEL"] ?? "gemini-1.5-flash";
    this.timeoutMs = options?.timeoutMs ?? 10000;
  }

  async generateResponse(request: AssistantRequest): Promise<AssistantResponse> {
    const startTime = Date.now();

    // 1. Guardrail Inspection on the latest user message
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

    // 2. Fallback if API key is not configured
    if (!this.apiKey) {
      return {
        content:
          "The policy assistant is currently operating in local fallback mode. For official allocation queries, please refer to the Hostel Policy Guidelines or contact your hostel warden.",
        provider: `${this.providerName}-fallback`,
        latencyMs: Date.now() - startTime,
      };
    }

    // 3. Build augmented prompt & execute Privacy Redaction Layer
    const augmentedMessages = AssistantGuardrails.buildPromptPayload(
      request.messages,
      request.contextDocuments,
      request.studentExplanation,
    );

    // Apply redaction and verify zero privacy violations
    for (const msg of augmentedMessages) {
      const { sanitized } = RedactionService.redact(msg.content);
      msg.content = sanitized;
      RedactionService.assertPayloadPrivacy(msg.content);
    }

    // 4. Transform to Gemini API payload format
    const contents = augmentedMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // 5. Execute HTTP request with 10-second timeout
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            maxOutputTokens: request.maxTokens ?? 512,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`Gemini API responded with status ${response.status}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const candidateText =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
        "I could not retrieve an answer at this time. Please check the official policy documents.";

      return {
        content: candidateText,
        provider: this.providerName,
        citations: request.contextDocuments?.map((d) => d.title),
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      console.warn("GeminiAssistant request failed or timed out:", err);
      return {
        content:
          "I'm temporarily having trouble connecting to the policy service. Please refer to the FAQ section or submit an appeal on /room if you need immediate assistance.",
        provider: `${this.providerName}-timeout-fallback`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Streaming variant for the typing animation UI.
   * Yields text chunks as they arrive from the Gemini streamGenerateContent endpoint.
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

    if (!this.apiKey) {
      yield "The policy assistant is currently operating in local fallback mode. For official allocation queries, please refer to the Hostel Policy Guidelines or contact your hostel warden.";
      return;
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

    const contents = augmentedMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            maxOutputTokens: request.maxTokens ?? 512,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok || !response.body) {
        yield "I'm temporarily having trouble connecting to the policy service.";
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
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr) as {
                candidates?: Array<{
                  content?: { parts?: Array<{ text?: string }> };
                }>;
              };
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) yield text;
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }
      }
    } catch (err: unknown) {
      console.warn("GeminiAssistant stream failed:", err);
      yield "I'm temporarily having trouble connecting to the policy service.";
    }
  }
}
