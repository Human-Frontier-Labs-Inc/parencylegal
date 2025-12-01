/**
 * AI Chat API with RAG and Advanced Legal Assistant
 * Phase 6: AI Chat Interface with Multiple Chats Support
 * Phase 11: Advanced Legal Assistant (Drafting, Analysis, Research)
 *
 * POST /api/cases/:id/chat - Chat with AI about case documents
 * GET /api/cases/:id/chat - List chat sessions for a case
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, chatsTable, chatMessagesTable, documentsTable } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import OpenAI from "openai";
import { semanticSearch } from "@/lib/ai/embeddings";
import { getChatConfig, calculateCostCents } from "@/lib/ai/model-config";
import { detectIntent, Intent } from "@/lib/ai/intent-detection";
import { getDraftingSystemPrompt } from "@/lib/ai/legal-drafting";

interface ChatSource {
  documentId: string;
  documentName: string;
  chunkId?: string;
  excerpt: string;
  similarity: number;
  pageNumber?: number;
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
    const { message, chatId, includeContext = true } = body;

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

    // Get or create chat
    let chat;
    if (chatId) {
      [chat] = await db
        .select()
        .from(chatsTable)
        .where(
          and(
            eq(chatsTable.id, chatId),
            eq(chatsTable.caseId, caseId),
            eq(chatsTable.userId, userId)
          )
        )
        .limit(1);
    }

    if (!chat) {
      // Create new chat with auto-generated title from first message
      const title = message.length > 50 ? message.substring(0, 47) + "..." : message;
      [chat] = await db
        .insert(chatsTable)
        .values({
          caseId,
          userId,
          title,
          status: "active",
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
    let sources: ChatSource[] = [];
    let contextTokensUsed = 0;

    if (includeContext) {
      try {
        // Lower similarity threshold to 0.3 to be more permissive in finding relevant content
        const searchResult = await semanticSearch(caseId, message, 5, 0.3);
        contextTokensUsed = searchResult.tokensUsed || 0;

        // Safely handle chunks - may be undefined or empty
        const chunks = searchResult.chunks || [];

        if (chunks.length > 0) {
          sources = chunks.map((chunk) => ({
            documentId: chunk.documentId,
            documentName: docMap[chunk.documentId] || "Unknown",
            chunkId: chunk.chunkId,
            excerpt: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? "..." : ""),
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

    // Phase 11: Detect intent to route to appropriate handler
    const intent = detectIntent(message);
    console.log(`[Chat] Detected intent: ${intent.type}${intent.subtype ? ` (${intent.subtype})` : ""} - confidence: ${intent.confidence}`);

    // Build system prompt based on intent
    let systemPrompt = "";

    if (intent.type === "draft" && intent.subtype) {
      // Use drafting-specific system prompt
      systemPrompt = getDraftingSystemPrompt(intent.subtype);
      systemPrompt += `\n\nCASE: ${caseData.name}
CASE TYPE: ${caseData.type || "Family Law"}

AVAILABLE DOCUMENTS:
${allDocuments.map(d => `- ${d.fileName} [${d.category || "Uncategorized"}${d.subtype ? `: ${d.subtype}` : ""}]`).join("\n")}
`;
    } else if (intent.type === "analyze") {
      // Analysis-specific system prompt
      systemPrompt = `You are a legal document analysis assistant specializing in family law cases.
You help lawyers analyze documents, find discrepancies, track assets, and verify income.

IMPORTANT: When referencing documents, use this exact format: [Document: filename.pdf]

ANALYSIS MODE: ${intent.subtype || "general analysis"}
${intent.subtype === "comparison" ? "Compare the documents and identify similarities and differences." : ""}
${intent.subtype === "discrepancy" ? "Look for inconsistencies, conflicts, and suspicious patterns in the data." : ""}
${intent.subtype === "asset_tracking" ? "Track all assets mentioned and calculate total values." : ""}
${intent.subtype === "income_verification" ? "Verify income from all sources and flag any discrepancies." : ""}

CASE: ${caseData.name}
TOTAL DOCUMENTS: ${allDocuments.length}

DOCUMENT LIST:
${allDocuments.map(d => `- ${d.fileName} [${d.category || "Uncategorized"}${d.subtype ? `: ${d.subtype}` : ""}]`).join("\n")}
`;
    } else if (intent.type === "research") {
      // Research-specific system prompt
      systemPrompt = `You are a legal research assistant specializing in family law.
Provide accurate, well-cited legal information.
Always include relevant statute citations in proper Bluebook format when applicable.

RESEARCH TOPIC: ${intent.topic || message}
${intent.state ? `STATE: ${intent.state}` : ""}

CASE CONTEXT: ${caseData.name}
The attorney is working on a family law case and needs legal research support.

When providing legal information:
1. Be specific about which jurisdiction applies
2. Cite relevant statutes (e.g., Tex. Fam. Code § 3.002)
3. Note any recent changes to the law
4. Mention variations between jurisdictions if relevant
`;
    } else {
      // Default: General RAG-based chat
      systemPrompt = `You are a helpful legal assistant for the case "${caseData.name}".
You help lawyers analyze documents, find information, and answer questions about the case.
Be concise, accurate, and cite specific documents when possible.

IMPORTANT: When citing documents, use this exact format: [Document: filename.pdf]
This allows users to click on citations to view the source document.

CASE OVERVIEW:
- Total documents in this case: ${allDocuments.length}
- Document categories: ${Object.entries(categoryGroups).map(([cat, docs]) => `${cat} (${docs.length})`).join(", ")}

FULL DOCUMENT LIST:
${allDocuments.map(d => `- ${d.fileName} [${d.category || "Uncategorized"}${d.subtype ? `: ${d.subtype}` : ""}]`).join("\n")}
`;
    }

    // Add document context for all intent types (except pure research)
    if (sources.length > 0) {
      systemPrompt += `\nRELEVANT EXCERPTS FROM DOCUMENTS (based on your question):\n`;
      sources.forEach((source) => {
        systemPrompt += `\n[Document: ${source.documentName}]:\n${source.excerpt}\n`;
      });
    } else if (intent.type !== "research") {
      systemPrompt += `\nNote: No specific document excerpts matched this query. You can still answer general questions about the case using the document list above, or ask the user to be more specific.`;
    }

    // Get conversation history from chat_messages
    const history = await db
      .select({
        role: chatMessagesTable.role,
        content: chatMessagesTable.content,
      })
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.chatId, chat.id))
      .orderBy(asc(chatMessagesTable.createdAt))
      .limit(20); // Last 20 messages for context

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

    console.log(`[Chat] Using model: ${model}, maxTokens: ${chatConfig.maxTokens}`);

    // Stream the response
    // Note: GPT-5 and o-series models use max_completion_tokens instead of max_tokens
    const usesCompletionTokens = model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3');
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      ...(usesCompletionTokens
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
          console.log(`[Chat] Stream starting for chat ${chat.id}`);

          // Save user message to database immediately
          await db.insert(chatMessagesTable).values({
            chatId: chat.id,
            role: "user",
            content: message,
            inputTokens: 0,
            outputTokens: 0,
            contextTokens: contextTokensUsed,
            model: null,
          });

          console.log(`[Chat] Starting to iterate stream...`);
          let chunkCount = 0;

          for await (const chunk of stream) {
            chunkCount++;
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

          console.log(`[Chat] Stream complete. Received ${chunkCount} chunks, response length: ${fullResponse.length}`);

          // Estimate tokens if not provided
          if (inputTokens === 0) {
            inputTokens = Math.ceil(systemPrompt.length / 4) + Math.ceil(message.length / 4);
          }
          if (outputTokens === 0) {
            outputTokens = Math.ceil(fullResponse.length / 4);
          }

          // Calculate cost
          const costCents = calculateCostCents(inputTokens + contextTokensUsed, outputTokens, chatConfig);

          // Save assistant message to database
          await db.insert(chatMessagesTable).values({
            chatId: chat.id,
            role: "assistant",
            content: fullResponse,
            sources: sources.length > 0 ? sources : null,
            inputTokens,
            outputTokens,
            contextTokens: contextTokensUsed,
            model,
          });

          // Update chat totals
          await db
            .update(chatsTable)
            .set({
              totalInputTokens: (chat.totalInputTokens || 0) + inputTokens + contextTokensUsed,
              totalOutputTokens: (chat.totalOutputTokens || 0) + outputTokens,
              totalCost: (chat.totalCost || 0) + costCents,
            })
            .where(eq(chatsTable.id, chat.id));

          // Send final message with metadata including detected intent
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                chatId: chat.id,
                tokensUsed: inputTokens + outputTokens + contextTokensUsed,
                costCents,
                sources,
                model,
                intent: {
                  type: intent.type,
                  subtype: intent.subtype,
                  confidence: intent.confidence,
                },
              })}\n\n`
            )
          );

          controller.close();
        } catch (error: any) {
          console.error("[Chat] Stream error:", error);
          const errorMessage = error.message || "An error occurred while processing your request.";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: errorMessage,
                details: error.code || error.type || "unknown"
              })}\n\n`
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

// GET - List chats for a case or get messages for a specific chat
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
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    // If chatId provided, get messages for that chat
    if (chatId) {
      // Verify chat belongs to user
      const [chat] = await db
        .select()
        .from(chatsTable)
        .where(
          and(
            eq(chatsTable.id, chatId),
            eq(chatsTable.caseId, caseId),
            eq(chatsTable.userId, userId)
          )
        )
        .limit(1);

      if (!chat) {
        return new Response(JSON.stringify({ error: "Chat not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get all messages for this chat
      const messages = await db
        .select()
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.chatId, chatId))
        .orderBy(asc(chatMessagesTable.createdAt));

      return new Response(JSON.stringify({ chat, messages }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Otherwise, list all chats for this case
    const chats = await db
      .select({
        id: chatsTable.id,
        title: chatsTable.title,
        status: chatsTable.status,
        totalInputTokens: chatsTable.totalInputTokens,
        totalOutputTokens: chatsTable.totalOutputTokens,
        totalCost: chatsTable.totalCost,
        createdAt: chatsTable.createdAt,
        updatedAt: chatsTable.updatedAt,
      })
      .from(chatsTable)
      .where(
        and(
          eq(chatsTable.caseId, caseId),
          eq(chatsTable.userId, userId)
        )
      )
      .orderBy(desc(chatsTable.updatedAt));

    return new Response(JSON.stringify({ chats }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Chat] Error listing chats:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// DELETE - Delete a chat
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return new Response(JSON.stringify({ error: "chatId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chatsTable)
      .where(
        and(
          eq(chatsTable.id, chatId),
          eq(chatsTable.caseId, caseId),
          eq(chatsTable.userId, userId)
        )
      )
      .limit(1);

    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete the chat (messages cascade)
    await db.delete(chatsTable).where(eq(chatsTable.id, chatId));

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Chat] Error deleting chat:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
