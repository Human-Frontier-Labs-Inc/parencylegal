# Parency Lawyer App - TDD Phase Implementation Plan
**Target: Production on Vercel in 8-10 Weeks**

## Overview
This plan uses Test-Driven Development (TDD) methodology where tests are written BEFORE implementation. Each phase has clear deliverables, acceptance criteria, and a working deployment to Vercel staging/production.

---

## 🏗️ PHASE 1: Database Foundation & Auth (Week 1-2)
**Goal:** Production-ready database schema with authentication

### Test-Driven Approach
```
RED → GREEN → REFACTOR
Write failing tests → Make tests pass → Optimize code
```

### 1.1 Database Schema (TDD)
**Tests First:**
- [ ] Schema validation tests (correct tables, columns, constraints)
- [ ] Row Level Security (RLS) policy tests
- [ ] Foreign key constraint tests
- [ ] Index performance tests
- [ ] Data integrity tests

**Implementation:**
- [ ] `cases` table with Dropbox folder mapping
- [ ] `documents` table with classification fields
- [ ] `discovery_requests` table (RFPs/Interrogatories)
- [ ] `document_request_mappings` table
- [ ] `ai_chat_sessions` table for persistent conversations
- [ ] `ai_classifications` table for document analysis results
- [ ] Supabase RLS policies for multi-tenancy
- [ ] Database migration scripts

**Tests Implementation:**
```typescript
// tests/db/schema.test.ts
describe('Database Schema', () => {
  test('should create cases table with required fields', async () => {
    // Test table structure
  });

  test('should enforce RLS policies per user', async () => {
    // Test security
  });

  test('should cascade delete related documents when case deleted', async () => {
    // Test relationships
  });
});
```

### 1.2 Authentication System (TDD)
**Tests First:**
- [ ] User registration flow tests
- [ ] Login/logout tests
- [ ] Session persistence tests
- [ ] Protected route tests
- [ ] Role-based access control tests

**Implementation:**
- [ ] Supabase Auth integration
- [ ] Email/password authentication
- [ ] Protected API routes middleware
- [ ] User profile management
- [ ] Auth context/hooks for client-side

**Tests Implementation:**
```typescript
// tests/auth/auth.test.ts
describe('Authentication', () => {
  test('should register new attorney account', async () => {
    const result = await registerUser(mockAttorney);
    expect(result.user).toBeDefined();
  });

  test('should protect dashboard routes', async () => {
    const response = await fetch('/dashboard');
    expect(response.status).toBe(401);
  });
});
```

### 📦 PHASE 1 DELIVERABLES
**Vercel Deployment:**
- ✅ Database fully migrated on Supabase production
- ✅ Auth system working (register/login)
- ✅ Protected routes enforced
- ✅ All database tests passing (100% coverage)
- ✅ All auth tests passing (100% coverage)
- ✅ Deployed to Vercel staging environment

**Acceptance Criteria:**
- [ ] Attorney can register an account
- [ ] Attorney can log in and access protected dashboard
- [ ] Database schema matches PRD requirements
- [ ] RLS policies prevent cross-user data access
- [ ] CI/CD pipeline runs all tests on push

**Code Coverage Target:** 100% for database utilities and auth flows

---

## 🔗 PHASE 2: Dropbox Integration (Week 2-3)
**Goal:** Attorneys can connect Dropbox and map case folders

### 2.1 Dropbox OAuth (TDD)
**Tests First:**
- [ ] OAuth flow integration tests
- [ ] Token storage/retrieval tests
- [ ] Token refresh mechanism tests
- [ ] OAuth error handling tests
- [ ] Disconnection flow tests

**Implementation:**
- [ ] Auth.js Dropbox provider configuration
- [ ] OAuth callback route with PKCE
- [ ] Encrypted token storage in Supabase
- [ ] Token refresh background job
- [ ] Dropbox connection status UI

**Tests Implementation:**
```typescript
// tests/integrations/dropbox-oauth.test.ts
describe('Dropbox OAuth', () => {
  test('should complete OAuth flow and store tokens', async () => {
    const tokens = await completeDropboxOAuth(mockAuthCode);
    expect(tokens.access_token).toBeDefined();
    expect(tokens.refresh_token).toBeDefined();
  });

  test('should refresh expired tokens automatically', async () => {
    const newToken = await refreshDropboxToken(expiredToken);
    expect(newToken).toBeDefined();
  });
});
```

### 2.2 Case-to-Folder Mapping (TDD)
**Tests First:**
- [ ] Folder browsing API tests
- [ ] Case creation with folder mapping tests
- [ ] Folder re-mapping tests
- [ ] Validation tests (folder exists, permissions)

