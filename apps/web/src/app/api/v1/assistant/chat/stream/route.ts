import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
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

/**
 * Streaming chat endpoint for the AI policy assistant.
 * Returns Server-Sent Events (SSE) with text chunks for the typing animation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = chatSchema.parse(await request.json());
    const lastUserMessage = body.messages.filter((m) => m.role === "user").pop();

    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message provided" }, { status: 400 });
    }

    // Retrieve relevant public policy documents
    const relevantDocs = vectorStore.search(lastUserMessage.content, 3);

    // Placeholder: in production, fetch student's own explanation from DB
    let studentExplanation: StudentExplanationContext | undefined;
    if (body.includeExplanation) {
      studentExplanation = {
        studentName: "Current Student",
        roomNumber: "304",
        hostelName: "Aryabhata Hall",
        bedNo: "A",
        score: 94,
        breakdown: { P: 95, C: 94, F: 90, D: 95, K: 92 },
        friendlySentence:
          "Matched with optimal composite score based on synchronized quiet study habits and nocturnal sleeping preferences.",
      };
    }

    const assistant = AssistantFactory.getAssistant();

    // If the adapter supports streaming, use SSE
    if (assistant.generateStream) {
      const stream = assistant.generateStream({
        messages: body.messages,
        contextDocuments: relevantDocs,
        studentExplanation,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            }
            // Send done marker and citations
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  citations: relevantDocs.map((d) => d.title),
                  disclaimer: "AI assistant — may be wrong; check official institutional policy.",
                })}\n\n`,
              ),
            );
          } catch {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  text: "I'm temporarily having trouble reaching the policy service.",
                  done: true,
                })}\n\n`,
              ),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Fallback: non-streaming response for DisabledAssistant
    const result = await assistant.generateResponse({
      messages: body.messages,
      contextDocuments: relevantDocs,
      studentExplanation,
    });

    return NextResponse.json({
      answer: result.content,
      provider: result.provider,
      citations: relevantDocs.map((d) => d.title),
      disclaimer: "AI assistant — may be wrong; check official institutional policy.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
