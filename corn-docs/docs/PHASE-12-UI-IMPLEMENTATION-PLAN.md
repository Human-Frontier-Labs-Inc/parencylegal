# Phase 12: UI/UX Implementation Plan

## Overview

This document outlines the TDD-based implementation plan to bring Parency Legal from **52/100** to **85+/100** on the user story fit scale. The focus is on closing the gap between our strong backend capabilities and the user-facing experience.

**Total Estimated Effort:** 26-35 hours
**Target Completion:** Phase 12 (Pre-Production Launch)

---

## Phase Structure

```
Phase 12.1: Foundation & Homepage       (4-5 hours)
Phase 12.2: Document Experience         (5-6 hours)
Phase 12.3: Pricing & Stripe Setup      (2-3 hours)
Phase 12.4: PDF Export System           (6-8 hours)
Phase 12.5: User Experience Polish      (9-13 hours)
```

---

## Phase 12.1: Foundation & Homepage

**Goal:** Replace generic template homepage with legal-focused marketing page

### Deliverables

- [ ] **D12.1.1** - Legal-focused hero section with value proposition
- [ ] **D12.1.2** - Features section showcasing real capabilities (Dropbox, AI, Discovery)
- [ ] **D12.1.3** - "How It Works" 3-step process section
- [ ] **D12.1.4** - Testimonials section (placeholder attorney quotes)
- [ ] **D12.1.5** - Call-to-action section with trial signup
- [ ] **D12.1.6** - Updated footer with Parency Legal branding

### Test Cases

```typescript
// tests/marketing/homepage.test.tsx
describe('Homepage', () => {
  it('displays Parency Legal branding, not template branding');
  it('shows legal-specific features (Dropbox, AI Classification, Discovery)');
  it('displays how-it-works section with 3 steps');
  it('shows attorney testimonials section');
  it('has working CTA buttons linking to signup/dashboard');
  it('displays correct footer with company info');
});
```

### Files to Create/Modify

```
app/(marketing)/page.tsx                          → Complete rewrite
app/(marketing)/components/
├── legal-hero.tsx                                → NEW
├── legal-features.tsx                            → NEW (replace animated-features)
├── how-it-works.tsx                              → NEW
├── testimonials.tsx                              → NEW
├── legal-cta.tsx                                 → NEW
└── legal-footer.tsx                              → NEW
```

### Acceptance Criteria

- [ ] No mention of "Template App" anywhere on marketing pages
- [ ] Hero clearly states value prop for family law attorneys
- [ ] All 4 key features displayed: Dropbox Sync, AI Classification, Discovery Tracking, PDF Export
- [ ] Mobile responsive
- [ ] Page loads in <2 seconds

---

## Phase 12.2: Document Experience

**Goal:** Enable users to actually view documents and see professional summaries

### Deliverables

- [ ] **D12.2.1** - PDF viewer component with zoom, navigation, download
- [ ] **D12.2.2** - Professional document summary card with structured sections
- [ ] **D12.2.3** - Updated document detail page integrating viewer + summary
- [ ] **D12.2.4** - Loading states and error handling for PDF loading

### Test Cases

```typescript
// tests/components/pdf-viewer.test.tsx
describe('PDFViewer', () => {
  it('renders PDF from Supabase storage URL');
  it('renders PDF from Dropbox URL');
  it('displays page navigation controls');
  it('supports zoom in/out');
  it('shows download button');
  it('displays loading state while PDF loads');
  it('shows error state for invalid/missing PDFs');
  it('handles large PDFs (>50 pages) without crashing');
});

// tests/components/document-summary-card.test.tsx
describe('DocumentSummaryCard', () => {
  it('displays document title and type icon');
  it('shows document date prominently');
  it('displays category and subtype with badge');
  it('shows confidence score with visual indicator');
  it('renders key information section with extracted metadata');
  it('displays formatted summary text');
  it('handles missing metadata gracefully');
});
```

### Files to Create/Modify

```
components/documents/
├── pdf-viewer.tsx                                → NEW
├── document-summary-card.tsx                     → NEW
└── document-detail-layout.tsx                    → NEW
app/dashboard/cases/[id]/documents/[docId]/page.tsx → Major update
```