**Implementation:**
- [ ] Dropbox SDK integration
- [ ] Folder browser UI component (shadcn)
- [ ] Case creation form with Dropbox picker
- [ ] API routes for folder operations
- [ ] Database updates for folder path storage

**Tests Implementation:**
```typescript
// tests/api/case-folder-mapping.test.ts
describe('Case Folder Mapping', () => {
  test('should list Dropbox folders for attorney', async () => {
    const folders = await listDropboxFolders(userId);
    expect(folders.length).toBeGreaterThan(0);
  });

  test('should create case with Dropbox folder mapping', async () => {
    const caseData = await createCase({
      name: 'Smith v. Smith',
      dropbox_folder_path: '/Clients/Smith'
    });
    expect(caseData.dropbox_folder_path).toBe('/Clients/Smith');
  });
});
```

### 2.3 Manual File Sync (TDD)
**Tests First:**
- [ ] File listing from Dropbox tests
- [ ] Duplicate detection tests
- [ ] File download/storage tests
- [ ] Sync status tracking tests
- [ ] Error handling tests (rate limits, network failures)

**Implementation:**
- [ ] "Sync from Dropbox" API endpoint
- [ ] Background job queue (BullMQ or Inngest)
- [ ] File download to Supabase Storage
- [ ] Duplicate detection logic
- [ ] Sync progress UI with real-time updates
- [ ] Sync history/logs table

**Tests Implementation:**
```typescript
// tests/api/dropbox-sync.test.ts
describe('Dropbox File Sync', () => {
  test('should sync new files from Dropbox folder', async () => {
    const result = await syncDropboxFolder(caseId);
    expect(result.newFiles).toBeGreaterThan(0);
    expect(result.duplicates).toBe(0);
  });

  test('should skip already imported files', async () => {
    await syncDropboxFolder(caseId); // First sync
    const result = await syncDropboxFolder(caseId); // Second sync
    expect(result.newFiles).toBe(0);
  });

  test('should handle Dropbox API rate limits gracefully', async () => {
    // Mock rate limit error
    const result = await syncDropboxFolder(caseId);
    expect(result.error).toContain('rate limit');
  });
});
```

### 📦 PHASE 2 DELIVERABLES
**Vercel Deployment:**
- ✅ Dropbox OAuth fully functional
- ✅ Attorneys can browse and select Dropbox folders
- ✅ Manual "Sync from Dropbox" working end-to-end
- ✅ Files stored in Supabase Storage
- ✅ All integration tests passing
- ✅ Deployed to Vercel staging with working Dropbox connection

**Acceptance Criteria:**
- [ ] Attorney can connect Dropbox account
- [ ] Attorney can create case and map to Dropbox folder
- [ ] Attorney can click "Sync from Dropbox" and see files import
- [ ] Duplicate files are skipped
- [ ] Sync progress shows in real-time
- [ ] Disconnecting Dropbox works properly

**Code Coverage Target:** 95%+ for Dropbox integration logic

---

## 🤖 PHASE 3: AI Document Classification (Week 3-5)
**Goal:** Documents auto-classify with attorney review workflow

### 3.1 OpenAI Integration (TDD)
**Tests First:**
- [ ] API connection tests
- [ ] Chat session creation tests
- [ ] Response streaming tests
- [ ] Error handling tests (rate limits, timeouts)
- [ ] Cost tracking tests

**Implementation:**
- [ ] OpenAI SDK setup with GPT-5-nano
- [ ] Chat Completions API with conversation history management
- [ ] Chat session management in Supabase
- [ ] Streaming response handler
- [ ] Token usage tracking with 90% cache discount
- [ ] Environment variable management

**Tests Implementation:**
```typescript
// tests/ai/openai-integration.test.ts
describe('OpenAI Integration', () => {
  test('should create persistent chat session', async () => {
    const session = await createAIChatSession(caseId);
    expect(session.response_id).toBeDefined();
  });

  test('should stream classification responses', async () => {
    const chunks = [];
    await classifyDocument(documentId, (chunk) => {
      chunks.push(chunk);
    });
    expect(chunks.length).toBeGreaterThan(0);
  });

  test('should track token usage per classification', async () => {
    const result = await classifyDocument(documentId);
    expect(result.tokens_used).toBeGreaterThan(0);
  });
});
```

### 3.2 Document Classification Engine (TDD)
**Tests First:**
- [ ] PDF text extraction tests
- [ ] Category classification tests
- [ ] Confidence score validation tests
- [ ] Metadata extraction tests
- [ ] Sub-type detection tests

