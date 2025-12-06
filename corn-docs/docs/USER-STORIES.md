# Parency Lawyer App - User Stories

## Overview
This document contains all user stories for the Parency Lawyer MVP. Each story follows the format:
**As a [role], I want [feature] so that [benefit].**

---

## 📋 Core User Stories (10 Total)

### **US-1: Dropbox Integration** ⭐ Priority: P0 (Critical)
**Phase:** Phase 2
**As a family law attorney,**
**I want to** sync case folders from Dropbox into Parency with one click
**So that** I don't have to upload files twice.

**Acceptance Criteria:**
- [ ] Attorney can connect Dropbox account via OAuth 2.0
- [ ] Attorney can browse and select Dropbox folders
- [ ] Attorney can map Parency case to specific Dropbox folder
- [ ] "Sync from Dropbox" button imports new/updated files
- [ ] Duplicate files are automatically skipped
- [ ] Sync status shows in real-time (progress bar)
- [ ] Last sync time is displayed
- [ ] Attorney can disconnect Dropbox if needed

**Success Metrics:**
- 95%+ successful OAuth connections
- 0 duplicate file imports
- <30s sync time for 50 files
- <5% error rate on syncs

---

### **US-2: AI Document Classification** ⭐ Priority: P0 (Critical)
**Phase:** Phase 3
**As a paralegal,**
**I want** documents from Dropbox auto-categorized
**So that** I don't spend hours sorting PDFs manually.

**Acceptance Criteria:**
- [ ] Documents automatically classify into standard categories:
  - Financial (Bank Statements, Pay Stubs, Tax Returns, etc.)
  - Medical (Medical Records, Prescriptions, Hospital Bills)
  - Legal (Court Orders, Police Reports, Custody Agreements)
  - Communications (Emails, Text Screenshots, Letters)
  - Property (Deeds, Titles, Insurance Policies)
  - Personal Records (IDs, Birth Certificates, Marriage Certificates)
  - Parenting Evidence (School Records, Childcare Receipts)
  - Employment (Contracts, Termination Letters, Benefits)
- [ ] AI provides confidence score for each classification (0-100%)
- [ ] Sub-types are detected (e.g., "Bank Statement" within "Financial")
- [ ] Key metadata extracted (dates, amounts, parties)
- [ ] Low-confidence docs (<80%) are flagged for review
- [ ] Classification happens within 30 seconds of sync

**Success Metrics:**
- >85% classification accuracy
- <30s per document classification
- Cost <$0.002/document (with GPT-5-nano + caching)
- <15% documents needing manual review

---

### **US-3: Discovery Request Mapping** ⭐ Priority: P0 (Critical)
**Phase:** Phase 5
**As an attorney,**
**I want to** see which Dropbox documents satisfy RFP #12
**So that** I know if my response is complete.

**Acceptance Criteria:**
- [ ] Attorney can manually create RFPs/Interrogatories per case
- [ ] Each request has: Type, Number, Full Text, Category Hint
- [ ] AI suggests which documents satisfy each request
- [ ] AI provides confidence score and reasoning for each mapping
- [ ] Attorney can accept/reject/modify suggested mappings
- [ ] Coverage shows % complete per request
- [ ] Missing document warnings are clear and actionable
- [ ] Attorney can manually add/remove documents from any request

**Success Metrics:**
- >80% accurate document-request mapping
- <2s coverage calculation
- 95%+ attorney acceptance rate for high-confidence suggestions

---

### **US-4: Missing Document Detection** ⭐ Priority: P1 (High)
**Phase:** Phase 5
**As a paralegal,**
**I want to** be alerted when I'm missing bank statement months
**So that** I can request them from the client before filing.

**Acceptance Criteria:**
- [ ] AI detects gaps in date-based financial records
- [ ] System shows which months/years are missing
- [ ] Coverage visualization (e.g., "8 of 12 months present")
- [ ] Works for:
  - Bank statements
  - Pay stubs
  - Credit card statements
  - Tax returns (annual)
  - Retirement account statements
- [ ] Suggested actions displayed (e.g., "Request March 2023 statement")
- [ ] Can detect missing accounts mentioned in interrogatories

