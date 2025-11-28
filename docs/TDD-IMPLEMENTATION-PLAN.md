# Parency Legal - TDD Phase Implementation Plan
**Target: Production on Vercel in 12-14 Weeks**

## Overview
This plan uses Test-Driven Development (TDD) methodology where tests are written BEFORE implementation. Each phase has clear deliverables, acceptance criteria, and a working deployment to Vercel staging/production.

---

## 📋 Phase Status Overview

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 1 | Database Foundation & Auth | ✅ COMPLETE | Supabase, Clerk, schema |
| 2 | Dropbox Integration | ✅ COMPLETE | OAuth, sync, storage |
| 3 | AI Document Classification | ✅ COMPLETE | Manual classification, PDF extraction |
| 4 | Auto-Classification & Model Config | ✅ COMPLETE | Background processing, env-driven models |
| 5 | Document Intelligence (RAG) | ✅ COMPLETE | pgvector, embeddings, semantic search |
| 6 | Chat Interface | ✅ COMPLETE | Multi-chat, citations, token tracking |
| 7 | Case Insights & Gap Detection | 🔄 IN PROGRESS | Missing docs, recommendations |
| 8 | Discovery Request Tracking | ⚠️ PARTIAL | Basic RFP UI exists, needs AI mapping |
| 9 | Timeline, Search & Export | ⏳ PLANNED | Chronological view, PDF export |
| 10 | Stripe Payments & Trials | ⏳ PLANNED | Subscriptions, usage limits |
| 11 | Advanced Legal Assistant | ⏳ PLANNED | Drafting, legal research |
| 12 | Production Launch | ⏳ PLANNED | Security, performance, monitoring |

---

## 🏗️ PHASE 1: Database Foundation & Auth ✅ COMPLETE
**Goal:** Production-ready database schema with authentication

### Completed Deliverables
- ✅ Supabase PostgreSQL database configured
- ✅ Clerk authentication integrated
- ✅ Database schema with all core tables
- ✅ Row Level Security (RLS) policies
- ✅ Protected routes middleware
- ✅ Deployed to Vercel

### Schema Tables
- `cases` - Case management with Dropbox folder mapping
- `documents` - Document storage with classification fields
- `ai_chat_sessions` - AI conversation tracking
- `discovery_requests` - RFPs/Interrogatories (future)
- `document_request_mappings` - Discovery mapping (future)

---

## 🔗 PHASE 2: Dropbox Integration ✅ COMPLETE
**Goal:** Attorneys can connect Dropbox and sync case folders

### Completed Deliverables
- ✅ Dropbox OAuth flow (PKCE)
- ✅ Token storage and refresh mechanism
- ✅ Folder browser UI component
- ✅ Case creation with Dropbox folder mapping
- ✅ Manual "Sync from Dropbox" functionality
- ✅ File download to Supabase Storage
- ✅ Duplicate detection via content hash
- ✅ Serverless-compatible API (fetch instead of SDK)

---

## 🤖 PHASE 3: AI Document Classification ✅ COMPLETE
**Goal:** Documents can be classified with AI assistance

### Completed Deliverables
- ✅ OpenAI integration (GPT-4o-mini)
- ✅ PDF text extraction with unpdf (serverless-compatible)
- ✅ Document classification with category/subtype
- ✅ Confidence scoring
- ✅ Metadata extraction (dates, parties, amounts)
- ✅ Manual "Re-classify" button
- ✅ Classification review UI
- ✅ Filename-based fallback for scanned PDFs
- ✅ Token usage and cost tracking

### Current Limitations (Addressed in Phase 4)
- Classification is manual (button click)
- Model is hardcoded (GPT-4o-mini)
- No background processing for batch operations

---

## ⚡ PHASE 4: Auto-Classification & Configurable Models ✅ COMPLETE
**Goal:** Automatic classification on sync, environment-driven model selection

### 4.1 Environment-Driven Model Configuration ✅
**Completed:**
- ✅ Model selection from environment variables
- ✅ Fallback to defaults when env not set
- ✅ Different models for different use cases
- ✅ Centralized `lib/ai/model-config.ts` with all pricing
- ✅ Updated to GPT-5 family (Nov 2025)