**Implementation:**
- [ ] PDF.js integration for text extraction
- [ ] Classification prompt engineering
- [ ] Category taxonomy (Financial, Medical, Legal, etc.)
- [ ] Confidence scoring logic
- [ ] Metadata extraction (dates, parties, amounts)
- [ ] Fallback to OCR for scanned PDFs (Tesseract.js)

**Tests Implementation:**
```typescript
// tests/ai/document-classification.test.ts
describe('Document Classification', () => {
  test('should classify bank statement as Financial', async () => {
    const mockBankStatement = readFileSync('fixtures/bank-statement.pdf');
    const result = await classifyDocument(mockBankStatement);

    expect(result.category).toBe('Financial');
    expect(result.subtype).toBe('Bank Statement');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('should extract date range from financial document', async () => {
    const result = await classifyDocument(mockDocument);
    expect(result.metadata.startDate).toBeDefined();
    expect(result.metadata.endDate).toBeDefined();
  });

  test('should flag low-confidence classifications for review', async () => {
    const result = await classifyDocument(ambiguousDocument);
    expect(result.needsReview).toBe(true);
    expect(result.confidence).toBeLessThan(0.8);
  });
});
```

### 3.3 Attorney Review Workflow (TDD)
**Tests First:**
- [ ] Classification override tests
- [ ] Bulk acceptance tests
- [ ] Re-classification tests
- [ ] Audit trail tests

**Implementation:**
- [ ] Classification review UI (shadcn data table)
- [ ] Accept/reject/override actions
- [ ] Bulk operations (accept all high-confidence)
- [ ] Re-classification triggers
- [ ] Audit logging for classification changes
- [ ] Filter by confidence level

**Tests Implementation:**
```typescript
// tests/workflows/classification-review.test.ts
describe('Classification Review Workflow', () => {
  test('should allow attorney to override AI classification', async () => {
    const updated = await overrideClassification(docId, {
      category: 'Medical',
      subtype: 'Medical Records'
    });
    expect(updated.category).toBe('Medical');
    expect(updated.overriddenBy).toBe(attorneyId);
  });

  test('should bulk accept high-confidence classifications', async () => {
    const result = await bulkAcceptClassifications(caseId, 0.9);
    expect(result.accepted).toBeGreaterThan(0);
  });
});
```

### 📦 PHASE 3 DELIVERABLES
**Vercel Deployment:**
- ✅ OpenAI integration live with GPT-5-nano
- ✅ Documents auto-classify after Dropbox sync
- ✅ Attorney review interface working
- ✅ Persistent chat sessions maintain context
- ✅ 90% cache discount applied to repeated prompts
- ✅ All AI tests passing (mocked and integration)
- ✅ Deployed to Vercel staging with full AI pipeline

**Acceptance Criteria:**
- [ ] Synced documents automatically classify within 30 seconds
- [ ] Classifications include category, subtype, confidence, metadata
- [ ] Attorney can review and override classifications
- [ ] Low-confidence docs (<80%) flagged for review
- [ ] Bulk operations work for high-confidence docs
- [ ] Token usage tracked and displayed
- [ ] Cost per document <$0.002 (with caching)

**Code Coverage Target:** 90%+ for classification logic

---

## 🎨 PHASE 4: Case Management UI (Week 4-6)
**Goal:** Professional attorney dashboard with case navigation

### 4.1 Dashboard Components (TDD)
**Tests First:**
- [ ] Component rendering tests
- [ ] Data fetching tests
- [ ] Loading state tests
- [ ] Error state tests
- [ ] Interaction tests

**Implementation:**
- [ ] Case dashboard (shadcn data table)
- [ ] Case statistics cards
- [ ] Quick actions menu
- [ ] Search and filter components
- [ ] Case status management
- [ ] Alert indicators (missing docs, new docs)

**Tests Implementation:**
```typescript
// tests/components/dashboard.test.tsx
describe('Case Dashboard', () => {
  test('should render attorney cases list', async () => {
    render(<CaseDashboard />);
    expect(await screen.findByText('Smith v. Smith')).toBeInTheDocument();
  });

  test('should show alert for missing documents', async () => {
    render(<CaseDashboard />);
    expect(await screen.findByText('3 missing documents')).toBeInTheDocument();
  });

  test('should filter cases by status', async () => {
    render(<CaseDashboard />);
    await userEvent.click(screen.getByText('Active Cases'));
    expect(screen.queryByText('Closed Case')).not.toBeInTheDocument();
  });
});
```

