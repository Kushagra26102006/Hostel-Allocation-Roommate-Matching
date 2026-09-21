import type { AssistantPort } from "./assistant-port";
import { GeminiAssistant } from "./gemini-assistant";
import { OllamaAssistant } from "./ollama-assistant";
import { DisabledAssistant } from "./disabled-assistant";

export type AssistantProviderType = "gemini" | "ollama" | "disabled";

export class AssistantFactory {
  private static cachedInstance: AssistantPort | null = null;

  static getAssistant(providerOverride?: AssistantProviderType): AssistantPort {
    if (providerOverride) {
      return this.createInstance(providerOverride);
    }

    if (!this.cachedInstance) {
      const configuredProvider = (
        process.env["ASSISTANT_PROVIDER"] || (process.env["GEMINI_API_KEY"] ? "gemini" : "disabled")
      ).toLowerCase() as AssistantProviderType;

      this.cachedInstance = this.createInstance(configuredProvider);
    }

    return this.cachedInstance;
  }

  private static createInstance(provider: AssistantProviderType): AssistantPort {
    switch (provider) {
      case "gemini":
        return new GeminiAssistant();
      case "ollama":
        return new OllamaAssistant();
      case "disabled":
      default:
        return new DisabledAssistant();
    }
  }

  /**
   * Resets cached instance (useful for test overrides).
   */
  static reset(): void {
    this.cachedInstance = null;
  }
}