**Success Metrics:**
- 100% gap detection accuracy for sequential documents
- Clear visual indicators for missing items
- Actionable recommendations

---

### **US-5: Case Timeline View** ⭐ Priority: P1 (High)
**Phase:** Phase 6
**As an attorney,**
**I want** a chronological view of all evidence
**So that** I can quickly review what I have and when events occurred.

**Acceptance Criteria:**
- [ ] Unified timeline shows all case documents
- [ ] Chronological sorting by document date (statement date, incident date, etc.)
- [ ] Filter by category (Financial, Communications, Medical, etc.)
- [ ] Date range picker (show documents from specific period)
- [ ] Click any timeline item to view full document
- [ ] Visual indicators for document types
- [ ] Loading state for large timelines
- [ ] Responsive on desktop

**Success Metrics:**
- <2s timeline load time for 500 documents
- 100% accuracy in chronological sorting
- Smooth scrolling and navigation

---

### **US-6: PDF Export** ⭐ Priority: P0 (Critical)
**Phase:** Phase 6
**As an attorney,**
**I want to** export PDFs organized by discovery request
**So that** I can file clean, complete responses with the court.

**Acceptance Criteria:**
- [ ] Two export modes:
  - **By Category**: All Financial docs, then Medical, then Legal, etc.
  - **By Discovery Request**: All docs for RFP 1, then RFP 2, etc.
- [ ] Export includes:
  - Cover page with case name, date, attorney info
  - Table of contents
  - Clear document separators/dividers
  - Page numbers
- [ ] Large exports (>100 pages) process in background
- [ ] Download link provided when ready
- [ ] Export history saved (can re-download previous exports)

**Success Metrics:**
- <3min export time for 500 pages
- 100% export accuracy (no missing docs)
- PDF file size optimized (<50MB for typical case)

---

### **US-7: Case Management Dashboard** ⭐ Priority: P0 (Critical)
**Phase:** Phase 4
**As an attorney,**
**I want to** manage multiple cases from a central dashboard
**So that** I can quickly switch between clients and see overall progress.

**Acceptance Criteria:**
- [ ] Dashboard shows all active cases
- [ ] Quick stats per case:
  - Total documents
  - Documents categorized
  - Documents needing review
  - Discovery completion %
- [ ] Search/filter cases by:
  - Client name
  - Case name
  - Status (Active, Discovery, Trial Prep, Closed)
  - Date created
- [ ] Create new case with one click
- [ ] Archive/close cases
- [ ] Alert indicators:
  - Missing documents
  - New documents since last sync
  - Low-confidence classifications

**Success Metrics:**
- <3s dashboard load time
- 100% case data accuracy
- Intuitive navigation (user testing)

---

### **US-8: Search Functionality** ⭐ Priority: P1 (High)
**Phase:** Phase 6
**As a paralegal,**
**I want to** search across all case documents
**So that** I can quickly find specific evidence.

**Acceptance Criteria:**
- [ ] Search by document name
- [ ] Search by document content (full-text)
- [ ] Filter by category
- [ ] Filter by date range
- [ ] Search results show:
  - Document name
  - Category
  - Date
  - Relevant excerpt/snippet
- [ ] Results ranked by relevance
- [ ] Recent searches saved
- [ ] Search works case-level and globally (all cases)

**Success Metrics:**
- <500ms search response time
- >90% search result relevance
- Full-text search accuracy >95%

---

### **US-9: Subscription Management** ⭐ Priority: P0 (Critical)
**Phase:** Phase 7
**As a solo attorney,**
**I want to** subscribe to a plan with a free trial
**So that** I can test the system before committing.

**Acceptance Criteria:**
- [ ] Three pricing tiers clearly displayed:
  - **Solo:** $99/month (10 cases, 500 docs/month, 1 seat)
  - **Small Firm:** $299/month (50 cases, 2,500 docs/month, 5 seats)
  - **Enterprise:** Custom (unlimited)
- [ ] 14-day free trial (no credit card required initially)
- [ ] Usage dashboard shows:
  - Documents processed this month
  - Remaining document allowance
  - Current plan details
