# Insights Tab Redesign - Implementation Plan

## Overview
Redesign the Insights tab to allow attorneys to upload RFP/discovery request PDFs or paste request text, then see a clear compliance dashboard showing how their case documents match against those requests.

---

## Phase 1: Core Input Interface (Foundation)
**Goal:** Replace the current confusing layout with a clear "upload or paste" entry point

### Tasks:
1. **Create `RfpInputPanel` component**
   - Two-column layout: PDF upload | Text paste
   - Drag-and-drop PDF upload zone
   - Large textarea for pasting reclaudequests
   - "Analyze Requests" button
   - Loading state while processing

2. **Update page structure**
   - Remove nested tabs-within-tabs
   - Make input panel the hero/primary action
   - Show "No analysis yet" state when empty

### Files to Create/Modify:
- `components/insights/rfp-input-panel.tsx` (NEW)
- `components/insights/discovery-compliance-panel.tsx` (MODIFY)

### Acceptance Criteria:
- [ ] User sees clear upload/paste options immediately
- [ ] PDF drag-and-drop works
- [ ] Text paste accepts multi-line input
- [ ] Loading spinner during analysis

---

## Phase 2: PDF Parsing API
**Goal:** Extract individual RFP requests from uploaded PDF documents

### Tasks:
1. **Create PDF parsing endpoint**
   - Accept PDF file upload
   - Extract text using pdf-parse or similar
   - Use AI to identify individual requests
   - Return structured array of requests

2. **Request parsing logic**
   - Detect patterns: "RFP 1:", "Interrogatory No. 1:", "Request 1.", etc.
   - Extract request text
   - Auto-categorize by type (Financial, Medical, etc.)
   - Return confidence scores

### Files to Create/Modify:
- `app/api/cases/[id]/discovery/parse-pdf/route.ts` (NEW)
- `lib/services/rfp-parser.ts` (NEW)

### API Response Format:
```typescript
{
  requests: [
    {
      type: "RFP" | "Interrogatory",
      number: 1,
      text: "All bank statements from January 2023 to present",
      suggestedCategory: "Financial",
      confidence: 0.92
    }
  ],
  metadata: {
    totalExtracted: 30,
    documentTitle: "Requests for Production - Smith v. Smith",
    parseConfidence: 0.95
  }
}
```

### Acceptance Criteria:
- [ ] PDF uploads successfully parse
- [ ] Individual requests are extracted correctly
- [ ] Request numbers are identified
- [ ] Categories are suggested

---

## Phase 3: Compliance Dashboard UI
**Goal:** Create a clear, visual dashboard showing compliance status

### Tasks:
1. **Create `ComplianceDashboard` component**
   - Large compliance score with progress bar
   - 4-tile stat grid (Complete, Partial, Missing, Extra)
   - Color-coded status indicators
   - Responsive grid layout

2. **Score calculation logic**
   - Complete = 100% of request satisfied
   - Partial = Some documents match, not all
   - Missing = No documents match
   - Extra = Documents not requested

### Files to Create/Modify:
- `components/insights/compliance-dashboard.tsx` (NEW)
- `components/insights/compliance-stat-card.tsx` (NEW)

### Acceptance Criteria:
- [ ] Overall score prominently displayed
- [ ] 4 stat cards show correct counts
- [ ] Colors match status (green/yellow/red/blue)
- [ ] Dashboard is responsive

---

## Phase 4: Document Matching Engine
**Goal:** Accurately match case documents to RFP requests

### Tasks:
1. **Enhance matching algorithm**
   - Keyword extraction from requests
   - Category-based matching
   - Date range matching
   - Semantic similarity (optional: use embeddings)

2. **Update discovery API**
   - Return match scores per request
   - Include matched document IDs
   - Calculate completion percentage
   - Identify partial matches

3. **Create matching service**
   - `matchDocumentsToRequest(request, documents)`
   - Score each document 0-100
   - Return top matches with explanations