### 4.2 Case Detail Views (TDD)
**Tests First:**
- [ ] Case header tests
- [ ] Document list tests
- [ ] Sync status tests
- [ ] Navigation tests

**Implementation:**
- [ ] Case detail page layout
- [ ] Dropbox sync status widget
- [ ] Document library (categorized view)
- [ ] Case settings/configuration
- [ ] Client invitation system
- [ ] Case notes (optional)

**Tests Implementation:**
```typescript
// tests/pages/case-detail.test.tsx
describe('Case Detail Page', () => {
  test('should display case header with Dropbox folder', async () => {
    render(<CaseDetailPage caseId="123" />);
    expect(await screen.findByText('/Clients/Smith')).toBeInTheDocument();
  });

  test('should show sync from Dropbox button', async () => {
    render(<CaseDetailPage caseId="123" />);
    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
  });
});
```

### 4.3 Document Viewer (TDD)
**Tests First:**
- [ ] PDF rendering tests
- [ ] Classification display tests
- [ ] Metadata display tests
- [ ] Navigation tests

**Implementation:**
- [ ] PDF viewer component (react-pdf)
- [ ] Classification tags display
- [ ] Metadata sidebar
- [ ] Previous/next navigation
- [ ] Quick classification override

**Tests Implementation:**
```typescript
// tests/components/document-viewer.test.tsx
describe('Document Viewer', () => {
  test('should render PDF with classification tags', async () => {
    render(<DocumentViewer documentId="456" />);
    expect(await screen.findByText('Financial')).toBeInTheDocument();
    expect(screen.getByText('Bank Statement')).toBeInTheDocument();
  });
});
```

### 📦 PHASE 4 DELIVERABLES
**Vercel Deployment:**
- ✅ Full case management dashboard
- ✅ Case detail pages with document library
- ✅ Document viewer with classification
- ✅ All component tests passing
- ✅ Responsive design (desktop-first)
- ✅ Deployed to Vercel staging with polished UI

**Acceptance Criteria:**
- [ ] Attorney can view all cases in dashboard
- [ ] Attorney can create new case and map Dropbox folder
- [ ] Attorney can view case details and documents
- [ ] Attorney can sync from Dropbox via button
- [ ] Documents display with classifications and confidence
- [ ] UI matches professional legal software standards

**Code Coverage Target:** 85%+ for UI components

---

## 📋 PHASE 5: Discovery Request Tracking (Week 6-7)
**Goal:** Track RFPs/Interrogatories and map documents

### 5.1 Discovery Request Management (TDD)
**Tests First:**
- [ ] Create discovery request tests
- [ ] Edit/delete request tests
- [ ] Request validation tests
- [ ] Bulk import tests

**Implementation:**
- [ ] Discovery request CRUD API
- [ ] Request creation form (shadcn)
- [ ] Request type (RFP vs Interrogatory)
- [ ] Request numbering system
- [ ] Category hints
- [ ] Bulk import from text/CSV

**Tests Implementation:**
```typescript
// tests/api/discovery-requests.test.ts
describe('Discovery Request Management', () => {
  test('should create RFP with full text', async () => {
    const rfp = await createDiscoveryRequest({
      caseId: '123',
      type: 'RFP',
      number: 12,
      text: 'All bank statements from January 2023 to present',
      categoryHint: 'Financial'
    });
    expect(rfp.id).toBeDefined();
  });

  test('should bulk import requests from text', async () => {
    const text = `RFP 1: All tax returns...
    RFP 2: All pay stubs...`;
    const result = await bulkImportRequests(caseId, text);
    expect(result.imported).toBe(2);
  });
});
```

### 5.2 AI Document Mapping (TDD)
**Tests First:**
- [ ] Document-to-request matching tests
- [ ] Confidence scoring tests
- [ ] Date range matching tests
- [ ] Keyword matching tests
- [ ] Reasoning extraction tests

**Implementation:**
- [ ] AI prompt for document-request matching
- [ ] Date range parser
- [ ] Keyword extraction
- [ ] Confidence algorithm
- [ ] Suggested mappings API
- [ ] Mapping acceptance/rejection

**Tests Implementation:**
```typescript
// tests/ai/document-mapping.test.ts
describe('AI Document Mapping', () => {
  test('should map bank statements to financial RFP', async () => {
    const mappings = await suggestDocumentMappings(rfpId);
    expect(mappings[0].documentCategory).toBe('Financial');
    expect(mappings[0].confidence).toBeGreaterThan(0.8);
  });

  test('should detect date range satisfaction', async () => {
    const rfp = { text: 'Bank statements Jan 2023 - Dec 2023' };
    const coverage = await analyzeDateCoverage(rfp, documents);
    expect(coverage.months.length).toBe(12);
  });
});
```

