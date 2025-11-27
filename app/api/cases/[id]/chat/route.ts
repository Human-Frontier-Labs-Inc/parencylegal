/**
 * AI Chat API with RAG
 * Phase 6: AI Chat Interface
 *
 * POST /api/cases/:id/chat - Chat with AI about case documents
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, aiChatSessionsTable, documentsTable } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import OpenAI from "openai";
import { semanticSearch } from "@/lib/ai/embeddings";

// Get chat model from environment
function getChatModel(): string {
  return process.env.OPENAI_MODEL_CHAT || "gpt-4o-mini";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: caseId } = await params;
    const body = await request.json();
    const { message, sessionId, includeContext = true } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get or create chat session
    let session;
    if (sessionId) {
      [session] = await db
        .select()
        .from(aiChatSessionsTable)
        .where(
          and(
            eq(aiChatSessionsTable.id, sessionId),
            eq(aiChatSessionsTable.caseId, caseId),
            eq(aiChatSessionsTable.userId, userId)
          )
        )
        .limit(1);
    }

    if (!session) {
      // Create new session
      [session] = await db
        .insert(aiChatSessionsTable)
        .values({
          caseId,
          userId,
          type: "chat",
          status: "active",
          messages: [],
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
        })
        .returning();
    }

    // Build context from semantic search
    let contextChunks: Array<{ content: string; documentName: string; similarity: number }> = [];
    let contextTokensUsed = 0;

    if (includeContext) {
      try {
        const searchResult = await semanticSearch(caseId, message, 5, 0.6);
        contextTokensUsed = searchResult.tokensUsed;

        // Get document names for context
        const docIds = [...new Set(searchResult.chunks.map((c) => c.documentId))];
        const docs = docIds.length > 0
          ? await db
              .select({ id: documentsTable.id, fileName: documentsTable.fileName })
              .from(documentsTable)
              .where(eq(documentsTable.caseId, caseId))
          : [];

        const docMap = docs.reduce((acc, d) => {
          acc[d.id] = d.fileName;
          return acc;
        }, {} as Record<string, string>);

        contextChunks = searchResult.chunks.map((chunk) => ({
          content: chunk.content,
          documentName: docMap[chunk.documentId] || "Unknown",
          similarity: chunk.similarity,
        }));
      } catch (error) {
        console.error("[Chat] Failed to get context:", error);
        // Continue without context
      }
    }

    // Build system prompt with context
    let systemPrompt = `You are a helpful legal assistant for the case "${caseData.name}".
You help lawyers analyze documents, find information, and answer questions about the case.
Be concise, accurate, and cite specific documents when possible.
If you don't know something or it's not in the provided context, say so.`;

    if (contextChunks.length > 0) {
      systemPrompt += `\n\nRelevant document excerpts:\n`;
      contextChunks.forEach((chunk, i) => {
        systemPrompt += `\n[${chunk.documentName}]:\n${chunk.content}\n`;
      });
    }

    // Get conversation history
    const history = (session.messages as Array<{ role: string; content: string }>) || [];

    // Build messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Create OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = getChatModel();

    // Stream the response
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      max_tokens: 1000,
    });

    // Create a TransformStream to process the OpenAI stream
    const encoder = new TextEncoder();
    let fullResponse = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content, type: "content" })}\n\n`)
              );
            }

            // Get token usage from final chunk
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens;
              outputTokens = chunk.usage.completion_tokens;
            }
          }

          // Estimate tokens if not provided
          if (inputTokens === 0) {
            inputTokens = Math.ceil(systemPrompt.length / 4) + Math.ceil(message.length / 4);
          }
          if (outputTokens === 0) {
            outputTokens = Math.ceil(fullResponse.length / 4);
          }

          // Update session with new messages and token counts
          const newMessages = [
            ...history,
            { role: "user", content: message, timestamp: new Date().toISOString() },
            { role: "assistant", content: fullResponse, timestamp: new Date().toISOString() },
          ];

          await db
            .update(aiChatSessionsTable)
            .set({
              messages: newMessages,
              totalInputTokens: (session.totalInputTokens || 0) + inputTokens + contextTokensUsed,
              totalOutputTokens: (session.totalOutputTokens || 0) + outputTokens,
              totalCost: Math.round(
                (session.totalCost || 0) +
                  ((inputTokens + contextTokensUsed) * 0.15 + outputTokens * 0.6) / 1000
              ), // Approximate cost in cents
            })
            .where(eq(aiChatSessionsTable.id, session.id));

          // Send final message with metadata
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                sessionId: session.id,
                tokensUsed: inputTokens + outputTokens + contextTokensUsed,
                contextChunks: contextChunks.length,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[Chat] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Chat failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// GET - List chat sessions for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: caseId } = await params;

    // Get chat sessions for this case
    const sessions = await db
      .select({
        id: aiChatSessionsTable.id,
        type: aiChatSessionsTable.type,
        status: aiChatSessionsTable.status,
        createdAt: aiChatSessionsTable.createdAt,
        updatedAt: aiChatSessionsTable.updatedAt,
        messageCount: aiChatSessionsTable.messages,
      })
      .from(aiChatSessionsTable)
      .where(
        and(
          eq(aiChatSessionsTable.caseId, caseId),
          eq(aiChatSessionsTable.userId, userId),
          eq(aiChatSessionsTable.type, "chat")
        )
      )
      .orderBy(desc(aiChatSessionsTable.updatedAt));

    const formattedSessions = sessions.map((s) => ({
      ...s,
      messageCount: Array.isArray(s.messageCount) ? s.messageCount.length : 0,
    }));

    return new Response(JSON.stringify({ sessions: formattedSessions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Chat] Error listing sessions:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
