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
import { getChatConfig } from "@/lib/ai/model-config";

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

    // Get all documents for this case (for statistics and context)
    const allDocuments = await db
      .select({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        category: documentsTable.category,
        subtype: documentsTable.subtype,
      })
      .from(documentsTable)
      .where(eq(documentsTable.caseId, caseId));

    const docMap = allDocuments.reduce((acc, d) => {
      acc[d.id] = d.fileName;
      return acc;
    }, {} as Record<string, string>);

    // Build context from semantic search
    let contextChunks: Array<{ content: string; documentName: string; similarity: number }> = [];
    let contextTokensUsed = 0;

    if (includeContext) {
      try {
        // Lower similarity threshold to 0.3 to be more permissive in finding relevant content
        const searchResult = await semanticSearch(caseId, message, 5, 0.3);
        contextTokensUsed = searchResult.tokensUsed || 0;

        // Safely handle chunks - may be undefined or empty
        const chunks = searchResult.chunks || [];

        if (chunks.length > 0) {
          contextChunks = chunks.map((chunk) => ({
            content: chunk.content,
            documentName: docMap[chunk.documentId] || "Unknown",
            similarity: chunk.similarity,
          }));
        }
      } catch (error) {
        console.error("[Chat] Failed to get context:", error);
        // Continue without context - the AI will respond based on general knowledge
      }
    }

    // Build case statistics for the AI
    const categoryGroups = allDocuments.reduce((acc, doc) => {
      const cat = doc.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc.fileName);
      return acc;
    }, {} as Record<string, string[]>);

    // Build system prompt with context
    let systemPrompt = `You are a helpful legal assistant for the case "${caseData.name}".
You help lawyers analyze documents, find information, and answer questions about the case.
Be concise, accurate, and cite specific documents when possible.

CASE OVERVIEW:
- Total documents in this case: ${allDocuments.length}
- Document categories: ${Object.entries(categoryGroups).map(([cat, docs]) => `${cat} (${docs.length})`).join(", ")}

FULL DOCUMENT LIST:
${allDocuments.map(d => `- ${d.fileName} [${d.category || "Uncategorized"}${d.subtype ? `: ${d.subtype}` : ""}]`).join("\n")}
`;

    if (contextChunks.length > 0) {
      systemPrompt += `\nRELEVANT EXCERPTS FROM DOCUMENTS (based on your question):\n`;
      contextChunks.forEach((chunk, i) => {
        systemPrompt += `\n[${chunk.documentName}]:\n${chunk.content}\n`;
      });
    } else {
      systemPrompt += `\nNote: No specific document excerpts matched this query. You can still answer general questions about the case using the document list above, or ask the user to be more specific.`;
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
    const chatConfig = getChatConfig();
    const model = chatConfig.model;

    // Stream the response
    // Note: GPT-5 models use max_completion_tokens instead of max_tokens
    const isGpt5 = model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3');
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      ...(isGpt5
        ? { max_completion_tokens: chatConfig.maxTokens }
        : { max_tokens: chatConfig.maxTokens }
      ),
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
