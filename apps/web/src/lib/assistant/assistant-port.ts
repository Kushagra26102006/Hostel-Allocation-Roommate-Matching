export interface AssistantMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StudentExplanationContext {
  studentName?: string;
  roomNumber?: string;
  hostelName?: string;
  bedNo?: string;
  score?: number;
  breakdown?: {
    P?: number; // Preference rank
    C?: number; // Compatibility
    F?: number; // Floor/Amenity
    D?: number; // Distance
    K?: number; // Merit
  };
  friendlySentence?: string;
  explanation?: string;
}

export interface PolicyDocumentChunk {
  id: string;
  title: string;
  content: string;
  category: "eligibility" | "rules" | "appeals" | "roommate" | "faq" | "timelines";
  score?: number;
}

export interface AssistantRequest {
  messages: AssistantMessage[];
  contextDocuments?: PolicyDocumentChunk[] | undefined;
  studentExplanation?: StudentExplanationContext | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
}

export interface AssistantResponse {
  content: string;
  provider: string;
  citations?: string[] | undefined;
  latencyMs: number;
}

export interface AssistantPort {
  readonly providerName: string;
  generateResponse(request: AssistantRequest): Promise<AssistantResponse>;
  generateStream?(request: AssistantRequest): AsyncIterable<string>;
}
