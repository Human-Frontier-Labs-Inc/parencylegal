/**
 * Intent Detection for Legal Assistant Chat
 * Phase 11: Advanced Legal Assistant
 *
 * Detects user intent from natural language to route to appropriate handlers
 */

export type IntentType = "draft" | "analyze" | "research" | "general";

export type DraftSubtype =
  | "discovery_request"
  | "interrogatories"
  | "rfp"
  | "timeline_narrative"
  | "case_summary"
  | "case_notes";

export type AnalysisSubtype =
  | "comparison"
  | "discrepancy"
  | "asset_tracking"
  | "income_verification";

export interface Intent {
  type: IntentType;
  subtype?: DraftSubtype | AnalysisSubtype;
  topic?: string;
  state?: string;
  confidence: number;
  documentIds?: string[];
}

// Keywords and patterns for intent detection
const DRAFT_PATTERNS = {
  // RFP must come before discovery_request to match "request for production" first
  rfp: [
    /create\s+(a\s+)?request\s+for\s+production/i,
    /draft\s+(a\s+)?rfp/i,
    /prepare\s+(a\s+)?rfp/i,
    /^request\s+for\s+production/i,
  ],
  discovery_request: [
    /draft\s+(a\s+)?discovery\s+request/i,
    /create\s+(a\s+)?discovery\s+request/i,
    /prepare\s+(a\s+)?discovery\s+request/i,
    /discovery\s+request\s+for/i,
  ],
  interrogatories: [
    /draft\s+(.*)?interrogator/i,
    /generate\s+(.*)?interrogator/i,
    /create\s+(.*)?interrogator/i,
    /prepare\s+(.*)?interrogator/i,
    /need\s+interrogator/i,
  ],
  timeline_narrative: [
    /generate\s+(a\s+)?timeline\s+narrative/i,
    /create\s+(a\s+)?timeline\s+narrative/i,
    /draft\s+(a\s+)?timeline\s+narrative/i,
    /write\s+(a\s+)?timeline\s+narrative/i,
    /timeline\s+narrative/i,
  ],
  case_summary: [
    /summarize\s+(this\s+)?case/i,
    /create\s+(a\s+)?summary/i,
    /case\s+summary/i,
    /generate\s+(a\s+)?summary/i,
    /write\s+(a\s+)?summary/i,
  ],
  case_notes: [
    /export\s+(this\s+)?(conversation|chat)\s+as\s+(case\s+)?notes/i,
    /save\s+as\s+(case\s+)?notes/i,
    /convert\s+to\s+(case\s+)?notes/i,
  ],
};

const ANALYSIS_PATTERNS = {
  comparison: [
    /compare\s+(the\s+)?(.+)\s+(and|with|to)/i,
    /comparison\s+(of|between)/i,
    /differences?\s+between/i,
    /similarities?\s+between/i,
  ],
  discrepancy: [
    /find\s+(.*)?discrepanc/i,
    /detect\s+(.*)?discrepanc/i,
    /inconsistenc/i,
    /discrepanc/i,
    /mismatch/i,
    /don't\s+match/i,
    /doesn't\s+match/i,
  ],
  asset_tracking: [
    /track\s+(.*)?assets?/i,
    /asset\s+tracking/i,
    /list\s+(all\s+)?assets/i,
    /inventory\s+(of\s+)?assets/i,
    /what\s+assets/i,
  ],
  income_verification: [
    /verify\s+(.*)?income/i,
    /income\s+verification/i,
    /confirm\s+(.*)?income/i,
    /validate\s+(.*)?income/i,
    /check\s+(.*)?income/i,
  ],
};

const RESEARCH_PATTERNS = [
  /research\s+(.+)/i,
  /find\s+statutes?\s+about/i,
  /look\s+up\s+(.+)\s+law/i,
  /what\s+is\s+the\s+law\s+on/i,
  /legal\s+research/i,
  /statute/i,
  /case\s+law/i,
  /look\s+up\s+cases?\s+about/i,
];

// US States mapping
const US_STATES: Record<string, string> = {
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

const STATE_ABBREVIATIONS = Object.values(US_STATES);

/**
 * Detect intent from user message
 */
export function detectIntent(message: string): Intent {
  if (!message || message.trim().length === 0) {
    return { type: "general", confidence: 0.5 };
  }

  const lowerMessage = message.toLowerCase();

  // Check for draft intents first (highest priority for explicit drafting)
  // Also check if "draft" or similar keyword appears at the start
  const hasDraftKeyword = /^(draft|create|generate|prepare|write)\s/i.test(message.trim());

  for (const [subtype, patterns] of Object.entries(DRAFT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return {
          type: "draft",
          subtype: subtype as DraftSubtype,
          topic: extractTopic(message, subtype as DraftSubtype),
          confidence: calculateConfidence(message, "draft"),
        };
      }
    }
  }

  // If message starts with draft keyword but didn't match specific patterns
  // Check if it's asking for a generic draft (e.g., "Draft a research summary")
  if (hasDraftKeyword) {
    return {
      type: "draft",
      subtype: "case_summary", // Default to case_summary for generic drafts
      topic: extractTopic(message, "case_summary"),
      confidence: calculateConfidence(message, "draft"),
    };
  }

  // Check for analysis intents
  for (const [subtype, patterns] of Object.entries(ANALYSIS_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return {
          type: "analyze",
          subtype: subtype as AnalysisSubtype,
          topic: extractAnalysisTopic(message),
          confidence: calculateConfidence(message, "analyze"),
        };
      }
    }
  }

  // Check for generic "analyze" keyword
  if (/\banalyze\b/i.test(message)) {
    return {
      type: "analyze",
      topic: extractAnalysisTopic(message),
      confidence: calculateConfidence(message, "analyze"),
    };
  }

  // Check for research intents
  for (const pattern of RESEARCH_PATTERNS) {
    if (pattern.test(message)) {
      const state = extractState(message);
      return {
        type: "research",
        topic: extractResearchTopic(message),
        state: state,
        confidence: calculateConfidence(message, "research"),
      };
    }
  }

  // Default to general query
  return {
    type: "general",
    confidence: calculateConfidence(message, "general"),
  };
}