### Dependencies to Install

```bash
npm install @react-pdf-viewer/core @react-pdf-viewer/default-layout pdfjs-dist
```

### Acceptance Criteria

- [ ] PDFs render inline without opening new tab
- [ ] Summary shows structured sections (not raw text)
- [ ] Key metadata (dates, amounts, parties) displayed prominently
- [ ] Works for all document types (PDF, images via OCR text)
- [ ] Responsive on tablet+ screens

---

## Phase 12.3: Pricing & Stripe Setup

**Goal:** Display correct pricing tiers and connect to Stripe

### Deliverables

- [ ] **D12.3.1** - Three-tier pricing page (Solo, Small Firm, Enterprise)
- [ ] **D12.3.2** - Correct feature lists per tier
- [ ] **D12.3.3** - Monthly/yearly toggle with savings display
- [ ] **D12.3.4** - "14-day free trial" messaging
- [ ] **D12.3.5** - Stripe product/price configuration (manual setup)

### Test Cases

```typescript
// tests/marketing/pricing.test.tsx
describe('PricingPage', () => {
  it('displays three pricing tiers');
  it('shows Solo tier at $99/month with correct limits');
  it('shows Small Firm tier at $299/month with correct limits');
  it('shows Enterprise tier with "Contact Us" CTA');
  it('toggles between monthly and yearly pricing');
  it('displays savings percentage for yearly');
  it('shows "14-day free trial" messaging');
  it('checkout button redirects to Stripe (authenticated users)');
  it('checkout button redirects to login (unauthenticated users)');
});
```

### Files to Create/Modify

```
app/(marketing)/pricing/
├── page.tsx                                      → Update server props
└── pricing-page-client.tsx                       → Complete rewrite
```

### Stripe Configuration (Manual Steps)

```
1. Stripe Dashboard → Products → Create Product

   Product 1: "Parency Solo"
   - Monthly: $99/month (price_solo_monthly)
   - Yearly: $948/year (price_solo_yearly) - saves $240
   - Metadata: { tier: "solo", cases: 10, docs: 500, seats: 1 }

   Product 2: "Parency Small Firm"
   - Monthly: $299/month (price_firm_monthly)
   - Yearly: $2,868/year (price_firm_yearly) - saves $720
   - Metadata: { tier: "firm", cases: 50, docs: 2500, seats: 5 }

   Product 3: "Parency Enterprise"
   - Custom pricing (no Stripe price, contact form)
   - Metadata: { tier: "enterprise" }

2. Update .env.local:
   NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_MONTHLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_YEARLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_ID_FIRM_MONTHLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_ID_FIRM_YEARLY=price_xxx

3. Stripe Dashboard → Webhooks → Add endpoint
   URL: https://parencylegal.com/api/stripe/webhooks
   Events: checkout.session.completed, customer.subscription.*
```

### Acceptance Criteria

- [ ] All three tiers visible with correct pricing
- [ ] Feature lists match user story US-9
- [ ] Stripe checkout works end-to-end
- [ ] Webhook properly updates user subscription status

---

## Phase 12.4: PDF Export System

**Goal:** Enable attorneys to export organized PDF bundles for court filing

### Deliverables

- [ ] **D12.4.1** - PDF generation service with cover page template
- [ ] **D12.4.2** - Table of contents generation
- [ ] **D12.4.3** - Document merger with separators and page numbers
- [ ] **D12.4.4** - Export API endpoint with background processing
- [ ] **D12.4.5** - Export UI page with mode selection
- [ ] **D12.4.6** - Export history storage and re-download capability
- [ ] **D12.4.7** - Database schema for export records

### Test Cases

