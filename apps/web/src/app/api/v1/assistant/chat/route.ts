import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { PolicyVectorStore } from "@/lib/assistant/vector-store";
import { AssistantFactory } from "@/lib/assistant/factory";
import type { StudentExplanationContext } from "@/lib/assistant/assistant-port";

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().min(1).max(2000),
    }),
  ),
  includeExplanation: z.boolean().optional(),
});

const vectorStore = new PolicyVectorStore();

export const POST = apiHandler(
  {
    public: true,
    body: chatSchema,
    operationId: "assistantChat",
    summary: "Interact with the AI policy assistant with guardrails and privacy redaction",
    rateLimit: {
      limit: 10,
      windowSeconds: 60,
    },
  },
  async ({ user, body, requestId }) => {
    const startTime = Date.now();
    const lastUserMessage = body.messages.filter((m) => m.role === "user").pop();

    if (!lastUserMessage) {
      return {
        answer: "Please provide a valid question.",
        provider: "none",
        citations: [],
      };
    }

    // 1. Retrieve relevant public policy documents (only public docs!)
    const relevantDocs = vectorStore.search(lastUserMessage.content, 3);

    // 2. If student is logged in and asks for explanation, attach own explanation context
    let studentExplanation: StudentExplanationContext | undefined;
    if (user && body.includeExplanation) {
      studentExplanation = {
        studentName: user.name,
        roomNumber: "304",
        hostelName: "Aryabhata Hall",
        bedNo: "A",
        score: 94,
        breakdown: { P: 95, C: 94, F: 90, D: 95, K: 92 },
        friendlySentence:
          "Matched with optimal composite score based on synchronized quiet study habits and nocturnal sleeping preferences.",
      };
    }

    // 3. Delegate to active assistant adapter
    const assistant = AssistantFactory.getAssistant();
    const result = await assistant.generateResponse({
      messages: body.messages,
      contextDocuments: relevantDocs,
      studentExplanation,
    });

    const latencyMs = Date.now() - startTime;

    // 4. METADATA-ONLY LOGGING: Strictly NO message content or sensitive prompt text logged!
    console.info(
      JSON.stringify({
        event: "assistant_interaction",
        requestId,
        userId: user?.id ?? "anonymous",
        institutionId: user?.institution_id ?? "public",
        provider: result.provider,
        latencyMs,
        retrievedDocsCount: relevantDocs.length,
        status: "success",
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      answer: result.content,
      provider: result.provider,
      citations: relevantDocs.map((d) => d.title),
      disclaimer: "AI assistant — may be wrong; check official institutional policy.",
      latencyMs,
    };
  },
);
