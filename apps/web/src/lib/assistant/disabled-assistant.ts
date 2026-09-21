import type { AssistantPort, AssistantRequest, AssistantResponse } from "./assistant-port";

export class DisabledAssistant implements AssistantPort {
  readonly providerName = "disabled";

  async generateResponse(_request: AssistantRequest): Promise<AssistantResponse> {
    return {
      content:
        "The AI Policy Assistant is currently disabled by administrative configuration. You can review all official allocation criteria, curfew rules, and appeals guidelines directly on the FAQ page or student handbook.",
      provider: this.providerName,
      latencyMs: 1,
    };
  }
}
