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
| 4 | Auto-Classification & Model Config | 🔄 NEXT | Background processing, env-driven models |
| 5 | Document Intelligence (RAG) | ⏳ PLANNED | pgvector, embeddings, semantic search |
| 6 | Chat Interface | ⏳ PLANNED | Legal assistant, case page redesign |
| 7 | Case Insights & Gap Detection | ⏳ PLANNED | Missing docs, recommendations |
| 8 | Discovery Request Tracking | ⏳ PLANNED | RFPs, document mapping |
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

## ⚡ PHASE 4: Auto-Classification & Configurable Models 🔄 NEXT
**Goal:** Automatic classification on sync, environment-driven model selection

### 4.1 Environment-Driven Model Configuration (TDD)
**Tests First:**
- [ ] Model selection from environment variables
- [ ] Fallback to defaults when env not set
- [ ] Different models for different use cases

**Implementation:**
- [ ] Add environment variables:
  ```env
  OPENAI_MODEL_CLASSIFICATION=gpt-5-nano
  OPENAI_MODEL_CHAT=gpt-5-mini
  OPENAI_MODEL_EMBEDDING=text-embedding-3-large
  ```
- [ ] Update `lib/ai/openai.ts` to use `process.env`
- [ ] Model configuration utility with defaults
- [ ] Cost calculation per model

**Tests Implementation:**
```typescript
// tests/ai/model-config.test.ts
describe('Model Configuration', () => {
  test('should use env variable for classification model', () => {
    process.env.OPENAI_MODEL_CLASSIFICATION = 'gpt-5-nano';
    const model = getClassificationModel();
    expect(model).toBe('gpt-5-nano');
  });

  test('should fallback to default when env not set', () => {
    delete process.env.OPENAI_MODEL_CLASSIFICATION;
    const model = getClassificationModel();
    expect(model).toBe('gpt-4o-mini'); // Default
  });
});
```

### 4.2 Document Processing Queue (TDD)
**Tests First:**
- [ ] Queue insertion on document creation
- [ ] Status transitions (pending → processing → complete)
- [ ] Error handling and retry logic
- [ ] Concurrent processing limits

**Implementation:**
- [ ] Create `document_processing_queue` table:
  ```sql
  CREATE TABLE document_processing_queue (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
  );
  ```
- [ ] Queue service for document processing
- [ ] Status update functions
- [ ] Retry logic with exponential backoff

**Tests Implementation:**
```typescript
// tests/queue/document-processing.test.ts
describe('Document Processing Queue', () => {
  test('should add document to queue on sync', async () => {
    const doc = await createDocument(caseId, fileData);
    const queueItem = await getQueueItem(doc.id);
    expect(queueItem.status).toBe('pending');
  });

  test('should process pending documents', async () => {
    await processNextInQueue();
    const queueItem = await getQueueItem(docId);
    expect(queueItem.status).toBe('completed');
  });

  test('should retry failed documents up to 3 times', async () => {
    // Mock classification failure
    await processNextInQueue();
    const queueItem = await getQueueItem(docId);
    expect(queueItem.attempts).toBeLessThanOrEqual(3);
  });
});
```

### 4.3 Background Processing with Vercel Cron (TDD)
**Tests First:**
- [ ] Cron job triggers processing
- [ ] Batch processing limits
- [ ] Timeout handling
- [ ] Progress tracking

**Implementation:**
- [ ] Create `/api/cron/process-documents` endpoint
- [ ] Configure `vercel.json` for cron:
  ```json
  {
    "crons": [{
      "path": "/api/cron/process-documents",
      "schedule": "* * * * *"
    }]
  }
  ```
- [ ] Batch processing (max 5 docs per run)
- [ ] 55-second timeout safety
- [ ] Status endpoint for monitoring

**Tests Implementation:**
```typescript
// tests/cron/process-documents.test.ts
describe('Document Processing Cron', () => {
  test('should process up to 5 documents per run', async () => {
    // Add 10 documents to queue
    await seedQueue(10);

    const result = await processCronJob();
    expect(result.processed).toBeLessThanOrEqual(5);
  });

  test('should respect timeout limits', async () => {
    const startTime = Date.now();
    await processCronJob();
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(55000);
  });
});
```

### 4.4 Sync Flow Integration (TDD)
**Tests First:**
- [ ] Sync adds documents to queue
- [ ] UI shows processing status
- [ ] Real-time status updates

**Implementation:**
- [ ] Update sync endpoint to queue documents
- [ ] Add processing status to documents API
- [ ] Create status polling endpoint
- [ ] UI indicators: "Synced 12 files, classifying..."
- [ ] Progress component with document count

