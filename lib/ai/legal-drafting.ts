/**
 * Legal Drafting Service
 * Phase 11: Advanced Legal Assistant
 *
 * Generates legal documents (discovery requests, narratives, summaries)
 */

import OpenAI from "openai";
import { getChatConfig, calculateCostCents } from "./model-config";

export type DraftType =
  | "discovery_request"
  | "interrogatories"
  | "rfp"
  | "timeline_narrative"
  | "case_summary"
  | "case_notes";

export interface DocumentInfo {
  id: string;
  fileName: string;
  category?: string;
  subtype?: string;
  date?: string;
  content?: string;
}

export interface CaseContext {
  caseName: string;
  caseType?: string;
  documents: DocumentInfo[];
  parties?: string[];
  jurisdiction?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ documentId: string; documentName: string }>;
}

export interface DraftOptions {
  topic?: string;
  caseContext: CaseContext;
  chatHistory?: ChatMessage[];
  tone?: "formal" | "standard";
  jurisdiction?: string;
  courtName?: string;
}

export interface DraftResult {
  content: string;
  type: DraftType;
  tokensUsed: number;
  costCents: number;
  documentReferences?: string[];
  metadata?: {
    jurisdiction?: string;
    generatedAt: string;
  };
  error?: string;
}

/**
 * Get system prompt for specific draft type
 */
export function getDraftingSystemPrompt(draftType: DraftType): string {
  const baseInstructions = `You are a legal document drafting assistant. Generate professional, formal legal documents.
Always cite source documents using the format [Document: filename.pdf] when referencing case materials.
Use proper legal formatting and terminology.`;

  switch (draftType) {
    case "discovery_request":
      return `${baseInstructions}

Generate a REQUEST FOR PRODUCTION OF DOCUMENTS in proper legal format.

Structure:
1. Header with case caption
2. Definitions section (define key terms)
3. Instructions for responding
4. Numbered requests (be specific and comprehensive)
5. Signature block

Use formal legal language. Each request should be numbered and specific about what documents are being requested.`;

    case "interrogatories":
      return `${baseInstructions}

Generate INTERROGATORIES in proper legal format.

Structure:
1. Header with case caption
2. Instructions (answer under oath, time to respond)
3. Definitions
4. Numbered INTERROGATORY NO. X format
5. Signature block

Each interrogatory should be clear, specific, and answerable. Include instructions about answering under penalty of perjury.`;

    case "rfp":
      return `${baseInstructions}

Generate a REQUEST FOR PRODUCTION (RFP) in proper legal format.

Structure:
1. Case caption
2. Definitions
3. Instructions for production
4. Numbered requests
5. Signature block

Be specific about the documents, time periods, and formats requested.`;

    case "timeline_narrative":
      return `${baseInstructions}

Generate a chronological narrative of the case based on the documents.

Structure:
1. Introduction (case overview)
2. Chronological events with dates
3. Key findings from each time period
4. Conclusion/current status

Cite documents using [Document: filename.pdf] format. Organize events from earliest to latest date.`;

    case "case_summary":
      return `${baseInstructions}

Generate a comprehensive case summary.

Structure:
1. Case Overview (parties, type, jurisdiction)
2. Document Summary (categories and counts)
3. Key Facts (from document analysis)
4. Financial Overview (if applicable)
5. Outstanding Issues/Gaps

Reference specific documents when stating facts.`;

    case "case_notes":
      return `${baseInstructions}

Convert the conversation into formatted case notes.

Structure:
1. Case Notes header with date
2. Topics discussed
3. Key findings (from AI responses)
4. Document references
5. Action items/follow-ups

Preserve all document citations and important information from the conversation.`;

    default:
      return baseInstructions;
  }
}

/**
 * Generate a legal draft
 */