### Files to Create/Modify:
- `lib/services/document-matcher.ts` (NEW)
- `app/api/cases/[id]/discovery/match/route.ts` (NEW)
- `app/api/cases/[id]/discovery/route.ts` (MODIFY)

### Acceptance Criteria:
- [ ] Requests match to relevant documents
- [ ] Match scores are reasonable
- [ ] Date ranges are considered
- [ ] Category hints improve accuracy

---

## Phase 5: Interactive Request List
**Goal:** Show detailed request-to-document mappings with drill-down

### Tasks:
1. **Create `RequestList` component**
   - Expandable request rows
   - Status icons (✅ ⚠️ ❌)
   - Matched documents shown on expand
   - Click-through to document viewer

2. **Add filtering/sorting**
   - Filter by status (All, Complete, Partial, Missing)
   - Sort by request number or status
   - Search within requests

3. **Document preview on hover**
   - Show document name, category
   - Quick link to full document

### Files to Create/Modify:
- `components/insights/request-list.tsx` (NEW)
- `components/insights/request-row.tsx` (NEW)
- `components/insights/matched-document-badge.tsx` (NEW)

### Acceptance Criteria:
- [ ] Requests are listed clearly
- [ ] Expand/collapse works smoothly
- [ ] Matched documents are clickable
- [ ] Filtering works correctly

---

## Phase 6: Integration & Polish
**Goal:** Integrate all components, add persistence, polish UX

### Tasks:
1. **Integrate components into Insights tab**
   - Wire up all components
   - Handle state management
   - Add error handling
   - Loading states throughout

2. **Add request set persistence**
   - Save analyzed requests to database
   - Load previous request sets
   - Dropdown to switch between sets

3. **UX polish**
   - Smooth transitions/animations
   - Empty states with helpful messaging
   - Success/error toasts
   - Keyboard navigation

4. **Testing**
   - Test with real RFP PDFs
   - Edge cases (empty PDFs, malformed requests)
   - Performance with large document sets

### Files to Create/Modify:
- `components/insights/discovery-compliance-panel.tsx` (MAJOR REWRITE)
- `app/api/cases/[id]/discovery/sets/route.ts` (NEW)

### Acceptance Criteria:
- [ ] Full flow works end-to-end
- [ ] Previous analyses can be loaded
- [ ] No console errors
- [ ] Responsive on all screen sizes

---

## Database Schema Changes

### New Table: `discovery_request_sets`
```sql
CREATE TABLE discovery_request_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50), -- 'pdf_upload', 'text_paste', 'manual'
  source_filename VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Modify: `discovery_requests` table
```sql
ALTER TABLE discovery_requests
ADD COLUMN request_set_id UUID REFERENCES discovery_request_sets(id);
```

---

## Component Architecture

```
DiscoveryCompliancePanel (main container)
├── RfpInputPanel
│   ├── PdfUploadZone
│   └── TextPasteArea
├── ComplianceDashboard
│   ├── OverallScoreCard
│   └── StatCardGrid (4 cards)
└── RequestList
    └── RequestRow (multiple)
        └── MatchedDocumentBadge (multiple)
```

---

## Timeline Estimate

| Phase | Components | Complexity |
|-------|------------|------------|
| Phase 1 | Input Interface | Medium |
| Phase 2 | PDF Parsing API | High |
| Phase 3 | Dashboard UI | Low |
| Phase 4 | Matching Engine | High |
| Phase 5 | Request List | Medium |
| Phase 6 | Integration | Medium |

---

## Dependencies

- `pdf-parse` or `pdfjs-dist` - PDF text extraction
- OpenAI API - Request parsing and categorization
- Existing document classification data
- Existing discovery_requests table

---

## Success Metrics

1. **User can upload PDF and see results in < 30 seconds**
2. **Compliance score accurately reflects document coverage**
3. **90%+ of requests correctly matched to documents**
4. **Zero layout confusion - primary action obvious**
5. **Works on mobile/tablet viewports**