```typescript
// tests/lib/pdf-export.test.ts
describe('PDFExportService', () => {
  it('generates cover page with case name, date, attorney info');
  it('generates table of contents with document names and pages');
  it('merges multiple PDFs into single document');
  it('adds page numbers to merged document');
  it('adds separator pages between documents');
  it('handles export by category mode');
  it('handles export by discovery request mode');
  it('processes large exports (>100 pages) without timeout');
  it('stores completed export in Supabase storage');
  it('returns download URL after completion');
});

// tests/api/export.test.ts
describe('Export API', () => {
  it('POST /api/cases/[id]/export creates export job');
  it('GET /api/cases/[id]/export returns export history');
  it('GET /api/cases/[id]/export/[exportId] returns download URL');
  it('handles concurrent export requests');
  it('returns 404 for non-existent case');
});

// tests/pages/export.test.tsx
describe('ExportPage', () => {
  it('displays export mode options (by category, by discovery)');
  it('shows document count for each export option');
  it('displays progress indicator during export');
  it('shows download button when export complete');
  it('lists previous exports with re-download option');
});
```

### Files to Create

```
lib/pdf/
├── export-service.ts                             → Main export logic
├── cover-page-generator.ts                       → Cover page creation
├── toc-generator.ts                              → Table of contents
├── pdf-merger.ts                                 → Merge PDFs with separators
└── page-numberer.ts                              → Add page numbers

app/api/cases/[id]/export/
├── route.ts                                      → POST: create, GET: list
└── [exportId]/route.ts                           → GET: download URL

app/dashboard/cases/[id]/export/
└── page.tsx                                      → Export UI

db/schema/
└── exports-schema.ts                             → Export records table
```

### Dependencies to Install

```bash
npm install pdf-lib
```

### Database Migration

```sql
CREATE TABLE case_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  export_mode TEXT NOT NULL, -- 'by_category' | 'by_discovery'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  document_count INTEGER,
  page_count INTEGER,
  file_size_bytes BIGINT,
  storage_path TEXT,
  download_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Acceptance Criteria

- [ ] Export by category produces organized PDF
- [ ] Export by discovery request produces organized PDF
- [ ] Cover page includes case name, date, preparer info
- [ ] Table of contents lists all documents with page numbers
- [ ] Page numbers appear on every page
- [ ] Export history shows all previous exports
- [ ] Re-download works for completed exports
- [ ] Large exports (500 pages) complete within 3 minutes

---

## Phase 12.5: User Experience Polish

**Goal:** Implement Tier 2 features for a polished user experience

### Phase 12.5.1: Onboarding Flow (3-4 hours)

#### Deliverables

- [ ] **D12.5.1.1** - Onboarding wizard component with step navigation
- [ ] **D12.5.1.2** - Welcome step with value proposition
- [ ] **D12.5.1.3** - Dropbox connection step
- [ ] **D12.5.1.4** - Create first case step
- [ ] **D12.5.1.5** - Completion step with next steps
- [ ] **D12.5.1.6** - Profile schema update for onboarding status

#### Test Cases

```typescript
// tests/components/onboarding.test.tsx
describe('OnboardingWizard', () => {
  it('shows on first login when onboardingComplete is false');
  it('does not show when onboardingComplete is true');
  it('displays welcome step first');
  it('allows skipping Dropbox connection');
  it('creates case in create-case step');
  it('marks onboarding complete on finish');
  it('can be dismissed and resumed later');
});
```

#### Files to Create/Modify

```
components/onboarding/
├── onboarding-wizard.tsx                         → Main wizard
├── onboarding-progress.tsx                       → Step indicator
└── steps/
    ├── welcome-step.tsx                          → Welcome message
    ├── dropbox-step.tsx                          → Connect Dropbox
    ├── create-case-step.tsx                      → Create first case
    └── complete-step.tsx                         → Success + next steps
app/dashboard/page.tsx                            → Check onboarding status
db/schema/profiles-schema.ts                      → Add onboardingComplete
```

---

### Phase 12.5.2: Bulk Classification Review (2 hours)

#### Deliverables

- [ ] **D12.5.2.1** - "Accept All High-Confidence" button on documents list
- [ ] **D12.5.2.2** - Bulk accept API endpoint
- [ ] **D12.5.2.3** - Confirmation dialog with document count
- [ ] **D12.5.2.4** - Success feedback with count of accepted documents

#### Test Cases

```typescript
// tests/api/bulk-accept.test.ts
describe('Bulk Accept API', () => {
  it('accepts all documents with confidence >= threshold');
  it('returns count of accepted documents');
  it('does not modify already-accepted documents');
  it('respects custom confidence threshold parameter');
});