**Environment Variables (set on Vercel):**
```env
OPENAI_MODEL_CLASSIFICATION=gpt-5-nano    # $0.05/$0.40 per 1M tokens
OPENAI_MODEL_CHAT=gpt-5-mini              # $0.25/$2.00 per 1M tokens
OPENAI_MODEL_EMBEDDING=text-embedding-3-small  # $0.02 per 1M tokens
```

**Documentation:** See `docs/OPENAI-MODEL-PRICING.md` for full pricing guide

### 4.2 Document Processing Queue ✅
**Completed:**
- ✅ `document_processing_queue` table created
- ✅ Queue service with status transitions
- ✅ Retry logic (3 attempts max)
- ✅ "Analyze Documents" button for manual batch processing

### 4.3 Background Processing with Vercel Cron ✅
**Completed:**
- ✅ `/api/cron/process-documents` endpoint
- ✅ `vercel.json` configured for cron
- ✅ Batch processing with timeout safety

### 4.4 Sync Flow Integration ✅
**Completed:**
- ✅ Processing status endpoint
- ✅ UI shows document counts and classification status

### 📦 PHASE 4 DELIVERABLES ✅
- ✅ Environment-driven model selection (GPT-5 family)
- ✅ Document processing queue functional
- ✅ Vercel Cron job configured
- ✅ Manual "Analyze Documents" button
- ✅ Classification status in UI

---

## 🧠 PHASE 5: Document Intelligence (RAG Foundation) ✅ COMPLETE
**Goal:** Semantic search and document understanding via embeddings

### 5.1 pgvector Setup ✅
**Completed:**
- ✅ pgvector extension enabled in Supabase
- ✅ `document_chunks` table with vector(1536) column
- ✅ HNSW index for fast similarity search
- ✅ `lib/ai/embeddings.ts` - vector operations

### 5.2 Document Chunking Pipeline ✅
**Completed:**
- ✅ `lib/ai/chunking.ts` - 500 token chunks with overlap
- ✅ Smart splitting respecting sentence boundaries
- ✅ Page number extraction and mapping
- ✅ Auto-chunking on classification

### 5.3 Embedding Generation ✅
**Completed:**
- ✅ OpenAI `text-embedding-3-small` (1536 dimensions)
- ✅ `storeChunksWithEmbeddings()` function
- ✅ Cost tracking per embedding
- ✅ Environment variable for model selection

### 5.4 Semantic Search API ✅
**Completed:**
- ✅ `/api/cases/[id]/search` endpoint
- ✅ `semanticSearch()` function with similarity threshold
- ✅ `/api/cases/[id]/embed-documents` for backfilling

### 📦 PHASE 5 DELIVERABLES ✅
- ✅ pgvector enabled in Supabase
- ✅ Document chunking pipeline
- ✅ Embedding generation integrated
- ✅ Semantic search API functional

**Tests Implementation (reference):**
```typescript
// tests/api/semantic-search.test.ts
describe('Semantic Search', () => {
  test('should return relevant chunks for query', async () => {
    const results = await searchCase(caseId, 'monthly income');

    expect(results.chunks.length).toBeGreaterThan(0);
    expect(results.chunks[0].similarity).toBeGreaterThan(0.3);
  });

  test('should include document references in results', async () => {
    const results = await searchCase(caseId, 'bank statement');

    results.chunks.forEach(chunk => {
      expect(chunk.documentId).toBeDefined();
      expect(chunk.documentName).toBeDefined();
    });
  });
});
```

---

## 💬 PHASE 6: Chat Interface ✅ COMPLETE
**Goal:** Case-specific AI legal assistant with document context

### 6.1 Chat Storage ✅
**Completed:**
- ✅ NEW `chats` table for conversation threads
- ✅ NEW `chat_messages` table for individual messages with sources
- ✅ Proper relational storage (replaces JSONB approach)
- ✅ Token usage tracking per message and per chat
- ✅ Cost tracking in cents

