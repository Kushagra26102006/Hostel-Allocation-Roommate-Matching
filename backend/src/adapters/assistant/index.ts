import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface AssistantPort {
  generateDraftExplanation(context: {
    studentName: string;
    allocatedHostel: string;
    roomType: string;
    scoreBreakdown: Record<string, number>;
  }): Promise<string>;
}

export class DisabledAssistantAdapter implements AssistantPort {
  async generateDraftExplanation(context: {
    studentName: string;
    allocatedHostel: string;
    roomType: string;
  }): Promise<string> {
    return `Assigned ${context.studentName} to ${context.allocatedHostel} (${context.roomType}) based on preferences, eligibility, and capacity invariants.`;
  }
}

export class GeminiAssistantAdapter implements AssistantPort {
  constructor(private apiKey: string) {}

  async generateDraftExplanation(context: {
    studentName: string;
    allocatedHostel: string;
    roomType: string;
    scoreBreakdown: Record<string, number>;
  }): Promise<string> {
    if (!this.apiKey) {
      return new DisabledAssistantAdapter().generateDraftExplanation(context);
    }
    try {
      const prompt = `Write a polite, 2-sentence explanation for a student named ${context.studentName} explaining why they were allocated hostel ${context.allocatedHostel} (${context.roomType}) based on room fill, preferences, and compatibility score of ${context.scoreBreakdown.compatibility ?? 100}%.`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
      if (!response.ok) {
        return new DisabledAssistantAdapter().generateDraftExplanation(context);
      }
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return text ? text.trim() : new DisabledAssistantAdapter().generateDraftExplanation(context);
    } catch (err) {
      logger.warn({ err }, "Gemini assistant generation failed, falling back to rule-based");
      return new DisabledAssistantAdapter().generateDraftExplanation(context);
    }
  }
}

export function getAssistantAdapter(): AssistantPort {
  if (env.ASSISTANT_PROVIDER === "gemini" && env.GEMINI_API_KEY) {
    return new GeminiAssistantAdapter(env.GEMINI_API_KEY);
  }
  return new DisabledAssistantAdapter();
}