// tests/pages/documents-list.test.tsx
describe('DocumentsList Bulk Accept', () => {
  it('shows bulk accept button with count');
  it('opens confirmation dialog on click');
  it('calls API on confirm');
  it('updates document list after success');
});
```

#### Files to Create/Modify

```
app/api/cases/[id]/documents/bulk-accept/route.ts → NEW
app/dashboard/cases/[id]/page.tsx                 → Add bulk accept UI
```

---

### Phase 12.5.3: Visual Timeline (3-4 hours)

#### Deliverables

- [ ] **D12.5.3.1** - Vertical timeline component with connecting line
- [ ] **D12.5.3.2** - Timeline dots colored by category
- [ ] **D12.5.3.3** - Gap indicators for missing periods
- [ ] **D12.5.3.4** - Hover preview cards
- [ ] **D12.5.3.5** - Click to view document

#### Test Cases

```typescript
// tests/components/visual-timeline.test.tsx
describe('VisualTimeline', () => {
  it('renders vertical line connecting events');
  it('shows dots for each document');
  it('colors dots by category');
  it('displays date labels');
  it('shows document preview on hover');
  it('navigates to document on click');
  it('highlights gaps in date coverage');
  it('handles documents without dates');
});
```

#### Files to Create/Modify

```
components/timeline/
├── visual-timeline.tsx                           → NEW
├── timeline-event.tsx                            → NEW
├── timeline-gap.tsx                              → NEW
└── timeline-preview-card.tsx                     → NEW
app/dashboard/cases/[id]/timeline/page.tsx        → Use new component
```

---

### Phase 12.5.4: Missing Document Email Template (1-2 hours)

#### Deliverables

- [ ] **D12.5.4.1** - "Request from Client" button on missing document alerts
- [ ] **D12.5.4.2** - Email template generator with case context
- [ ] **D12.5.4.3** - mailto: link opens email client with pre-filled template

#### Test Cases

```typescript
// tests/lib/email-templates.test.ts
describe('DocumentRequestEmailTemplate', () => {
  it('generates subject with case name and document type');
  it('includes document type in body');
  it('includes date range for date-based documents');
  it('includes discovery request reference if applicable');
  it('includes Dropbox folder path for upload');
  it('escapes special characters for mailto URL');
});
```

#### Files to Create/Modify

```
lib/templates/
└── document-request-email.ts                     → NEW
components/insights/
└── request-document-button.tsx                   → NEW
components/insights/case-insights-panel.tsx       → Add button
```

---

### Phase 12.5.5: Usage Dashboard (2-3 hours)

#### Deliverables

- [ ] **D12.5.5.1** - Usage tracking in database (documents processed per month)
- [ ] **D12.5.5.2** - Usage API endpoint
- [ ] **D12.5.5.3** - Usage dashboard component with progress bars
- [ ] **D12.5.5.4** - Overage warning when approaching limit
- [ ] **D12.5.5.5** - Integration in settings page

#### Test Cases

```typescript
// tests/api/usage.test.ts
describe('Usage API', () => {
  it('returns documents processed this billing cycle');
  it('returns document limit based on subscription tier');
  it('returns active case count');
  it('returns case limit based on subscription tier');
  it('calculates usage percentage correctly');
});

// tests/components/usage-dashboard.test.tsx
describe('UsageDashboard', () => {
  it('displays documents used / limit');
  it('displays cases used / limit');
  it('shows progress bars');
  it('displays billing cycle dates');
  it('shows warning when usage > 80%');
  it('shows upgrade button');
});
```

#### Files to Create/Modify

```
db/schema/usage-schema.ts                         → NEW (or extend profiles)
app/api/usage/route.ts                            → NEW
components/usage-dashboard.tsx                    → NEW
app/dashboard/settings/page.tsx                   → Add usage section
lib/usage/track-usage.ts                          → Usage tracking helper
```

#### Database Migration

```sql
-- Option 1: Add to profiles table
ALTER TABLE profiles ADD COLUMN documents_processed_this_cycle INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN billing_cycle_start TIMESTAMP;
ALTER TABLE profiles ADD COLUMN billing_cycle_end TIMESTAMP;