export async function generateDraft(
  draftType: DraftType,
  options: DraftOptions
): Promise<DraftResult> {
  // Validate draft type
  const validTypes: DraftType[] = [
    "discovery_request",
    "interrogatories",
    "rfp",
    "timeline_narrative",
    "case_summary",
    "case_notes",
  ];

  if (!validTypes.includes(draftType)) {
    return {
      content: "",
      type: draftType,
      tokensUsed: 0,
      costCents: 0,
      error: `Invalid draft type: ${draftType}`,
    };
  }

  const { topic, caseContext, chatHistory, tone, jurisdiction, courtName } = options;

  // Build context string from case documents
  const documentContext = caseContext.documents
    .map((doc) => {
      let info = `- ${doc.fileName}`;
      if (doc.category) info += ` [${doc.category}]`;
      if (doc.subtype) info += ` (${doc.subtype})`;
      if (doc.date) info += ` - Date: ${doc.date}`;
      return info;
    })
    .join("\n");

  const systemPrompt = getDraftingSystemPrompt(draftType);

  // Build user prompt based on draft type
  let userPrompt = "";

  switch (draftType) {
    case "discovery_request":
    case "rfp":
      userPrompt = `Case: ${caseContext.caseName}
${caseContext.caseType ? `Type: ${caseContext.caseType}` : ""}
${jurisdiction || caseContext.jurisdiction ? `Jurisdiction: ${jurisdiction || caseContext.jurisdiction}` : ""}
${courtName ? `Court: ${courtName}` : ""}
${caseContext.parties?.length ? `Parties: ${caseContext.parties.join(", ")}` : ""}

Documents on file:
${documentContext}

Topic/Subject: ${topic || "all relevant documents"}

Generate a formal ${draftType.replace(/_/g, " ")} for the above topic.`;
      break;

    case "interrogatories":
      userPrompt = `Case: ${caseContext.caseName}
${caseContext.caseType ? `Type: ${caseContext.caseType}` : ""}
${caseContext.parties?.length ? `Parties: ${caseContext.parties.join(", ")}` : ""}

Documents we have:
${documentContext}

Topic: ${topic || "general discovery"}

Generate interrogatories about ${topic || "all relevant matters"}.`;
      break;

    case "timeline_narrative":
      userPrompt = `Case: ${caseContext.caseName}

Documents (in chronological order if dates available):
${documentContext}

Generate a chronological narrative of this case based on the documents listed.`;
      break;

    case "case_summary":
      userPrompt = `Case: ${caseContext.caseName}
${caseContext.caseType ? `Type: ${caseContext.caseType}` : ""}
${caseContext.parties?.length ? `Parties: ${caseContext.parties.join(", ")}` : ""}

Total Documents: ${caseContext.documents.length}

Document Breakdown:
${documentContext}

Generate a comprehensive case summary.`;
      break;

    case "case_notes":
      const chatContent = chatHistory
        ?.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join("\n\n");

      userPrompt = `Case: ${caseContext.caseName}
Date: ${new Date().toLocaleDateString()}

Conversation to convert to notes:
${chatContent || "No conversation history provided."}

Convert this conversation into formatted case notes.`;
      break;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const chatConfig = getChatConfig();

    // Use GPT-5 parameters
    const isGpt5 = chatConfig.model.startsWith("gpt-5") ||
                   chatConfig.model.startsWith("o1") ||
                   chatConfig.model.startsWith("o3");

    const completion = await openai.chat.completions.create({
      model: chatConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(isGpt5
        ? { max_completion_tokens: chatConfig.maxTokens }
        : { max_tokens: chatConfig.maxTokens }),
    });

    const content = completion.choices[0]?.message?.content || "";
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const tokensUsed = inputTokens + outputTokens;
    const costCents = calculateCostCents(inputTokens, outputTokens, chatConfig);

    // Extract document references from generated content
    const documentReferences: string[] = [];
    const citationRegex = /\[Document:\s*([^\]]+)\]/g;
    let match;
    while ((match = citationRegex.exec(content)) !== null) {
      const docName = match[1].trim();
      if (!documentReferences.includes(docName)) {
        documentReferences.push(docName);
      }
    }

    return {
      content,
      type: draftType,
      tokensUsed,
      costCents,
      documentReferences,
      metadata: {
        jurisdiction: jurisdiction || caseContext.jurisdiction,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[Legal Drafting] Error:", error);
    return {
      content: `Error generating ${draftType}: ${error.message}`,
      type: draftType,
      tokensUsed: 0,
      costCents: 0,
      error: error.message,
    };
  }
}
