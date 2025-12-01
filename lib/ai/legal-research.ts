/**
 * Legal Research Service
 * Phase 11: Advanced Legal Assistant
 *
 * Web search, statute lookups, and citation formatting
 */

import OpenAI from "openai";
import { getChatConfig, calculateCostCents } from "./model-config";

export interface ResearchOptions {
  query: string;
  state?: string;
  type?: "general" | "statute" | "case_law";
  useWebSearch?: boolean;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface StatuteResult {
  code: string;
  section: string;
  title?: string;
  text?: string;
  url?: string;
}

export interface ResearchResult {
  topic: string;
  state?: string;
  content: string;
  summary: string;
  sources?: ResearchSource[];
  statutes?: StatuteResult[];
  citations?: string[];
  tokensUsed: number;
  costCents: number;
  webSearchUsed: boolean;
  chatMessage: string;
  metadata?: {
    timestamp: string;
    queryType: string;
  };
  warnings?: string[];
  error?: string;
}

export interface Citation {
  type: "statute" | "case" | "regulation";
  state?: string;
  code?: string;
  section?: string;
  title?: string;
  caseName?: string;
  volume?: string;
  reporter?: string;
  page?: string;
  year?: string;
  court?: string;
}

export interface StatuteReference {
  state: string;
  code: string;
  section: string;
}

// State abbreviation mappings
const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR",
  california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY",
};

// Reverse mapping
const ABBREVIATION_TO_STATE: Record<string, string> = Object.entries(STATE_ABBREVIATIONS).reduce(
  (acc, [name, abbrev]) => {
    acc[abbrev] = name;
    return acc;
  },
  {} as Record<string, string>
);

// State citation prefixes (Bluebook style)
const STATE_CITE_PREFIXES: Record<string, string> = {
  TX: "Tex.",
  CA: "Cal.",
  NY: "N.Y.",
  FL: "Fla.",
  IL: "Ill.",
  PA: "Pa.",
  OH: "Ohio",
  GA: "Ga.",
  NC: "N.C.",
  MI: "Mich.",
  NJ: "N.J.",
  VA: "Va.",
  WA: "Wash.",
  AZ: "Ariz.",
  MA: "Mass.",
  TN: "Tenn.",
  IN: "Ind.",
  MO: "Mo.",
  MD: "Md.",
  WI: "Wis.",
  CO: "Colo.",
  MN: "Minn.",
  SC: "S.C.",
  AL: "Ala.",
  LA: "La.",
  KY: "Ky.",
  OR: "Or.",
  OK: "Okla.",
  CT: "Conn.",
  UT: "Utah",
  IA: "Iowa",
  NV: "Nev.",
  AR: "Ark.",
  MS: "Miss.",
  KS: "Kan.",
  NM: "N.M.",
  NE: "Neb.",
  ID: "Idaho",
  WV: "W. Va.",
  HI: "Haw.",
  NH: "N.H.",
  ME: "Me.",
  RI: "R.I.",
  MT: "Mont.",
  DE: "Del.",
  SD: "S.D.",
  ND: "N.D.",
  AK: "Alaska",
  VT: "Vt.",
  WY: "Wyo.",
};

// Code abbreviations
const CODE_ABBREVIATIONS: Record<string, string> = {
  "Family Code": "Fam. Code",
  "Civil Code": "Civ. Code",
  "Penal Code": "Pen. Code",
  "Domestic Relations Law": "Dom. Rel. Law",
  "Estates Code": "Est. Code",
  "Property Code": "Prop. Code",
  "U.S.C.": "U.S.C.",
};

/**
 * Format a legal citation (Bluebook style)
 */
export function formatCitation(citation: Citation): string {
  if (citation.type === "statute") {
    // Federal statute
    if (citation.state === "federal" && citation.title && citation.code) {
      return `${citation.title} ${citation.code} § ${citation.section}`;
    }

    // State statute
    const statePrefix = citation.state ? STATE_CITE_PREFIXES[citation.state] || citation.state : "";
    const codeAbbrev = citation.code ? CODE_ABBREVIATIONS[citation.code] || citation.code : "";

    return `${statePrefix} ${codeAbbrev} § ${citation.section}`.trim();
  }

  if (citation.type === "case") {
    // Case citation format: Name, Volume Reporter Page (Court Year)
    let cite = citation.caseName || "";
    if (citation.volume && citation.reporter && citation.page) {
      cite += `, ${citation.volume} ${citation.reporter} ${citation.page}`;
    }
    if (citation.court || citation.year) {
      const courtYear = [citation.court, citation.year].filter(Boolean).join(" ");
      cite += ` (${courtYear})`;
    }
    return cite;
  }

  return "";
}