-- Option 2: Separate usage_logs table for detailed tracking
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'document_classified', 'document_exported', etc.
  case_id UUID REFERENCES cases(id),
  document_id UUID REFERENCES documents(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Implementation Order

```
Week 1: Foundation
├── Day 1-2: Phase 12.1 (Homepage) - 4-5 hours
├── Day 2-3: Phase 12.2 (Document Experience) - 5-6 hours
└── Day 3: Phase 12.3 (Pricing) - 2-3 hours
         + Stripe Manual Setup (30 min)

Week 2: Core Features + Polish
├── Day 4-5: Phase 12.4 (PDF Export) - 6-8 hours
├── Day 6: Phase 12.5.1 (Onboarding) - 3-4 hours
├── Day 6: Phase 12.5.2 (Bulk Review) - 2 hours
├── Day 7: Phase 12.5.3 (Visual Timeline) - 3-4 hours
├── Day 7: Phase 12.5.4 (Email Template) - 1-2 hours
└── Day 7: Phase 12.5.5 (Usage Dashboard) - 2-3 hours
```

---

## Testing Strategy

### Unit Tests
- All new components have isolated unit tests
- API routes tested with mocked dependencies
- PDF generation tested with sample documents

### Integration Tests
- Stripe checkout flow end-to-end
- PDF export full pipeline
- Onboarding flow completion

### Manual QA Checklist
- [ ] Homepage looks professional on desktop and mobile
- [ ] PDF viewer works with various document types
- [ ] Document summary displays structured information
- [ ] Pricing page shows correct tiers
- [ ] Stripe checkout completes successfully
- [ ] PDF export generates valid, downloadable files
- [ ] Onboarding guides new users effectively
- [ ] Bulk accept works with 50+ documents
- [ ] Timeline displays chronologically correct
- [ ] Email template opens in email client
- [ ] Usage dashboard shows accurate data

---

## Success Metrics

After Phase 12 completion:

| Metric | Before | Target |
|--------|--------|--------|
| User Story Fit Score | 52/100 | 85/100 |
| Homepage Branding | Generic Template | Parency Legal |
| Document Viewing | Metadata only | Full PDF + Summary |
| PDF Export | Not implemented | Fully functional |
| Pricing Accuracy | 1 generic tier | 3 correct tiers |
| Onboarding | None | Guided wizard |
| Bulk Operations | None | Accept all >90% |
| Timeline UX | Basic list | Visual timeline |

---

## Dependencies & Prerequisites

### NPM Packages to Install
```bash
npm install @react-pdf-viewer/core @react-pdf-viewer/default-layout pdfjs-dist pdf-lib
```

### Environment Variables Needed
```env
# Stripe (replace placeholders with real values)
NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_YEARLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ID_FIRM_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ID_FIRM_YEARLY=price_xxx
```

### Database Migrations
1. `exports-schema.ts` - Case exports table
2. `profiles-schema.ts` - Add onboardingComplete, usage tracking fields

### Manual Steps (Non-Code)
1. Create Stripe products and prices
2. Configure Stripe webhook endpoint
3. Test Stripe integration in test mode before going live

---

## Rollback Plan

Each phase is independently deployable. If issues arise:

1. **Homepage**: Revert to previous marketing page files
2. **PDF Viewer**: Disable viewer, fall back to "Download" button
3. **Pricing**: Revert to single-tier pricing
4. **PDF Export**: Feature flag to disable export option
5. **Onboarding**: Set all users to `onboardingComplete: true`

---

## Post-Implementation

After Phase 12:
- Phase 13: Production hardening (security audit, performance optimization)
- Phase 14: Analytics and monitoring setup
- Phase 15: User feedback collection and iteration