**Tests Implementation:**
```typescript
// tests/api/sync-with-queue.test.ts
describe('Sync with Auto-Classification', () => {
  test('should queue documents for classification after sync', async () => {
    const result = await syncDropboxFolder(caseId);

    const pendingDocs = await getQueuedDocuments(caseId);
    expect(pendingDocs.length).toBe(result.filesNew);
  });

  test('should return processing status in API response', async () => {
    const caseData = await getCase(caseId);
    expect(caseData.processingStatus).toEqual({
      total: 12,
      pending: 5,
      processing: 1,
      completed: 6
    });
  });
});
```

### 📦 PHASE 4 DELIVERABLES
**Vercel Deployment:**
- ⬜ Environment-driven model selection
- ⬜ Document processing queue functional
- ⬜ Vercel Cron job running every minute
- ⬜ Auto-classification on sync
- ⬜ Real-time processing status in UI
- ⬜ All tests passing

**Acceptance Criteria:**
- [ ] Models configurable via environment variables
- [ ] Documents auto-classify after Dropbox sync
- [ ] Processing happens in background (no timeout)
- [ ] UI shows "Classifying X/Y documents..."
- [ ] Failed classifications retry automatically
- [ ] Classification completes within 2 minutes for 10 docs

**Code Coverage Target:** 90%+ for queue and processing logic

---

## 🧠 PHASE 5: Document Intelligence (RAG Foundation)
**Goal:** Semantic search and document understanding via embeddings

### 5.1 pgvector Setup (TDD)
**Tests First:**
- [ ] Vector extension enabled
- [ ] Vector column operations
- [ ] Similarity search queries
- [ ] Index performance

**Implementation:**
- [ ] Enable pgvector extension in Supabase
- [ ] Create `document_chunks` table:
  ```sql
  CREATE TABLE document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    case_id UUID REFERENCES cases(id),
    chunk_index INTEGER,
    content TEXT,
    embedding vector(3072), -- text-embedding-3-large dimensions
    metadata JSONB, -- page number, section, etc.
    created_at TIMESTAMP
  );

  CREATE INDEX ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
  ```
- [ ] Vector similarity search function
- [ ] Embedding storage utilities

**Tests Implementation:**
```typescript
// tests/db/pgvector.test.ts
describe('pgvector Setup', () => {
  test('should store embeddings in vector column', async () => {
    const embedding = new Array(3072).fill(0.1);
    const chunk = await createChunk(docId, 'test content', embedding);
    expect(chunk.embedding.length).toBe(3072);
  });

  test('should find similar chunks by vector similarity', async () => {
    const queryEmbedding = await generateEmbedding('bank statement');
    const similar = await findSimilarChunks(caseId, queryEmbedding, 5);
    expect(similar.length).toBeLessThanOrEqual(5);
  });
});
```

### 5.2 Document Chunking Pipeline (TDD)
**Tests First:**
- [ ] Text splitting by paragraphs
- [ ] Chunk size limits (~500 tokens)
- [ ] Metadata preservation
- [ ] Overlap handling

**Implementation:**
- [ ] Chunking service with configurable size
- [ ] Smart splitting (respect sentence boundaries)
- [ ] Metadata extraction (page numbers, headers)
- [ ] Add chunking to processing queue:
  - classify → chunk → embed
- [ ] Chunk storage in database

**Tests Implementation:**
```typescript
// tests/ai/chunking.test.ts
describe('Document Chunking', () => {
  test('should split document into ~500 token chunks', async () => {
    const text = 'Long document text...'.repeat(1000);
    const chunks = await chunkDocument(text);

    chunks.forEach(chunk => {
      expect(countTokens(chunk.content)).toBeLessThanOrEqual(600);
    });
  });

  test('should preserve paragraph boundaries', async () => {
    const text = 'Paragraph 1.\n\nParagraph 2.';
    const chunks = await chunkDocument(text);

    // Should not split mid-paragraph if possible
    expect(chunks[0].content).toContain('Paragraph 1.');
  });
});
```

### 5.3 Embedding Generation (TDD)
**Tests First:**
- [ ] OpenAI embedding API integration
- [ ] Batch embedding for efficiency
- [ ] Error handling and retries
- [ ] Cost tracking

**Implementation:**
- [ ] OpenAI embeddings service (`text-embedding-3-large`)
- [ ] Batch processing (max 100 chunks per request)
- [ ] Embedding queue integration
- [ ] Cost tracking per embedding
- [ ] Environment variable for model selection