### 6.2 Chat API ✅
**Completed:**
- ✅ `POST /api/cases/[id]/chat` - streaming chat with SSE
- ✅ `GET /api/cases/[id]/chat` - list all chats for a case
- ✅ `GET /api/cases/[id]/chat?chatId=X` - get messages for specific chat
- ✅ `DELETE /api/cases/[id]/chat?chatId=X` - delete chat (cascades messages)
- ✅ RAG pipeline: query → semantic search → augment → generate
- ✅ GPT-5-mini with `max_completion_tokens` support
- ✅ Sources stored with each assistant message

### 6.3 Chat UI ✅
**Completed:**
- ✅ Chat history sidebar (collapsible, shows all chats)
- ✅ Switch between multiple chats per case
- ✅ Delete chats with confirmation
- ✅ Auto-generated chat titles from first message
- ✅ Relative timestamps ("5m ago", "2h ago")
- ✅ Clickable citation links `[Document: filename.pdf]` format
- ✅ Token usage/cost badge in header
- ✅ Source documents shown at bottom of assistant messages
- ✅ Real-time streaming responses
- ✅ Suggested questions for empty state

### 6.4 Tests ✅
**Completed:**
- ✅ 19 tests in `tests/chat/chat-api.test.ts`
- ✅ Citation parsing tests
- ✅ Token tracking tests
- ✅ Cost calculation tests
- ✅ UI helper function tests

### 📦 PHASE 6 DELIVERABLES ✅ ALL COMPLETE
- ✅ Multiple chats per case with proper database tables
- ✅ Chat history sidebar with switch/delete functionality
- ✅ Clickable citation links to source documents
- ✅ Token usage and cost displayed in UI
- ✅ Sources stored and displayed per message
- ✅ 19 tests passing
- ✅ Response time <5 seconds (streaming)

**Acceptance Criteria - All Met:**
- ✅ Attorney can create multiple chats per case
- ✅ Chat provides document-aware responses (full doc list + RAG)
- ✅ Citations link to source documents (clickable buttons)
- ✅ Chat history persists across sessions
- ✅ Response time <5 seconds (streaming)
- ✅ Token usage displayed in UI

**Deferred to Phase 11:**
- ❌ Web search integration for legal research

---

## 🔍 PHASE 7: Case Insights & Gap Detection
**Goal:** Proactive AI-driven case analysis and recommendations

### 7.1 Case Insights Panel (TDD)
**Tests First:**
- [ ] Classification summary calculation
- [ ] Needs review count
- [ ] Category breakdown
- [ ] Confidence visualization

**Implementation:**
- [ ] Insights aggregation API
- [ ] Classification summary component
- [ ] Category distribution chart
- [ ] Documents needing review list
- [ ] Average confidence indicator

**Tests Implementation:**
```typescript
// tests/api/case-insights.test.ts
describe('Case Insights', () => {
  test('should return classification summary', async () => {
    const insights = await getCaseInsights(caseId);

    expect(insights.totalDocuments).toBeDefined();
    expect(insights.classified).toBeDefined();
    expect(insights.needsReview).toBeDefined();
  });

  test('should calculate category breakdown', async () => {
    const insights = await getCaseInsights(caseId);

    expect(insights.byCategory.Financial).toBeDefined();
    expect(insights.byCategory.Legal).toBeDefined();
  });
});
```

### 7.2 Gap Detection (TDD)
**Tests First:**
- [ ] Expected document types for family law
- [ ] Missing document identification
- [ ] Date coverage gaps
- [ ] Recommendation generation

**Implementation:**
- [ ] Family law document checklist:
  - Financial: W-2s, Tax Returns, Bank Statements, Pay Stubs
  - Legal: Custody Agreement, Divorce Decree, Court Orders
  - Personal: Birth Certificates, Marriage Certificate
- [ ] Gap detection algorithm
- [ ] Missing document recommendations
- [ ] Date range coverage analysis
- [ ] Gap alerts component

**Tests Implementation:**
```typescript
// tests/ai/gap-detection.test.ts
describe('Gap Detection', () => {
  test('should identify missing document types', async () => {
    const gaps = await detectDocumentGaps(caseId);

    expect(gaps.missing).toContain('W-2 for 2023');
    expect(gaps.missing).toContain('Tax Return 2022');
  });

  test('should detect date coverage gaps', async () => {
    const gaps = await detectDocumentGaps(caseId);

    expect(gaps.dateGaps).toContain({
      type: 'Bank Statement',
      missingPeriod: 'March 2023 - May 2023'
    });
  });
});
```

