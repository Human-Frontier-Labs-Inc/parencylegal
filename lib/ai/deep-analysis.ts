/**
 * Deep Analysis Service
 * Phase 11: Advanced Legal Assistant
 *
 * Multi-document analysis, discrepancy detection, and verification
 */

import OpenAI from "openai";
import { getChatConfig, calculateCostCents } from "./model-config";

export type AnalysisType =
  | "comparison"
  | "discrepancy"
  | "asset_tracking"
  | "income_verification";

export interface DocumentData {
  id: string;
  fileName: string;
  category?: string;
  subtype?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface AnalysisOptions {
  caseId: string;
  documents: DocumentData[];
  documentIds?: string[];
  focusArea?: string;
  outputFormat?: "text" | "table";
}

export interface Discrepancy {
  field: string;
  value1: any;
  value2: any;
  source1: string;
  source2: string;
  sourceDocuments: string[];
  severity: "low" | "medium" | "high";
  explanation: string;
}

export interface AssetRecord {
  name: string;
  type: string;
  value: number;
  ownership: "joint" | "husband" | "wife" | "unknown";
  sourceDocument: string;
  date?: string;
}

export interface IncomeSource {
  type: "employment" | "self-employment" | "investment" | "rental" | "other";
  source: string;
  amount: number;
  frequency: "annual" | "monthly" | "weekly";
  sourceDocument: string;
  verified: boolean;
}

export interface AnalysisResult {
  type: AnalysisType;
  summary: string;
  documentsAnalyzed: string[];
  tokensUsed: number;
  costCents: number;
  formattedOutput?: string;
  recommendations?: string[];
  error?: string;

  // Comparison specific
  similarities?: string[];
  differences?: string[];

  // Discrepancy specific
  discrepancies?: Discrepancy[];

  // Asset tracking specific
  assets?: AssetRecord[];
  totalValue?: number;
  assetsByCategory?: Record<string, AssetRecord[]>;
  valueChanges?: Array<{ asset: string; change: number; period: string }>;