**Tests Implementation:**
```typescript
// tests/ai/embeddings.test.ts
describe('Embedding Generation', () => {
  test('should generate embeddings for chunk', async () => {
    const embedding = await generateEmbedding('test content');
    expect(embedding.length).toBe(3072);
  });

  test('should batch embed multiple chunks', async () => {
    const chunks = ['chunk 1', 'chunk 2', 'chunk 3'];
    const embeddings = await batchGenerateEmbeddings(chunks);
    expect(embeddings.length).toBe(3);
  });

  test('should track embedding costs', async () => {
    const result = await generateEmbedding('test');
    expect(result.tokensUsed).toBeGreaterThan(0);
  });
});
```

### 5.4 Semantic Search API (TDD)
**Tests First:**
- [ ] Query embedding generation
- [ ] Vector similarity search
- [ ] Result ranking
- [ ] Filtering by case/document

**Implementation:**
- [ ] `/api/cases/[id]/search` endpoint
- [ ] Query → embed → search → rank
- [ ] Return chunks with document references
- [ ] Filter options (category, date range)
- [ ] Relevance scoring

**Tests Implementation:**
```typescript
// tests/api/semantic-search.test.ts
describe('Semantic Search', () => {
  test('should return relevant chunks for query', async () => {
    const results = await searchCase(caseId, 'monthly income');

    expect(results.chunks.length).toBeGreaterThan(0);
    expect(results.chunks[0].similarity).toBeGreaterThan(0.7);
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

### 📦 PHASE 5 DELIVERABLES
**Vercel Deployment:**
- ⬜ pgvector enabled in Supabase
- ⬜ Document chunking pipeline
- ⬜ Embedding generation integrated
- ⬜ Semantic search API functional
- ⬜ All RAG tests passing

**Acceptance Criteria:**
- [ ] Documents chunked on classification complete
- [ ] Embeddings generated for all chunks
- [ ] Semantic search returns relevant results
- [ ] Search response time <2 seconds
- [ ] Embedding cost tracked per document

**Code Coverage Target:** 90%+ for RAG logic

---

## 💬 PHASE 6: Chat Interface
**Goal:** Case-specific AI legal assistant with document context

### 6.1 Chat Database Schema (TDD)
**Tests First:**
- [ ] Chat creation tests
- [ ] Message storage tests
- [ ] Chat-case relationship tests
- [ ] Message ordering tests

**Implementation:**
- [ ] Create `chats` table:
  ```sql
  CREATE TABLE chats (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Create `chat_messages` table:
  ```sql
  CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    sources JSONB, -- [{documentId, chunkId, excerpt}]
    tokens_used INTEGER,
    model TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] RLS policies for chat access
- [ ] Indexes for performance

**Tests Implementation:**
```typescript
// tests/db/chat-schema.test.ts
describe('Chat Schema', () => {
  test('should create chat for case', async () => {
    const chat = await createChat(caseId, userId, 'Financial Analysis');
    expect(chat.id).toBeDefined();
    expect(chat.caseId).toBe(caseId);
  });

  test('should store message with sources', async () => {
    const message = await addMessage(chatId, 'assistant', 'Based on...', {
      sources: [{ documentId: 'doc1', excerpt: 'excerpt...' }]
    });
    expect(message.sources.length).toBe(1);
  });
});
```

### 6.2 Chat API (TDD)
**Tests First:**
- [ ] Create chat endpoint
- [ ] List chats endpoint
- [ ] Send message endpoint
- [ ] RAG integration tests
- [ ] Web search integration tests

**Implementation:**
- [ ] `POST /api/cases/[id]/chats` - create new chat
- [ ] `GET /api/cases/[id]/chats` - list chats for case
- [ ] `GET /api/chats/[chatId]` - get chat with messages
- [ ] `POST /api/chats/[chatId]/messages` - send message
- [ ] RAG pipeline: query → search → augment → generate
- [ ] Web search toggle for legal research
- [ ] Streaming responses

**Tests Implementation:**
```typescript
// tests/api/chat.test.ts
describe('Chat API', () => {
  test('should create new chat for case', async () => {
    const response = await POST('/api/cases/123/chats', {
      title: 'Document Analysis'
    });
    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
  });

  test('should send message and receive AI response', async () => {
    const response = await POST('/api/chats/456/messages', {
      content: 'What income is shown in the bank statements?'
    });

    expect(response.body.role).toBe('assistant');
    expect(response.body.content).toBeDefined();
    expect(response.body.sources).toBeDefined();
  });

  test('should include document citations in response', async () => {
    const response = await POST('/api/chats/456/messages', {
      content: 'Summarize the custody agreement'
    });

    expect(response.body.sources.length).toBeGreaterThan(0);
    expect(response.body.sources[0].documentName).toBeDefined();
  });
});
```

### 6.3 Case Page Redesign (TDD)
**Goal:** Dashboard-style case page with AI assistant as primary feature

**Layout Design:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Case: Smith v. Smith                              [Settings] [Sync]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ ⚡ Legal Assistant      │  │ 📊 Case Insights                │  │
│  │    GPT-5-mini • 8/10    │  │                                 │  │
│  │                         │  │  Documents: 12 classified       │  │
│  │  [Chat messages...]     │  │  ⚠️ 3 need review               │  │
│  │                         │  │                                 │  │
│  │  ┌──────────────────┐   │  │  Categories breakdown...        │  │
│  │  │ Ask anything...  │   │  │                                 │  │
│  │  │ 🔍 Search  📎    │   │  │  Missing: W-2 2023, Tax 2022   │  │
│  │  └──────────────────┘   │  └─────────────────────────────────┘  │
│  └─────────────────────────┘                                        │
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ 📁 Recent Documents     │  │ ✅ Tasks                        │  │
│  │  [Document list...]     │  │  [Task checklist...]            │  │
│  └─────────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Tests First:**
- [ ] Case page layout rendering
- [ ] Chat widget integration
- [ ] Insights panel data
- [ ] Documents panel data
- [ ] Responsive design

**Implementation:**
- [ ] New case page layout with CSS Grid
- [ ] Legal Assistant panel component
- [ ] Case Insights panel component
- [ ] Recent Documents panel component
- [ ] Tasks panel component (placeholder)
- [ ] Panel state management

**Tests Implementation:**
```typescript
// tests/pages/case-dashboard.test.tsx
describe('Case Dashboard', () => {
  test('should render all panels', async () => {
    render(<CaseDashboard caseId="123" />);

    expect(screen.getByText('Legal Assistant')).toBeInTheDocument();
    expect(screen.getByText('Case Insights')).toBeInTheDocument();
    expect(screen.getByText('Recent Documents')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  test('should display chat history in assistant panel', async () => {
    render(<CaseDashboard caseId="123" />);

    const chatMessages = await screen.findAllByTestId('chat-message');
    expect(chatMessages.length).toBeGreaterThan(0);
  });
});
```

### 6.4 Chat UI Components (TDD)
**Tests First:**
- [ ] Message display tests
- [ ] Input handling tests
- [ ] Streaming response tests
- [ ] Citation display tests
- [ ] Web search toggle tests

**Implementation:**
- [ ] ChatPanel component (main container)
- [ ] MessageList component (scrollable history)
- [ ] MessageBubble component (user/assistant)
- [ ] ChatInput component with actions
- [ ] SourceCitation component
- [ ] WebSearchToggle component
- [ ] ChatHistory sidebar (switch conversations)
- [ ] NewChatButton component
- [ ] TokenUsage indicator

**Tests Implementation:**
```typescript
// tests/components/chat.test.tsx
describe('Chat Components', () => {
  test('should display user and assistant messages', () => {
    render(<MessageList messages={mockMessages} />);

    expect(screen.getByText('User question')).toBeInTheDocument();
    expect(screen.getByText('AI response')).toBeInTheDocument();
  });

  test('should show document citations', () => {
    render(<MessageBubble message={messageWithSources} />);

    expect(screen.getByText('Sources:')).toBeInTheDocument();
    expect(screen.getByText('bank_statement.pdf')).toBeInTheDocument();
  });

  test('should toggle web search mode', async () => {
    render(<ChatInput onSend={mockSend} />);

    await userEvent.click(screen.getByText('Search'));
    expect(screen.getByTestId('web-search-enabled')).toBeInTheDocument();
  });
});
```

### 📦 PHASE 6 DELIVERABLES
**Vercel Deployment:**
- ⬜ Chat database schema migrated
- ⬜ Chat API endpoints functional
- ⬜ Case page redesigned with panels
- ⬜ Chat widget fully functional
- ⬜ RAG-powered responses with citations
- ⬜ Web search integration
- ⬜ All chat tests passing

**Acceptance Criteria:**
- [ ] Attorney can create multiple chats per case
- [ ] Chat provides document-aware responses
- [ ] Citations link to source documents
- [ ] Web search available for legal research
- [ ] Chat history persists across sessions
- [ ] Response time <5 seconds
- [ ] Token usage displayed

**Code Coverage Target:** 85%+ for chat components and API

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