### 7.3 Recommendations Engine (TDD)
**Tests First:**
- [ ] Next steps generation
- [ ] Priority ranking
- [ ] Context-aware suggestions

**Implementation:**
- [ ] AI-powered recommendations
- [ ] "Based on your documents, consider..."
- [ ] Discovery request suggestions
- [ ] Next steps for case preparation
- [ ] Recommendations component

### 📦 PHASE 7 DELIVERABLES
**Vercel Deployment:**
- ⬜ Case insights panel functional
- ⬜ Gap detection working
- ⬜ Recommendations displayed
- ⬜ All insights tests passing

**Acceptance Criteria:**
- [ ] Insights show real-time classification status
- [ ] Missing documents clearly identified
- [ ] Date gaps highlighted
- [ ] Actionable recommendations provided

**Code Coverage Target:** 85%+ for insights logic

---

## 📋 PHASE 8: Discovery Request Tracking
**Goal:** Track RFPs/Interrogatories and map documents

### 8.1 Discovery Request Management (TDD)
**Tests First:**
- [ ] Create discovery request tests
- [ ] Edit/delete request tests
- [ ] Bulk import tests
- [ ] Category hint tests

**Implementation:**
- [ ] Discovery request CRUD API
- [ ] Request creation form
- [ ] Request type (RFP vs Interrogatory)
- [ ] Request numbering system
- [ ] Bulk import from text/CSV
- [ ] Category hints for AI mapping

**Tests Implementation:**
```typescript
// tests/api/discovery-requests.test.ts
describe('Discovery Request Management', () => {
  test('should create RFP with category hint', async () => {
    const rfp = await createDiscoveryRequest({
      caseId,
      type: 'RFP',
      number: 12,
      text: 'All bank statements from January 2023 to present',
      categoryHint: 'Financial'
    });
    expect(rfp.id).toBeDefined();
  });

  test('should bulk import from text', async () => {
    const text = `RFP 1: All tax returns...
    RFP 2: All pay stubs...`;
    const result = await bulkImportRequests(caseId, text);
    expect(result.imported).toBe(2);
  });
});
```

### 8.2 AI Document Mapping (TDD)
**Tests First:**
- [ ] Document-to-request matching
- [ ] Confidence scoring
- [ ] Date range matching
- [ ] Semantic matching via embeddings

**Implementation:**
- [ ] RAG-based document matching
- [ ] Date range parser
- [ ] Confidence algorithm
- [ ] Suggested mappings API
- [ ] Manual mapping acceptance/rejection

### 8.3 Coverage Tracking UI (TDD)
**Implementation:**
- [ ] Discovery request list view
- [ ] Document mapping interface
- [ ] Coverage progress indicators
- [ ] Missing document warnings
- [ ] Completion status toggle

### 📦 PHASE 8 DELIVERABLES
- ⬜ Discovery request CRUD
- ⬜ AI-powered document mapping
- ⬜ Coverage tracking dashboard
- ⬜ All discovery tests passing

---

## 📊 PHASE 9: Timeline, Search & Export
**Goal:** Case timeline view, advanced search, and PDF export

### 9.1 Case Timeline (TDD)
- [ ] Timeline data aggregation API
- [ ] Chronological sorting by document date
- [ ] Filter by category
- [ ] Date range picker
- [ ] Timeline UI component

### 9.2 Advanced Search (TDD)
- [ ] Full-text search (Postgres)
- [ ] Semantic search (pgvector)
- [ ] Combined search with filters
- [ ] Search results UI with relevance

### 9.3 PDF Export System (TDD)
- [ ] Export by category
- [ ] Export by discovery request
- [ ] Cover page with case info
- [ ] Table of contents
- [ ] Background job for large exports

### 📦 PHASE 9 DELIVERABLES
- ⬜ Timeline view functional
- ⬜ Search working (full-text + semantic)
- ⬜ PDF export both modes
- ⬜ All export tests passing

---

## 💳 PHASE 10: Stripe Payments & Trials
**Goal:** Subscription billing with 14-day free trial

