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
| 7 | Case Insights & Gap Detection | ✅ COMPLETE | Missing docs, recommendations |
| 8 | Discovery Request Tracking | ✅ COMPLETE | CRUD, AI mapping, coverage tracking |
| 9 | Timeline, Search & Export | ✅ COMPLETE | Chronological view, PDF export |
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

## 🔍 PHASE 7: Case Insights & Gap Detection ✅ COMPLETE
**Goal:** Proactive AI-driven case analysis and recommendations

### 7.1 Case Insights Panel ✅
**Completed:**
- ✅ Classification summary calculation
- ✅ Needs review count
- ✅ Category breakdown
- ✅ Confidence visualization (high/medium/low distribution)
- ✅ Insights aggregation API (`/api/cases/[id]/insights`)
- ✅ Classification summary component
- ✅ Category distribution with progress bars
- ✅ Documents needing review list (clickable)
- ✅ Average confidence indicator

### 7.2 Gap Detection ✅
**Completed:**
- ✅ Family law document checklist (`FAMILY_LAW_DOCUMENT_CHECKLIST`)
- ✅ Missing document identification with priority levels
- ✅ Date coverage gap detection (60+ day gaps)
- ✅ Recommendation generation based on gaps
- ✅ Gap detection algorithm (`lib/ai/gap-detection.ts`)
- ✅ Missing document alerts (orange card)
- ✅ Date gap alerts (yellow card)
- ✅ Category scores with completion percentage

**Document Categories Covered:**
- Financial: Tax Returns, W-2s, Bank Statements, Pay Stubs, Credit Cards
- Legal: Marriage Certificate, Prenuptial Agreement, Court Orders
- Property: Deeds, Mortgage Statements, Vehicle Titles
- Personal: ID, Birth Certificates, Passports
- Employment: Contracts, Benefits, Stock Options
- Medical: Records, Insurance, Bills

### 7.3 Recommendations Engine ✅
**Completed:**
- ✅ Priority-based recommendations
- ✅ Context-aware suggestions based on missing docs
- ✅ Date gap fill recommendations
- ✅ Financial completeness checks
- ✅ Recommendations component in UI

### 📦 PHASE 7 DELIVERABLES ✅ ALL COMPLETE
**Vercel Deployment:**
- ✅ Case insights panel functional
- ✅ Gap detection working
- ✅ Recommendations displayed
- ✅ All insights tests passing (13 tests)

**Acceptance Criteria - All Met:**
- ✅ Insights show real-time classification status
- ✅ Missing documents clearly identified with priorities
- ✅ Date gaps highlighted with periods
- ✅ Actionable recommendations provided
- ✅ Case completeness score (0-100%)

**Files Implemented:**
- `components/insights/case-insights-panel.tsx` - Full UI component
- `app/api/cases/[id]/insights/route.ts` - Insights API
- `lib/ai/gap-detection.ts` - Gap detection algorithm
- `tests/insights/gap-detection.test.ts` - 13 tests passing

---

## 📋 PHASE 8: Discovery Request Tracking ✅ COMPLETE
**Goal:** Track RFPs/Interrogatories and map documents

### Current Status
- ✅ Database schema exists (`discovery_requests` and `document_request_mappings` tables)
- ✅ CRUD API complete (`/api/cases/[id]/discovery/*`)
- ✅ Bulk Import (`/api/cases/[id]/discovery/import`)
- ✅ AI Document Mapping with RAG (`/api/cases/[id]/discovery/[requestId]/suggest`)
- ✅ Coverage Tracking UI (`/dashboard/cases/[id]/discovery`)

### 8.1 Discovery Request Management (TDD)
**Tests First:**
- [ ] Create discovery request tests
- [ ] Edit/delete request tests
- [ ] List requests by case tests
- [ ] Bulk import tests
- [ ] Category hint tests

**Implementation:**
- [ ] `GET /api/cases/[id]/discovery` - List requests
- [ ] `POST /api/cases/[id]/discovery` - Create request
- [ ] `PUT /api/cases/[id]/discovery/[requestId]` - Update request
- [ ] `DELETE /api/cases/[id]/discovery/[requestId]` - Delete request
- [ ] `POST /api/cases/[id]/discovery/import` - Bulk import
- [ ] Request type (RFP vs Interrogatory)
- [ ] Request numbering system
- [ ] Category hints for AI mapping

### 8.2 AI Document Mapping (TDD)
**Tests First:**
- [ ] Document-to-request matching
- [ ] Confidence scoring
- [ ] Date range matching
- [ ] Semantic matching via embeddings

**Implementation:**
- [ ] `document_request_mappings` table for mappings
- [ ] `POST /api/cases/[id]/discovery/[requestId]/suggest` - AI suggestions
- [ ] `POST /api/cases/[id]/discovery/[requestId]/map` - Manual mapping
- [ ] RAG-based document matching using embeddings
- [ ] Date range parser for temporal matching
- [ ] Confidence algorithm combining semantic + metadata
- [ ] Accept/reject suggested mappings