### 5.3 Coverage Tracking UI (TDD)
**Tests First:**
- [ ] Coverage display tests
- [ ] Progress bar tests
- [ ] Missing document alert tests
- [ ] Manual mapping tests

**Implementation:**
- [ ] Discovery request list view
- [ ] Document mapping interface
- [ ] Coverage progress indicators
- [ ] Missing document warnings
- [ ] Manual add/remove documents
- [ ] Completion status toggle

**Tests Implementation:**
```typescript
// tests/components/discovery-tracker.test.tsx
describe('Discovery Coverage Tracker', () => {
  test('should show completion percentage', async () => {
    render(<DiscoveryTracker caseId="123" />);
    expect(await screen.findByText('75% Complete')).toBeInTheDocument();
  });

  test('should highlight incomplete requests', async () => {
    render(<DiscoveryTracker caseId="123" />);
    const incompleteRFP = screen.getByText('RFP 5');
    expect(incompleteRFP).toHaveClass('text-red-600');
  });
});
```

### 📦 PHASE 5 DELIVERABLES
**Vercel Deployment:**
- ✅ Discovery request management system
- ✅ AI-powered document mapping
- ✅ Coverage tracking dashboard
- ✅ All mapping tests passing
- ✅ Deployed to Vercel staging with full discovery workflow

**Acceptance Criteria:**
- [ ] Attorney can manually create RFPs/Interrogatories
- [ ] Attorney can bulk import discovery requests
- [ ] AI suggests document mappings with confidence scores
- [ ] Attorney can accept/reject/modify mappings
- [ ] Coverage shows % complete per request
- [ ] Missing documents flagged clearly

**Code Coverage Target:** 90%+ for discovery logic

---

## 📊 PHASE 6: Timeline, Search & Export (Week 7-8)
**Goal:** Case timeline view and PDF export functionality

### 6.1 Case Timeline (TDD)
**Tests First:**
- [ ] Timeline data aggregation tests
- [ ] Chronological sorting tests
- [ ] Filter tests
- [ ] Date range tests

**Implementation:**
- [ ] Timeline data aggregation API
- [ ] Unified view of all Dropbox documents
- [ ] Chronological sorting by document date
- [ ] Filter by category (Financial, Medical, Legal, etc.)
- [ ] Date range picker
- [ ] Timeline UI component (shadcn)

**Tests Implementation:**
```typescript
// tests/api/timeline.test.ts
describe('Case Timeline', () => {
  test('should aggregate all case documents chronologically', async () => {
    const timeline = await getCaseTimeline(caseId);
    expect(timeline.items.length).toBeGreaterThan(0);
    expect(timeline.items[0].timestamp).toBeDefined();
  });

  test('should filter timeline by category', async () => {
    const timeline = await getCaseTimeline(caseId, { category: 'Financial' });
    timeline.items.forEach(item => {
      expect(item.category).toBe('Financial');
    });
  });
});
```

### 6.2 Search Functionality (TDD)
**Tests First:**
- [ ] Full-text search tests
- [ ] Filter combination tests
- [ ] Search performance tests
- [ ] Relevance ranking tests

**Implementation:**
- [ ] Search API with Postgres full-text search
- [ ] Filter by category and date
- [ ] Search document names and content
- [ ] Search results UI with relevance ranking
- [ ] Recent searches

**Tests Implementation:**
```typescript
// tests/api/search.test.ts
describe('Search Functionality', () => {
  test('should search across all case documents', async () => {
    const results = await searchCase(caseId, 'bank account');
    expect(results.documents.length).toBeGreaterThan(0);
  });

  test('should filter search by date range', async () => {
    const results = await searchCase(caseId, 'statement', {
      startDate: '2023-01-01',
      endDate: '2023-12-31'
    });
    // All results within range
  });
});
```

### 6.3 PDF Export System (TDD)
**Tests First:**
- [ ] Export by category tests
- [ ] Export by discovery request tests
- [ ] PDF generation tests
- [ ] Table of contents tests
- [ ] Bates numbering tests (optional)

**Implementation:**
- [ ] PDF generation library (PDFKit or Puppeteer)
- [ ] Export by category mode
- [ ] Export by discovery request mode
- [ ] Cover page with case info
- [ ] Table of contents
- [ ] Document separation/dividers
- [ ] Background job for large exports