/**
 * Parse a statute reference string
 */
export function parseStatuteReference(reference: string): StatuteReference {
  // Handle formats like:
  // "Tex. Fam. Code § 3.002"
  // "Cal. Fam. Code § 2550"
  // "Texas Family Code Section 7.001"

  let state = "";
  let code = "";
  let section = "";

  // Extract section number
  const sectionMatch = reference.match(/(?:§|Section)\s*([\d.]+)/i);
  if (sectionMatch) {
    section = sectionMatch[1];
  }

  // Try to find state abbreviation or name
  for (const [stateName, abbrev] of Object.entries(STATE_ABBREVIATIONS)) {
    if (reference.toLowerCase().includes(stateName)) {
      state = abbrev;
      break;
    }
  }

  // Check for abbreviated state prefixes
  if (!state) {
    for (const [abbrev, prefix] of Object.entries(STATE_CITE_PREFIXES)) {
      if (reference.includes(prefix)) {
        state = abbrev;
        break;
      }
    }
  }

  // Check for direct abbreviations (TX, CA, etc.)
  if (!state) {
    const abbrevMatch = reference.match(/\b([A-Z]{2})\b/);
    if (abbrevMatch && STATE_CITE_PREFIXES[abbrevMatch[1]]) {
      state = abbrevMatch[1];
    }
  }

  // Extract code name
  if (reference.toLowerCase().includes("family")) {
    code = "Family Code";
  } else if (reference.toLowerCase().includes("civil")) {
    code = "Civil Code";
  } else if (reference.toLowerCase().includes("domestic")) {
    code = "Domestic Relations Law";
  } else if (reference.toLowerCase().includes("penal")) {
    code = "Penal Code";
  }

  return { state, code, section };
}

/**
 * Conduct legal research
 */