- [ ] Upgrade/downgrade plans anytime
- [ ] Cancel subscription from customer portal
- [ ] Overage alerts when nearing limit
- [ ] Stripe customer portal integration

**Success Metrics:**
- 0 failed payment captures
- 100% webhook processing
- <5s checkout completion
- <2% subscription churn

---

### **US-10: Attorney Review Workflow** ⭐ Priority: P0 (Critical)
**Phase:** Phase 3
**As an attorney,**
**I want to** review and correct AI classifications
**So that** I can ensure accuracy before using documents in court.

**Acceptance Criteria:**
- [ ] View all classifications with confidence scores
- [ ] Sort/filter by:
  - Confidence level (high/medium/low)
  - Category
  - Review status (Accepted, Needs Review, Overridden)
- [ ] Override category/sub-type with dropdown
- [ ] Bulk accept high-confidence classifications (>90%)
- [ ] Re-classify individual documents
- [ ] Audit trail of all changes:
  - Who made the change
  - When
  - Original vs new classification
- [ ] Keyboard shortcuts for fast review

**Success Metrics:**
- <10s to review and accept 10 documents
- 95%+ attorney acceptance rate for high-confidence
- 100% audit trail accuracy

---

## 🎯 User Story to Phase Mapping

| Phase | User Stories | Status |
|-------|-------------|--------|
| **Phase 1: Database & Auth** | Foundation for all stories | ⏳ Pending |
| **Phase 2: Dropbox Integration** | US-1 | ⏳ Pending |
| **Phase 3: AI Classification** | US-2, US-10 | ⏳ Pending |
| **Phase 4: Case Management UI** | US-7 | ⏳ Pending |
| **Phase 5: Discovery Tracking** | US-3, US-4 | ⏳ Pending |
| **Phase 6: Timeline, Search & Export** | US-5, US-6, US-8 | ⏳ Pending |
| **Phase 7: Stripe Payments** | US-9 | ⏳ Pending |
| **Phase 8: Production Launch** | All stories in production | ⏳ Pending |

---

## 📊 Story Point Estimates

| Story | Complexity | Effort (Days) | Risk |
|-------|-----------|---------------|------|
| US-1: Dropbox Integration | Medium | 5-7 | Medium (OAuth, rate limits) |
| US-2: AI Classification | High | 8-10 | Medium (accuracy, cost) |
| US-3: Discovery Mapping | High | 6-8 | Low |
| US-4: Missing Doc Detection | Medium | 4-5 | Low |
| US-5: Timeline View | Low | 3-4 | Low |
| US-6: PDF Export | Medium | 5-6 | Medium (large files) |
| US-7: Case Dashboard | Low | 4-5 | Low |
| US-8: Search | Medium | 4-5 | Low |
| US-9: Subscriptions | Medium | 5-6 | Medium (Stripe webhooks) |
| US-10: Review Workflow | Low | 3-4 | Low |

**Total Effort:** 47-60 days (9-12 weeks with overhead)

---

## 🚫 Out of Scope (Removed)

### **~~US-5: Parent App Integration~~** ❌ REMOVED
**Reason:** Attorneys can receive exports from clients instead of direct integration.

**Original Story:**
~~As an attorney, I want my client's Parency Parent App logs integrated so I have court-ready parenting evidence.~~

**Alternative Solution:**
Clients can export their evidence from the Parent App and upload to their attorney's Dropbox folder, which will sync automatically.

---

## 📈 Success Criteria Summary

**MVP is successful when:**
- [ ] All 10 user stories have passing acceptance criteria
- [ ] 90%+ code coverage across codebase
- [ ] Performance benchmarks met (see TDD-IMPLEMENTATION-PLAN.md)
- [ ] Security audit passed
- [ ] 10+ beta attorneys successfully using the system
- [ ] <5% error rate on critical flows (sync, classify, export)
- [ ] Average case setup time <10 minutes (Dropbox connect + first sync)
- [ ] Attorney satisfaction >4.5/5 stars

---

**Last Updated:** November 2025
**Status:** Ready for Phase 1 Implementation