**Tests Implementation:**
```typescript
// tests/api/pdf-export.test.ts
describe('PDF Export', () => {
  test('should export documents by category', async () => {
    const pdf = await exportPDFByCategory(caseId);
    expect(pdf.buffer).toBeDefined();
    expect(pdf.pageCount).toBeGreaterThan(0);
  });

  test('should export documents by discovery request', async () => {
    const pdf = await exportPDFByRequest(caseId);
    expect(pdf.sections.length).toBeGreaterThan(0);
  });

  test('should include table of contents', async () => {
    const pdf = await exportPDFByCategory(caseId);
    expect(pdf.hasTOC).toBe(true);
  });
});
```

### 📦 PHASE 6 DELIVERABLES
**Vercel Deployment:**
- ✅ Case timeline functional
- ✅ Search working across all evidence
- ✅ PDF export (both modes) functional
- ✅ All export tests passing
- ✅ Deployed to Vercel staging with complete feature set

**Acceptance Criteria:**
- [ ] Attorney can view chronological timeline
- [ ] Attorney can filter/search timeline
- [ ] Attorney can search across case evidence
- [ ] Attorney can export PDF by category
- [ ] Attorney can export PDF by discovery request
- [ ] Exports include table of contents
- [ ] Large exports process in background

**Code Coverage Target:** 85%+ for timeline/search/export

---

## 💳 PHASE 7: Stripe Payments & Trials (Week 8-9)
**Goal:** Subscription billing with 14-day free trial

### 7.1 Stripe Integration (TDD)
**Tests First:**
- [ ] Checkout session tests
- [ ] Subscription creation tests
- [ ] Webhook handling tests
- [ ] Trial period tests
- [ ] Cancellation tests

**Implementation:**
- [ ] Stripe pricing table setup
- [ ] Checkout flow
- [ ] Customer portal integration
- [ ] Subscription status tracking
- [ ] Usage limit enforcement
- [ ] Trial period logic (14 days)

**Tests Implementation:**
```typescript
// tests/payments/stripe.test.ts
describe('Stripe Integration', () => {
  test('should create checkout session with trial', async () => {
    const session = await createCheckoutSession(userId, 'price_solo');
    expect(session.trial_period_days).toBe(14);
  });

  test('should handle successful payment webhook', async () => {
    const event = mockStripeWebhook('checkout.session.completed');
    await handleStripeWebhook(event);

    const user = await getUser(userId);
    expect(user.subscription_status).toBe('active');
  });

  test('should enforce document processing limits', async () => {
    const user = await getUser(userId);
    user.documents_processed_this_month = 500; // Solo plan limit

    const result = await classifyDocument(documentId);
    expect(result.error).toContain('limit reached');
  });
});
```

### 7.2 Usage Tracking (TDD)
**Tests First:**
- [ ] Document count tracking tests
- [ ] AI token usage tests
- [ ] Monthly reset tests
- [ ] Overage calculation tests

**Implementation:**
- [ ] Usage tracking table
- [ ] Document processing counter
- [ ] AI token usage tracking
- [ ] Monthly reset cron job
- [ ] Usage dashboard
- [ ] Overage alerts

**Tests Implementation:**
```typescript
// tests/billing/usage-tracking.test.ts
describe('Usage Tracking', () => {
  test('should track documents processed per month', async () => {
    await classifyDocument(doc1);
    await classifyDocument(doc2);

    const usage = await getMonthlyUsage(userId);
    expect(usage.documents_processed).toBe(2);
  });

  test('should reset usage on first of month', async () => {
    await resetMonthlyUsage();
    const usage = await getMonthlyUsage(userId);
    expect(usage.documents_processed).toBe(0);
  });
});
```

### 7.3 Pricing Pages (TDD)
**Tests First:**
- [ ] Pricing display tests
- [ ] Plan comparison tests
- [ ] CTA button tests
- [ ] Trial messaging tests

**Implementation:**
- [ ] Public pricing page
- [ ] Plan comparison table
- [ ] Stripe Elements integration
- [ ] Trial messaging ("14 days free")
- [ ] Customer testimonials (optional)
- [ ] FAQ section

### 📦 PHASE 7 DELIVERABLES
**Vercel Deployment:**
- ✅ Stripe fully integrated
- ✅ 14-day trial working
- ✅ Subscription management functional
- ✅ Usage limits enforced
- ✅ All payment tests passing
- ✅ Deployed to Vercel staging with billing live

**Acceptance Criteria:**
- [ ] Attorney can subscribe to Solo/Small Firm plan
- [ ] 14-day trial starts on signup
- [ ] Usage limits enforced (documents/month)
- [ ] Overage alerts sent
- [ ] Customer portal works (upgrade/cancel)
- [ ] Webhooks handle all subscription events