### 8.3 Coverage Tracking UI (TDD)
**Implementation:**
- [ ] Discovery request list page (`/dashboard/cases/[id]/discovery`)
- [ ] Create/edit request modal
- [ ] Document mapping interface (drag-drop or select)
- [ ] Coverage progress indicators (per request)
- [ ] Overall case discovery progress
- [ ] Missing document warnings
- [ ] Completion status toggle
- [ ] Export discovery response summary

### 📦 PHASE 8 DELIVERABLES
- ✅ Discovery request CRUD API
- ✅ Bulk import from text/CSV
- ✅ AI-powered document mapping
- ✅ Coverage tracking dashboard
- ✅ 14 unit tests passing (category detection, parsing)

**Acceptance Criteria:**
- ✅ Attorney can create/edit/delete discovery requests
- ✅ Bulk import parses RFP/Interrogatory text
- ✅ AI suggests relevant documents for each request
- ✅ Coverage percentage shown per request
- ⬜ Export discovery response list (deferred to Phase 9)

**Files Implemented:**
- `lib/discovery/requests.ts` - CRUD operations
- `lib/discovery/bulk-import.ts` - Text/CSV parsing
- `lib/discovery/category-detection.ts` - Auto-categorization
- `lib/discovery/date-parser.ts` - Date range extraction
- `lib/discovery/document-mapping.ts` - AI mapping logic
- `lib/discovery/semantic-matching.ts` - Embedding-based matching
- `app/api/cases/[id]/discovery/*` - All API routes
- `app/dashboard/cases/[id]/discovery/page.tsx` - Full UI
- `tests/discovery/*.test.ts` - TDD tests

---

## 📊 PHASE 9: Timeline, Search & Export ✅ COMPLETE
**Goal:** Case timeline view, advanced search, and PDF export

### 9.1 Case Timeline ✅
**Completed:**
- ✅ Timeline data aggregation API (`GET /api/cases/:id/timeline`)
- ✅ Chronological sorting by document date
- ✅ Date extraction from document, metadata, or upload date
- ✅ Filter by category and date range
- ✅ Date gap detection (60+ day gaps)
- ✅ Group by month with expandable sections
- ✅ Timeline UI page (`/dashboard/cases/[id]/timeline`)

### 9.2 Advanced Search ✅
**Completed:**
- ✅ Full-text search using ILIKE (filename + content)
- ✅ Semantic search via pgvector embeddings
- ✅ Hybrid mode combining both search methods
- ✅ Relevance scoring with match type indicators
- ✅ Snippet extraction with keyword highlights
- ✅ Filter by category and confidence
- ✅ Search UI page (`/dashboard/cases/[id]/search`)
- ✅ API: `POST /api/cases/:id/search/advanced`

### 9.3 PDF Export System ✅
**Completed:**
- ✅ Export by category selection
- ✅ Export by discovery request
- ✅ Export full timeline (chronological)
- ✅ Export job queue with `export_jobs` table
- ✅ Progress tracking for long exports
- ✅ Cover page generation
- ✅ Table of contents generation
- ✅ Export options: groupBy, sortBy, sortOrder
- ✅ Export UI page (`/dashboard/cases/[id]/export`)
- ✅ APIs: `POST /export/category`, `/export/discovery`, `/export/timeline`
- ✅ Job status: `GET /export/:jobId`
- ✅ Download: `GET /export/:jobId/download`

### 📦 PHASE 9 DELIVERABLES ✅ ALL COMPLETE
- ✅ Timeline view functional with filtering
- ✅ Search working (full-text + semantic + hybrid)
- ✅ PDF export system with job tracking
- ✅ All TDD tests written

**Files Implemented:**
- `lib/timeline/timeline.ts` - Timeline data aggregation
- `lib/search/search-utils.ts` - Search helper functions
- `lib/export/pdf-utils.ts` - PDF generation utilities
- `lib/export/export-service.ts` - Export job management
- `db/schema/export-jobs-schema.ts` - Export jobs table
- `app/api/cases/[id]/timeline/route.ts` - Timeline API
- `app/api/cases/[id]/search/advanced/route.ts` - Search API
- `app/api/cases/[id]/export/*` - Export APIs
- `app/dashboard/cases/[id]/timeline/page.tsx` - Timeline UI
- `app/dashboard/cases/[id]/search/page.tsx` - Search UI
- `app/dashboard/cases/[id]/export/page.tsx` - Export UI
- `tests/timeline/*.test.ts` - TDD tests
- `tests/search/*.test.ts` - TDD tests
- `tests/export/*.test.ts` - TDD tests

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