### 10.1 Stripe Integration (TDD)
- [ ] Checkout session creation
- [ ] Subscription management
- [ ] Webhook handling
- [ ] Trial period logic (14 days)
- [ ] Customer portal

### 10.2 Usage Tracking (TDD)
- [ ] Document processing counter
- [ ] AI token usage tracking
- [ ] Monthly reset cron
- [ ] Usage limits enforcement
- [ ] Overage alerts

### 10.3 Pricing Pages (TDD)
- [ ] Public pricing page
- [ ] Plan comparison table
- [ ] Trial messaging

### 📦 PHASE 10 DELIVERABLES
- ⬜ Stripe fully integrated
- ⬜ 14-day trial working
- ⬜ Usage limits enforced
- ⬜ All payment tests passing

---

## 🚀 PHASE 11: Advanced Legal Assistant
**Goal:** Drafting and deep analysis capabilities

### 11.1 Document Drafting (TDD)
- [ ] Discovery request generation
- [ ] Timeline narrative generation
- [ ] Summary generation
- [ ] Export conversations as case notes

### 11.2 Deep Analysis (TDD)
- [ ] Multi-document comparison
- [ ] Discrepancy detection
- [ ] Asset tracking across documents
- [ ] Income verification

### 11.3 Legal Research (TDD)
- [ ] Web search integration
- [ ] State-specific statute lookups
- [ ] Citation formatting
- [ ] Research history

### 📦 PHASE 11 DELIVERABLES
- ⬜ Drafting capabilities
- ⬜ Deep analysis features
- ⬜ Legal research tools
- ⬜ All advanced tests passing

---

## 🎯 PHASE 12: Production Launch
**Goal:** Production-ready deployment on Vercel

### 12.1 Performance Optimization
- [ ] Page load <3s
- [ ] API response <500ms
- [ ] Database query optimization
- [ ] CDN configuration

### 12.2 Security Audit
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Rate limiting
- [ ] Dependency audit

### 12.3 Monitoring & Logging
- [ ] Sentry error tracking
- [ ] Vercel Analytics
- [ ] Uptime monitoring
- [ ] Structured logging

### 12.4 Documentation
- [ ] User onboarding flow
- [ ] In-app help
- [ ] API documentation
- [ ] Knowledge base

### 📦 PHASE 12 DELIVERABLES
- ⬜ Production deployed
- ⬜ 99.9% uptime
- ⬜ Security audit passed
- ⬜ Monitoring active
- ⬜ Documentation complete

---

## 📈 Success Metrics

| Phase | Key Metrics |
|-------|-------------|
| Phase 4 | Auto-classify within 2 min for 10 docs |
| Phase 5 | Semantic search <2s response |
| Phase 6 | Chat response <5s with citations |
| Phase 7 | Gap detection accuracy >85% |
| Phase 8 | Document mapping accuracy >80% |
| Phase 9 | Export <3 min for 500 pages |
| Phase 10 | 0 failed payment captures |
| Phase 11 | Draft quality rating >4/5 |
| Phase 12 | 99.9% uptime, <100ms p95 latency |

---

## 🛠️ Technology Stack

**Core:**
- Next.js 15 (App Router)
- TypeScript
- Supabase (PostgreSQL + pgvector + Storage)
- Clerk (Authentication)
- Vercel (Hosting + Cron)

**AI/ML:**
- OpenAI GPT-5 family (classification, chat)
- OpenAI text-embedding-3-large (RAG)
- pgvector (vector storage)

**UI:**
- Tailwind CSS
- shadcn/ui components
- React Query (data fetching)

**Integrations:**
- Dropbox API (OAuth + file sync)
- Stripe (payments)

---

## 📞 Resources

- [OpenAI GPT-5 Docs](https://platform.openai.com/docs/models/gpt-5)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [unpdf (serverless PDF)](https://github.com/unjs/unpdf)

---

**Timeline Summary:**
- **Phase 1-3:** Foundation (Complete) ✅
- **Phase 4-6:** AI Assistant & RAG (4-5 weeks)
- **Phase 7-9:** Insights & Discovery (3-4 weeks)
- **Phase 10-12:** Payments & Launch (3-4 weeks)

**Total: 12-14 Weeks to Production**

---

**Ready to start Phase 4: Auto-Classification!** 🚀
