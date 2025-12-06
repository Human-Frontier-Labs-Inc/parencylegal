# Phase 11: Advanced Legal Assistant - Implementation Plan

## Goal
Integrate advanced legal assistant capabilities (drafting, deep analysis, legal research) into the **existing AI Chat interface** so users can make all AI queries in one unified location.

---

## Design Philosophy

Instead of creating separate pages/features for each capability, we will:
1. **Enhance the existing chat** with intelligent mode detection
2. **Add special commands** users can invoke (e.g., `/draft`, `/analyze`, `/research`)
3. **Extend the system prompt** to understand different request types
4. **Add structured output** for drafting and analysis tasks

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Case Chat Interface                       │
│                  (existing: case-chat.tsx)                   │
├─────────────────────────────────────────────────────────────┤
│  User Input: "Draft a discovery request for bank statements" │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          Intent Detection Layer (NEW)                │    │
│  │  - Detects: draft/analyze/research/general query     │    │
│  │  - Routes to appropriate handler                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Handler (based on intent)                    │    │
│  │  - Draft: Uses drafting prompts + document context   │    │
│  │  - Analyze: Multi-doc comparison + discrepancy detect│    │
│  │  - Research: Web search + statute lookups            │    │
│  │  - General: Existing RAG-based chat                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  Response with formatted output (markdown, tables, etc.)    │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### 11.1 Document Drafting (TDD)

**Features to Add:**
1. Discovery request generation (interrogatories, RFPs)
2. Timeline narrative generation
3. Case summary generation
4. Export chat as case notes

**User Commands (in chat):**
- `Draft a discovery request for [topic]`
- `Generate interrogatories about [subject]`
- `Create a timeline narrative`
- `Summarize this case`
- `Export this chat as case notes`

**Implementation:**
- **File:** `lib/ai/legal-drafting.ts` - Drafting templates and prompts
- **Modify:** `app/api/cases/[id]/chat/route.ts` - Add intent detection
- **Add:** Download/export button for drafted documents

**TDD Tests:**
```typescript
// tests/chat/legal-drafting.test.ts
describe('Legal Drafting in Chat', () => {
  test('detects draft intent from user message', async () => {
    const intent = detectIntent('Draft a discovery request for bank statements');
    expect(intent.type).toBe('draft');
    expect(intent.subtype).toBe('discovery_request');
  });

  test('generates formatted discovery request', async () => {
    const response = await generateDraft('discovery_request', {
      topic: 'bank statements',
      caseContext: mockCaseContext
    });
    expect(response).toContain('REQUEST FOR PRODUCTION');
    expect(response).toContain('bank');
  });

  test('includes document references in draft', async () => {
    const response = await generateDraft('timeline_narrative', {
      documents: mockDocuments
    });
    expect(response).toMatch(/\[Document:/);
  });
});
```

---

### 11.2 Deep Analysis (TDD)

**Features to Add:**
1. Multi-document comparison
2. Discrepancy detection (income, assets, dates)
3. Asset tracking across documents
4. Income verification

**User Commands (in chat):**
- `Compare these documents: [doc1], [doc2]`
- `Find discrepancies in the financial records`
- `Track assets across all documents`
- `Verify income from all sources`
- `Analyze the bank statements for unusual transactions`

**Implementation:**
- **File:** `lib/ai/deep-analysis.ts` - Analysis prompts and logic
- **Modify:** `app/api/cases/[id]/chat/route.ts` - Add analysis handlers
- **Add:** Structured output for analysis results (tables, charts)

**TDD Tests:**
```typescript
// tests/chat/deep-analysis.test.ts
describe('Deep Analysis in Chat', () => {
  test('detects analysis intent', async () => {
    const intent = detectIntent('Find discrepancies in the financial records');
    expect(intent.type).toBe('analyze');
    expect(intent.subtype).toBe('discrepancy_detection');
  });

  test('compares multiple documents', async () => {
    const result = await analyzeDocuments('compare', {
      documentIds: ['doc1', 'doc2'],
      caseId: mockCaseId
    });
    expect(result.similarities).toBeDefined();
    expect(result.differences).toBeDefined();
  });

  test('detects income discrepancies', async () => {
    const result = await analyzeDocuments('income_verification', {
      caseId: mockCaseId
    });
    expect(result.sources).toBeArray();
    expect(result.discrepancies).toBeDefined();
  });
});
```

---

### 11.3 Legal Research (TDD)

**Features to Add:**
1. Web search integration for legal questions
2. State-specific statute lookups (using web search)
3. Citation formatting
4. Research history (stored in chat)

**User Commands (in chat):**
- `Research [legal topic] in [state]`
- `Find statutes about [topic] in Texas`
- `What is the law on [subject]?`
- `Look up [case name or statute]`