  // Income verification specific
  incomeSources?: IncomeSource[];
  totalIncome?: number;
  unverifiedClaims?: string[];
  crossReferences?: string[];
  confidenceScore?: number;
}

/**
 * Get system prompt for analysis type
 */
function getAnalysisSystemPrompt(analysisType: AnalysisType): string {
  const baseInstructions = `You are a legal document analysis assistant specializing in family law cases.
Analyze documents thoroughly and cite sources using [Document: filename.pdf] format.
Be precise with numbers and dates. Flag any inconsistencies.`;

  switch (analysisType) {
    case "comparison":
      return `${baseInstructions}

Compare the provided documents and identify:
1. SIMILARITIES - What information is consistent across documents
2. DIFFERENCES - What information differs or conflicts
3. UNIQUE ITEMS - What appears in one document but not others

Format your response with clear sections for Similarities and Differences.`;

    case "discrepancy":
      return `${baseInstructions}

Analyze documents for discrepancies and inconsistencies:
1. Look for conflicting information (amounts, dates, names)
2. Identify missing information that should be present
3. Flag suspicious patterns

For each discrepancy found:
- State what the discrepancy is
- Which documents contain conflicting info
- Severity (low/medium/high based on financial/legal impact)
- Possible explanations`;

    case "asset_tracking":
      return `${baseInstructions}

Track all assets mentioned across documents:
1. Real property (houses, land)
2. Personal property (vehicles, jewelry)
3. Financial accounts (bank, investment, retirement)
4. Business interests

For each asset identify:
- Description and value
- Ownership (joint, husband, wife, unknown)
- Source document
- Any value changes over time`;

    case "income_verification":
      return `${baseInstructions}

Verify income from all document sources:
1. Employment income (W-2s, pay stubs)
2. Self-employment income (1099s, business records)
3. Investment income (statements, tax returns)
4. Other income (rental, alimony received)

Cross-reference multiple sources. Flag:
- Unverified income claims
- Discrepancies between documents
- Missing documentation`;

    default:
      return baseInstructions;
  }
}

/**
 * Analyze documents
 */
export async function analyzeDocuments(
  analysisType: AnalysisType,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  const { caseId, documents, focusArea, outputFormat } = options;

  // Validate inputs
  if (!documents || documents.length === 0) {
    return {
      type: analysisType,
      summary: "",
      documentsAnalyzed: [],
      tokensUsed: 0,
      costCents: 0,
      error: "No documents provided for analysis",
    };
  }

  if (analysisType === "comparison" && documents.length < 2) {
    return {
      type: analysisType,
      summary: "",
      documentsAnalyzed: documents.map((d) => d.id),
      tokensUsed: 0,
      costCents: 0,
      error: "Comparison requires at least two documents",
    };
  }

  // Validate analysis type
  const validTypes: AnalysisType[] = [
    "comparison",
    "discrepancy",
    "asset_tracking",
    "income_verification",
  ];

  if (!validTypes.includes(analysisType)) {
    return {
      type: analysisType,
      summary: "",
      documentsAnalyzed: [],
      tokensUsed: 0,
      costCents: 0,
      error: `Invalid analysis type: ${analysisType}`,
    };
  }

  // Build document context
  const documentContext = documents
    .map((doc) => {
      let context = `[Document: ${doc.fileName}]`;
      if (doc.category) context += ` Category: ${doc.category}`;
      if (doc.subtype) context += ` Type: ${doc.subtype}`;
      if (doc.content) {
        context += `\nContent excerpt: ${doc.content.substring(0, 1000)}`;
      }
      if (doc.metadata) {
        context += `\nMetadata: ${JSON.stringify(doc.metadata)}`;
      }
      return context;
    })
    .join("\n\n---\n\n");

  const systemPrompt = getAnalysisSystemPrompt(analysisType);

  let userPrompt = `Analyze the following ${documents.length} documents:\n\n${documentContext}\n\n`;

  switch (analysisType) {
    case "comparison":
      userPrompt += `Compare these documents and identify all similarities and differences.`;
      break;
    case "discrepancy":
      userPrompt += `Find all discrepancies and inconsistencies${focusArea ? ` focusing on ${focusArea}` : ""}.`;
      break;
    case "asset_tracking":
      userPrompt += `Track all assets mentioned and calculate total values.`;
      break;
    case "income_verification":
      userPrompt += `Verify income from all sources and flag any discrepancies.`;
      break;
  }

  if (outputFormat === "table") {
    userPrompt += `\n\nFormat results as markdown tables where appropriate.`;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const chatConfig = getChatConfig();

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

    // Parse response and build result
    const result: AnalysisResult = {
      type: analysisType,
      summary: content,
      documentsAnalyzed: documents.map((d) => d.id),
      tokensUsed,
      costCents,
      recommendations: extractRecommendations(content),
      formattedOutput: outputFormat === "table" ? content : undefined,
    };

    // Add type-specific results
    switch (analysisType) {
      case "comparison":
        result.similarities = extractSection(content, "similarities");
        result.differences = extractSection(content, "differences");
        break;

      case "discrepancy":
        result.discrepancies = parseDiscrepancies(content, documents);
        break;

      case "asset_tracking":
        result.assets = parseAssets(content, documents);
        result.totalValue = result.assets?.reduce((sum, a) => sum + (a.value || 0), 0) || 0;
        result.assetsByCategory = groupAssetsByCategory(result.assets || []);
        result.valueChanges = extractValueChanges(content);
        break;

      case "income_verification":
        result.incomeSources = parseIncomeSources(content, documents);
        result.totalIncome = result.incomeSources?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
        result.unverifiedClaims = extractUnverifiedClaims(content);
        result.crossReferences = extractCrossReferences(content);
        result.confidenceScore = calculateConfidenceScore(result);
        break;
    }

    return result;
  } catch (error: any) {
    console.error("[Deep Analysis] Error:", error);
    return {
      type: analysisType,
      summary: "",
      documentsAnalyzed: documents.map((d) => d.id),
      tokensUsed: 0,
      costCents: 0,
      error: error.message,
    };
  }
}

// Helper functions for parsing AI responses

function extractSection(content: string, sectionName: string): string[] {
  const lines = content.split("\n");
  const items: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (line.toLowerCase().includes(sectionName.toLowerCase())) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (line.startsWith("#") || line.startsWith("**")) {
        inSection = false;
      } else if (line.trim().startsWith("-") || line.trim().startsWith("•")) {
        items.push(line.trim().replace(/^[-•]\s*/, ""));
      }
    }
  }

  return items;
}

function extractRecommendations(content: string): string[] {
  return extractSection(content, "recommendation");
}

function parseDiscrepancies(content: string, documents: DocumentData[]): Discrepancy[] {
  // Simple parsing - in production would use more sophisticated NLP
  const discrepancies: Discrepancy[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    if (line.toLowerCase().includes("discrepancy") || line.toLowerCase().includes("inconsistent")) {
      // Extract document references
      const docRefs = Array.from(line.matchAll(/\[Document:\s*([^\]]+)\]/g)).map((m) => m[1]);

      if (docRefs.length >= 1) {
        discrepancies.push({
          field: "detected",
          value1: null,
          value2: null,
          source1: docRefs[0] || "",
          source2: docRefs[1] || docRefs[0] || "",
          sourceDocuments: docRefs,
          severity: determineSeverity(line),
          explanation: line.replace(/\[Document:[^\]]+\]/g, "").trim(),
        });
      }
    }
  }

  return discrepancies;
}