**Code Coverage Target:** 95%+ for payment logic

---

## 🚀 PHASE 8: Production Launch (Week 9-10)
**Goal:** Production-ready deployment on Vercel

### 8.1 Performance Optimization (TDD)
**Tests First:**
- [ ] Page load performance tests (<3s)
- [ ] API response time tests (<500ms)
- [ ] Database query optimization tests
- [ ] Image optimization tests
- [ ] Bundle size tests

**Implementation:**
- [ ] Next.js Image optimization
- [ ] API route caching
- [ ] Database query optimization
- [ ] Static page generation where possible
- [ ] CDN configuration
- [ ] Lazy loading components

**Tests Implementation:**
```typescript
// tests/performance/load-times.test.ts
describe('Performance Benchmarks', () => {
  test('should load dashboard in under 3 seconds', async () => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="case-list"]');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should return API response in under 500ms', async () => {
    const startTime = Date.now();
    const response = await fetch('/api/cases');
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(500);
  });
});
```

### 8.2 Security Audit (TDD)
**Tests First:**
- [ ] SQL injection tests
- [ ] XSS vulnerability tests
- [ ] CSRF protection tests
- [ ] Rate limiting tests
- [ ] Authentication bypass tests

**Implementation:**
- [ ] Security headers (helmet)
- [ ] Rate limiting (Upstash Redis)
- [ ] Input validation (Zod schemas)
- [ ] CSRF tokens
- [ ] API key rotation
- [ ] Dependency security scan

**Tests Implementation:**
```typescript
// tests/security/vulnerabilities.test.ts
describe('Security Tests', () => {
  test('should prevent SQL injection', async () => {
    const maliciousInput = "1' OR '1'='1";
    const result = await searchCases(maliciousInput);
    expect(result).not.toContain('error');
  });

  test('should rate limit API calls', async () => {
    const requests = Array(100).fill(null).map(() =>
      fetch('/api/classify')
    );
    const responses = await Promise.all(requests);

    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### 8.3 Monitoring & Logging (TDD)
**Tests First:**
- [ ] Error tracking tests
- [ ] Performance monitoring tests
- [ ] Uptime monitoring tests
- [ ] Log aggregation tests

**Implementation:**
- [ ] Sentry for error tracking
- [ ] Vercel Analytics integration
- [ ] Uptime monitoring (Better Uptime)
- [ ] Structured logging (Pino)
- [ ] Alert configuration
- [ ] Status page (optional)

### 8.4 Documentation & Onboarding (TDD)
**Tests First:**
- [ ] User guide completeness tests
- [ ] API documentation tests
- [ ] Onboarding flow tests

**Implementation:**
- [ ] User onboarding flow
- [ ] In-app help tooltips
- [ ] Knowledge base articles
- [ ] Video tutorials (optional)
- [ ] API documentation
- [ ] Developer README

### 8.5 Production Deployment Checklist
**Pre-Launch:**
- [ ] All tests passing (100% critical paths)
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Stripe live mode enabled
- [ ] Domain configured (custom domain)
- [ ] SSL certificates valid
- [ ] Environment variables set
- [ ] Database backups configured
- [ ] Monitoring active
- [ ] Support email configured

**Deployment:**
- [ ] Deploy to Vercel production
- [ ] Run smoke tests on production
- [ ] Monitor error rates
- [ ] Test payment flow end-to-end
- [ ] Test Dropbox OAuth on production
- [ ] Verify email delivery

**Post-Launch:**
- [ ] Monitor performance dashboards
- [ ] Watch error tracking
- [ ] Test with beta users
- [ ] Collect feedback
- [ ] Hotfix deployment process ready

### 📦 PHASE 8 DELIVERABLES
**Vercel Production:**
- ✅ App live on custom domain
- ✅ All features functional in production
- ✅ Monitoring and alerts configured
- ✅ Security hardened
- ✅ Performance optimized
- ✅ Documentation complete
- ✅ Support system ready

**Acceptance Criteria:**
- [ ] Production environment stable (99.9% uptime)
- [ ] All critical user flows tested in production
- [ ] Payment processing works in live mode
- [ ] Error tracking capturing issues
- [ ] Performance meets benchmarks
- [ ] Beta users successfully onboarded

**Code Coverage Target:** 90%+ overall codebase coverage

---

## 📊 Overall Testing Strategy

### Test Pyramid
```
        /\
       /  \
      / E2E \          ← 10% (Critical user flows)
     /______\
    /        \
   / Integration \     ← 30% (API endpoints, DB operations)
  /____________\
 /              \