/**
 * Extract topic from drafting request
 */
function extractTopic(message: string, subtype: DraftSubtype): string {
  const lowerMessage = message.toLowerCase();

  // Remove common prefixes
  let topic = message
    .replace(/^(draft|create|generate|prepare|write)\s+(a\s+)?/i, "")
    .replace(/discovery\s+request\s+(for\s+)?/i, "")
    .replace(/interrogatories?\s+(about|for|regarding)?\s*/i, "")
    .replace(/request\s+for\s+production\s+(of\s+)?/i, "")
    .replace(/timeline\s+narrative\s*(for\s+)?/i, "")
    .replace(/(case\s+)?summary\s*(of\s+)?/i, "")
    .trim();

  // If we have something left, return it; otherwise return a generic topic
  if (topic.length > 3) {
    return topic;
  }

  return subtype.replace(/_/g, " ");
}

/**
 * Extract topic from analysis request
 */
function extractAnalysisTopic(message: string): string {
  return message
    .replace(/^(find|detect|compare|track|verify|analyze)\s+(the\s+)?/i, "")
    .replace(/discrepancies?\s+(in\s+)?/i, "")
    .replace(/assets?\s+(across|in)\s+/i, "")
    .replace(/income\s+(from\s+)?/i, "")
    .replace(/all\s+documents?/i, "")
    .trim();
}

/**
 * Extract research topic from message
 */
function extractResearchTopic(message: string): string {
  return message
    .replace(/^(research|find|look\s+up)\s+/i, "")
    .replace(/statutes?\s+(about|on|for)\s+/i, "")
    .replace(/what\s+is\s+the\s+law\s+on\s+/i, "")
    .replace(/cases?\s+(about|on)\s+/i, "")
    .replace(/\s+in\s+[a-z]{2,}$/i, "") // Remove trailing state
    .trim();
}

/**
 * Extract US state from message
 */
function extractState(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();

  // Check for full state names first (more specific)
  for (const [stateName, abbrev] of Object.entries(US_STATES)) {
    if (lowerMessage.includes(stateName)) {
      return stateName.charAt(0).toUpperCase() + stateName.slice(1);
    }
  }

  // Check for state abbreviations at word boundaries
  // Use a more specific pattern to avoid matching "IN" within words
  // Only match 2-letter abbreviations that are standalone
  const words = message.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^A-Za-z]/g, "").toUpperCase();
    if (cleanWord.length === 2 && STATE_ABBREVIATIONS.includes(cleanWord)) {
      // Make sure it's not a common word like "IN", "OR", etc. unless it's clearly a state reference
      const commonWords = ["IN", "OR", "ME", "OK"];
      if (commonWords.includes(cleanWord)) {
        // Only accept if it looks like a state reference (e.g., "laws in TX" or "TX law")
        const statePattern = new RegExp(`(in|of|for)\\s+${cleanWord}\\b|\\b${cleanWord}\\s+(law|code|statute)`, "i");
        if (statePattern.test(message)) {
          return cleanWord;
        }
      } else {
        return cleanWord;
      }
    }
  }

  return undefined;
}

/**
 * Calculate confidence score for detected intent
 */
function calculateConfidence(message: string, intentType: IntentType): number {
  const lowerMessage = message.toLowerCase();
  let confidence = 0.5;

  // Explicit keywords increase confidence
  const explicitDraftKeywords = ["draft", "generate", "create", "prepare", "write"];
  const explicitAnalyzeKeywords = ["analyze", "compare", "find", "detect", "verify", "track"];
  const explicitResearchKeywords = ["research", "statute", "law", "look up"];

  switch (intentType) {
    case "draft":
      if (explicitDraftKeywords.some((k) => lowerMessage.includes(k))) {
        confidence = 0.85;
      } else {
        confidence = 0.6;
      }
      // Boost for very specific patterns
      if (/discovery\s+request|interrogator|rfp|timeline\s+narrative/i.test(message)) {
        confidence = Math.min(confidence + 0.1, 0.95);
      }
      break;

    case "analyze":
      if (explicitAnalyzeKeywords.some((k) => lowerMessage.includes(k))) {
        confidence = 0.8;
      } else {
        confidence = 0.6;
      }
      break;

    case "research":
      if (explicitResearchKeywords.some((k) => lowerMessage.includes(k))) {
        confidence = 0.8;
      } else {
        confidence = 0.6;
      }
      break;

    case "general":
    default:
      // Lower confidence for ambiguous messages
      if (message.length < 20) {
        confidence = 0.4;
      } else if (/\?$/.test(message)) {
        confidence = 0.6;
      } else {
        confidence = 0.5;
      }
      break;
  }

  return confidence;
}