**Implementation:**
- **File:** `lib/ai/legal-research.ts` - Research prompts and web search
- **API:** Add web search capability (use OpenAI's web browsing or external API)
- **Modify:** `app/api/cases/[id]/chat/route.ts` - Add research handlers
- **Add:** Citation formatting and source links

**TDD Tests:**
```typescript
// tests/chat/legal-research.test.ts
describe('Legal Research in Chat', () => {
  test('detects research intent', async () => {
    const intent = detectIntent('Research community property laws in Texas');
    expect(intent.type).toBe('research');
    expect(intent.state).toBe('Texas');
  });

  test('formats citations correctly', async () => {
    const citation = formatCitation({
      type: 'statute',
      state: 'TX',
      code: 'Family Code',
      section: '3.002'
    });
    expect(citation).toBe('Tex. Fam. Code § 3.002');
  });

  test('includes web sources in response', async () => {
    const response = await conductResearch('community property Texas');
    expect(response.sources).toBeArray();
    expect(response.sources[0]).toHaveProperty('url');
  });
});
```

---

## UI Enhancements to Chat

### 1. Enhanced Suggestions (Empty State)
Update the suggested questions to include advanced capabilities:

```tsx
// Updated suggestions in case-chat.tsx
const suggestions = [
  // Existing
  "What documents do we have?",
  "Summarize the financial records",
  // New - Drafting
  "Draft discovery requests for bank statements",
  "Generate a timeline narrative",
  // New - Analysis
  "Find income discrepancies",
  "Compare the tax returns",
  // New - Research
  "Research community property laws in Texas",
];
```

### 2. Mode Indicator Badge
Show the detected mode in the chat header:

```tsx
// When AI detects intent, show badge
{currentMode && (
  <Badge variant="outline" className="ml-2">
    {currentMode === 'draft' && <FileEdit className="h-3 w-3 mr-1" />}
    {currentMode === 'analyze' && <BarChart className="h-3 w-3 mr-1" />}
    {currentMode === 'research' && <Globe className="h-3 w-3 mr-1" />}
    {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode
  </Badge>
)}
```

### 3. Structured Output Rendering
For drafts and analysis, render structured output:

```tsx
// Detect structured output in response
if (response.type === 'draft') {
  return (
    <div className="space-y-4">
      <div className="prose prose-sm">
        <Markdown>{response.content}</Markdown>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => copyToClipboard(response.content)}>
          <Copy className="h-4 w-4 mr-1" /> Copy
        </Button>
        <Button size="sm" onClick={() => downloadAsDocument(response.content)}>
          <Download className="h-4 w-4 mr-1" /> Download
        </Button>
      </div>
    </div>
  );
}
```

---

## API Changes

### Modified: `/api/cases/[id]/chat/route.ts`

```typescript
// New imports
import { detectIntent, IntentType } from "@/lib/ai/intent-detection";
import { generateDraft } from "@/lib/ai/legal-drafting";
import { analyzeDocuments } from "@/lib/ai/deep-analysis";
import { conductResearch } from "@/lib/ai/legal-research";

// In POST handler, after receiving message:
const intent = await detectIntent(message, caseContext);

let systemPrompt = "";
let additionalContext = "";

switch (intent.type) {
  case "draft":
    systemPrompt = getDraftingSystemPrompt(intent.subtype);
    additionalContext = await getDraftingContext(caseId, intent);
    break;
  case "analyze":
    systemPrompt = getAnalysisSystemPrompt(intent.subtype);
    additionalContext = await getAnalysisContext(caseId, intent);
    break;
  case "research":
    systemPrompt = getResearchSystemPrompt();
    additionalContext = await conductWebSearch(intent.query);
    break;
  default:
    // Existing RAG-based chat
    systemPrompt = getDefaultSystemPrompt(caseData);
    additionalContext = await getDocumentContext(caseId, message);
}
```

---

## New Files to Create

| File | Purpose |
|------|---------|
| `lib/ai/intent-detection.ts` | Detect user intent from message |
| `lib/ai/legal-drafting.ts` | Drafting templates and prompts |
| `lib/ai/deep-analysis.ts` | Multi-document analysis logic |
| `lib/ai/legal-research.ts` | Web search and citation formatting |
| `tests/chat/legal-drafting.test.ts` | TDD tests for drafting |
| `tests/chat/deep-analysis.test.ts` | TDD tests for analysis |
| `tests/chat/legal-research.test.ts` | TDD tests for research |
| `tests/chat/intent-detection.test.ts` | TDD tests for intent detection |

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/api/cases/[id]/chat/route.ts` | Add intent detection and handlers |
| `components/chat/case-chat.tsx` | Add mode indicators, structured output |
| `lib/ai/model-config.ts` | Add research model config if needed |

---

## Implementation Order (TDD)

1. **Intent Detection** (Foundation)
   - Write tests for intent detection
   - Implement `lib/ai/intent-detection.ts`
   - Test passes

2. **Document Drafting**
   - Write tests for drafting
   - Implement `lib/ai/legal-drafting.ts`
   - Modify chat API
   - Test passes

3. **Deep Analysis**
   - Write tests for analysis
   - Implement `lib/ai/deep-analysis.ts`
   - Modify chat API
   - Test passes

4. **Legal Research**
   - Write tests for research
   - Implement `lib/ai/legal-research.ts`
   - Add web search capability
   - Modify chat API
   - Test passes

5. **UI Enhancements**
   - Update chat component
   - Add mode indicators
   - Add structured output rendering
   - Test UI flows

---

## Success Criteria

- [ ] User can draft discovery requests in chat
- [ ] User can generate timeline narratives in chat
- [ ] User can detect discrepancies across documents
- [ ] User can conduct legal research with web sources
- [ ] All capabilities accessible from single chat interface
- [ ] Mode detection is accurate (>90% intent classification)
- [ ] Response quality rating >4/5 for drafts
- [ ] All TDD tests passing

---

## Estimated Effort

| Component | Estimate |
|-----------|----------|
| Intent Detection | Small |
| Document Drafting | Medium |
| Deep Analysis | Medium |
| Legal Research | Medium-Large (web integration) |
| UI Enhancements | Small |
| **Total** | ~5-7 development sessions |

---

## Notes

- **No separate pages needed** - Everything integrated into existing chat
- **Progressive enhancement** - Each feature can be released independently
- **Cost consideration** - Advanced features may use more tokens; consider usage tracking
- **Web search** - May require additional API (Serper, Tavily, or OpenAI's browsing)