export async function conductResearch(options: ResearchOptions): Promise<ResearchResult> {
  const { query, state, type = "general", useWebSearch = false } = options;

  // Validate query
  if (!query || query.trim().length === 0) {
    return {
      topic: "",
      content: "",
      summary: "",
      tokensUsed: 0,
      costCents: 0,
      webSearchUsed: false,
      chatMessage: "",
      error: "Query is required for research",
    };
  }

  // Validate state if provided
  const warnings: string[] = [];
  let validatedState = state;

  if (state) {
    const upperState = state.toUpperCase();
    const lowerState = state.toLowerCase();

    if (STATE_CITE_PREFIXES[upperState]) {
      validatedState = upperState;
    } else if (STATE_ABBREVIATIONS[lowerState]) {
      validatedState = STATE_ABBREVIATIONS[lowerState];
    } else {
      warnings.push(`State "${state}" not recognized. Providing general results.`);
      validatedState = undefined;
    }
  }

  // Extract state from query if not provided
  if (!validatedState) {
    for (const [stateName, abbrev] of Object.entries(STATE_ABBREVIATIONS)) {
      if (query.toLowerCase().includes(stateName)) {
        validatedState = abbrev;
        break;
      }
    }
    // Check for abbreviations
    if (!validatedState) {
      for (const abbrev of Object.keys(STATE_CITE_PREFIXES)) {
        const pattern = new RegExp(`\\b${abbrev}\\b`, "i");
        if (pattern.test(query)) {
          validatedState = abbrev;
          break;
        }
      }
    }
  }

  // Build system prompt
  const systemPrompt = `You are a legal research assistant specializing in family law.
Provide accurate, well-cited legal information.
Always include relevant statute citations in proper Bluebook format.
If discussing state-specific law, specify which state.
Include warnings about jurisdiction-specific variations.
Be thorough but concise.`;

  // Build user prompt
  let userPrompt = `Research the following legal topic: ${query}`;
  if (validatedState) {
    const stateName = ABBREVIATION_TO_STATE[validatedState] || validatedState;
    userPrompt += `\n\nFocus on ${stateName} law specifically.`;
  }
  if (type === "statute") {
    userPrompt += `\n\nProvide relevant statute citations and their key provisions.`;
  } else if (type === "case_law") {
    userPrompt += `\n\nProvide relevant case law citations.`;
  }

  userPrompt += `\n\nFormat your response with:
1. A brief summary
2. Key legal points
3. Relevant citations (use proper Bluebook format)
4. Any important caveats or variations`;

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

    // Extract citations from content
    const citations = extractCitations(content);

    // Extract statute references
    const statutes = extractStatuteResults(content, validatedState);

    // Build sources (from citations)
    const sources: ResearchSource[] = citations.map((cite) => ({
      title: cite,
      url: buildSourceUrl(cite, validatedState),
    }));

    // Extract summary (first paragraph or section)
    const summary = extractSummary(content);

    // Format for chat display
    const chatMessage = formatForChat(content, validatedState);

    return {
      topic: query,
      state: validatedState,
      content,
      summary,
      sources,
      statutes,
      citations,
      tokensUsed,
      costCents,
      webSearchUsed: useWebSearch,
      chatMessage,
      metadata: {
        timestamp: new Date().toISOString(),
        queryType: type,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error: any) {
    console.error("[Legal Research] Error:", error);
    return {
      topic: query,
      state: validatedState,
      content: `Unable to complete research: ${error.message}`,
      summary: "",
      tokensUsed: 0,
      costCents: 0,
      webSearchUsed: useWebSearch,
      chatMessage: `I encountered an error researching "${query}". Please try again.`,
      error: error.message,
      warnings,
    };
  }
}

// Helper functions

function extractCitations(content: string): string[] {
  const citations: string[] = [];

  // Match statute citations (§ symbol)
  const statutePattern = /[A-Z][a-z]+\.?\s+[A-Za-z.]+\s+(?:Code\s+)?§\s*[\d.]+/g;
  const statuteMatches = content.match(statutePattern) || [];
  citations.push(...statuteMatches);

  // Match case citations (v. pattern)
  const casePattern = /[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+,?\s*\d+\s+[A-Za-z.]+\d*\s+\d+/g;
  const caseMatches = content.match(casePattern) || [];
  citations.push(...caseMatches);

  // Match U.S.C. citations
  const uscPattern = /\d+\s+U\.S\.C\.\s+§\s*\d+/g;
  const uscMatches = content.match(uscPattern) || [];
  citations.push(...uscMatches);

  return [...new Set(citations)]; // Remove duplicates
}

function extractStatuteResults(content: string, state?: string): StatuteResult[] {
  const statutes: StatuteResult[] = [];
  const citations = extractCitations(content);

  for (const cite of citations) {
    if (cite.includes("§")) {
      const ref = parseStatuteReference(cite);
      if (ref.section) {
        statutes.push({
          code: ref.code || "Unknown Code",
          section: ref.section,
          title: cite,
        });
      }
    }
  }

  return statutes;
}

function extractSummary(content: string): string {
  // Get first paragraph or up to 500 characters
  const paragraphs = content.split("\n\n");
  const firstPara = paragraphs[0] || content;

  if (firstPara.length > 500) {
    return firstPara.substring(0, 497) + "...";
  }

  return firstPara;
}

function buildSourceUrl(citation: string, state?: string): string {
  // Build a generic legal research URL
  // In production, could link to actual legal databases
  const encoded = encodeURIComponent(citation);

  if (citation.includes("U.S.C.")) {
    return `https://www.law.cornell.edu/uscode/text/${encoded}`;
  }

  if (state) {
    return `https://www.findlaw.com/state/${state.toLowerCase()}-law.html`;
  }

  return `https://www.findlaw.com/search.html?q=${encoded}`;
}

function formatForChat(content: string, state?: string): string {
  let message = content;

  // Add state context header if applicable
  if (state) {
    const stateName = ABBREVIATION_TO_STATE[state] || state;
    message = `**${stateName} Law Research**\n\n${message}`;
  }

  // Ensure proper markdown formatting
  message = message
    .replace(/\*\*(.+?)\*\*/g, "**$1**") // Keep bold
    .replace(/^- /gm, "• "); // Convert dashes to bullets

  return message;
}