/  Unit Tests    \    ← 60% (Business logic, utilities)
/__________________\
```

### Testing Tools
- **Unit Tests:** Vitest
- **Integration Tests:** Vitest + Supabase test client
- **E2E Tests:** Playwright
- **Component Tests:** React Testing Library
- **API Tests:** Supertest
- **Performance Tests:** Lighthouse CI
- **Security Tests:** OWASP ZAP (automated scan)

### CI/CD Pipeline (GitHub Actions)
```yaml
on: [push, pull_request]

jobs:
  test:
    - Run linting (ESLint, Prettier)
    - Run type checking (TypeScript)
    - Run unit tests (Vitest)
    - Run integration tests
    - Run E2E tests (Playwright)
    - Check code coverage (>85% required)

  deploy-staging:
    if: branch == 'develop'
    - Deploy to Vercel staging
    - Run smoke tests

  deploy-production:
    if: branch == 'main'
    - Deploy to Vercel production
    - Run smoke tests
    - Notify team
```

---

## 📈 Success Metrics Per Phase

### Phase 1: Database & Auth
- ✅ 100% schema tests passing
- ✅ 0 unauthorized access in tests
- ✅ <200ms auth response time

### Phase 2: Dropbox Integration
- ✅ 95%+ successful OAuth connections
- ✅ 0 duplicate file imports
- ✅ <30s sync time for 50 files

### Phase 3: AI Classification
- ✅ >85% classification accuracy
- ✅ <30s per document classification
- ✅ Token cost <$0.002/document (with GPT-5-nano + caching)

### Phase 4: UI/UX
- ✅ Lighthouse score >90
- ✅ 0 accessibility violations (WCAG AA)
- ✅ <3s page load time

### Phase 5: Discovery Tracking
- ✅ >80% accurate document-request mapping
- ✅ <2s coverage calculation
- ✅ 95%+ attorney acceptance rate

### Phase 6: Timeline & Export
- ✅ <3min export time for 500 pages
- ✅ <500ms search response
- ✅ 100% export accuracy

### Phase 7: Payments
- ✅ 0 failed payment captures
- ✅ 100% webhook processing
- ✅ <5s checkout completion

### Phase 8: Production
- ✅ 99.9% uptime
- ✅ <100ms p95 API latency
- ✅ 0 critical security vulnerabilities

---

## 🎯 Final Deliverable: Production-Ready MVP

**What "Production-Ready" Means:**
- ✅ All critical user flows work end-to-end
- ✅ 90%+ code coverage across codebase
- ✅ Security audit passed
- ✅ Performance benchmarks met
- ✅ Monitoring and alerts active
- ✅ Stripe live payments working
- ✅ Dropbox integration stable
- ✅ AI classification accurate and cost-effective
- ✅ Documentation complete
- ✅ Support system ready
- ✅ Beta users onboarded successfully

**Timeline Summary:**
- **Weeks 1-2:** Database & Auth ✅
- **Weeks 2-3:** Dropbox Integration ✅
- **Weeks 3-5:** AI Classification ✅
- **Weeks 4-6:** Case Management UI ✅
- **Weeks 6-7:** Discovery Tracking ✅
- **Weeks 7-8:** Timeline, Search, Export ✅
- **Weeks 8-9:** Stripe Payments ✅
- **Weeks 9-10:** Production Launch ✅

**Total: 8-10 Weeks to Production on Vercel**

---

## 🚦 Phase Gate Criteria

**Each phase must meet these criteria before proceeding:**

1. ✅ All tests passing (no skipped tests)
2. ✅ Code coverage meets target
3. ✅ Code review completed
4. ✅ Deployed to Vercel staging
5. ✅ Manual QA passed
6. ✅ Performance benchmarks met
7. ✅ No critical bugs
8. ✅ Documentation updated

**If any criteria fails:** Fix before moving to next phase.

---

## 📞 Support & Resources

**Key Resources:**
- Next.js Documentation: https://nextjs.org/docs
- Supabase Documentation: https://supabase.com/docs
- OpenAI API Docs: https://platform.openai.com/docs
- Dropbox API Docs: https://www.dropbox.com/developers/documentation
- Stripe Docs: https://stripe.com/docs
- shadcn/ui: https://ui.shadcn.com
- Vercel Deployment: https://vercel.com/docs

**Testing Resources:**
- Vitest: https://vitest.dev
- Playwright: https://playwright.dev
- React Testing Library: https://testing-library.com/react

---

**Ready to build? Let's start with Phase 1!** 🚀