function determineSeverity(text: string): "low" | "medium" | "high" {
  const lowerText = text.toLowerCase();
  if (
    lowerText.includes("significant") ||
    lowerText.includes("major") ||
    lowerText.includes("large")
  ) {
    return "high";
  }
  if (lowerText.includes("minor") || lowerText.includes("small")) {
    return "low";
  }
  return "medium";
}

function parseAssets(content: string, documents: DocumentData[]): AssetRecord[] {
  const assets: AssetRecord[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    // Look for dollar amounts
    const valueMatch = line.match(/\$[\d,]+(?:\.\d{2})?/);
    if (valueMatch) {
      const value = parseFloat(valueMatch[0].replace(/[$,]/g, ""));
      const docMatch = line.match(/\[Document:\s*([^\]]+)\]/);

      assets.push({
        name: line.split("-")[0]?.trim() || "Asset",
        type: determineAssetType(line),
        value,
        ownership: determineOwnership(line),
        sourceDocument: docMatch?.[1] || "unknown",
      });
    }
  }

  return assets;
}

function determineAssetType(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("house") || lowerText.includes("property") || lowerText.includes("real estate")) {
    return "real_property";
  }
  if (lowerText.includes("car") || lowerText.includes("vehicle")) {
    return "vehicle";
  }
  if (lowerText.includes("bank") || lowerText.includes("account") || lowerText.includes("401k")) {
    return "financial";
  }
  return "other";
}

function determineOwnership(text: string): "joint" | "husband" | "wife" | "unknown" {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("joint") || lowerText.includes("both")) return "joint";
  if (lowerText.includes("husband") || lowerText.includes("his")) return "husband";
  if (lowerText.includes("wife") || lowerText.includes("her")) return "wife";
  return "unknown";
}

function groupAssetsByCategory(assets: AssetRecord[]): Record<string, AssetRecord[]> {
  return assets.reduce(
    (acc, asset) => {
      const type = asset.type || "other";
      if (!acc[type]) acc[type] = [];
      acc[type].push(asset);
      return acc;
    },
    {} as Record<string, AssetRecord[]>
  );
}

function extractValueChanges(content: string): Array<{ asset: string; change: number; period: string }> {
  // Simplified - would use more sophisticated parsing in production
  return [];
}

function parseIncomeSources(content: string, documents: DocumentData[]): IncomeSource[] {
  const sources: IncomeSource[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const valueMatch = line.match(/\$[\d,]+(?:\.\d{2})?/);
    if (valueMatch && (line.toLowerCase().includes("income") || line.toLowerCase().includes("salary") || line.toLowerCase().includes("wage"))) {
      const value = parseFloat(valueMatch[0].replace(/[$,]/g, ""));
      const docMatch = line.match(/\[Document:\s*([^\]]+)\]/);

      sources.push({
        type: determineIncomeType(line),
        source: line.split("-")[0]?.trim() || "Income",
        amount: value,
        frequency: determineFrequency(line),
        sourceDocument: docMatch?.[1] || "unknown",
        verified: line.toLowerCase().includes("verified") || docMatch !== null,
      });
    }
  }

  return sources;
}

function determineIncomeType(text: string): IncomeSource["type"] {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("w-2") || lowerText.includes("salary") || lowerText.includes("wage")) {
    return "employment";
  }
  if (lowerText.includes("1099") || lowerText.includes("self-employ") || lowerText.includes("business")) {
    return "self-employment";
  }
  if (lowerText.includes("dividend") || lowerText.includes("interest") || lowerText.includes("investment")) {
    return "investment";
  }
  if (lowerText.includes("rent")) {
    return "rental";
  }
  return "other";
}

function determineFrequency(text: string): IncomeSource["frequency"] {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("annual") || lowerText.includes("year")) return "annual";
  if (lowerText.includes("week")) return "weekly";
  return "monthly";
}

function extractUnverifiedClaims(content: string): string[] {
  const claims: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    if (
      line.toLowerCase().includes("unverified") ||
      line.toLowerCase().includes("not verified") ||
      line.toLowerCase().includes("no documentation")
    ) {
      claims.push(line.trim());
    }
  }

  return claims;
}

function extractCrossReferences(content: string): string[] {
  const refs: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    if (
      line.toLowerCase().includes("cross-reference") ||
      line.toLowerCase().includes("matches") ||
      line.toLowerCase().includes("consistent with")
    ) {
      refs.push(line.trim());
    }
  }

  return refs;
}

function calculateConfidenceScore(result: AnalysisResult): number {
  const sources = result.incomeSources || [];
  if (sources.length === 0) return 0;

  const verifiedCount = sources.filter((s) => s.verified).length;
  return verifiedCount / sources.length;
}
