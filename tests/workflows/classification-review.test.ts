/**
 * Classification Review Workflow Tests (TDD)
 * Phase 3: AI Document Classification
 *
 * Tests attorney review and override functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types
interface DocumentClassification {
  id: string;
  documentId: string;
  category: string;
  subtype: string;
  confidence: number;
  needsReview: boolean;
  reviewedAt?: Date;
  reviewedBy?: string;
}

interface OverrideResult {
  success: boolean;
  documentId: string;
  previousCategory: string;
  newCategory: string;
  overriddenBy: string;
  timestamp: Date;
}

interface BulkActionResult {
  processed: number;
  accepted: number;
  rejected: number;
  errors: string[];
}

// Service functions to be implemented
const getDocumentsForReview = async (
  caseId: string,
  filters?: { needsReview?: boolean; category?: string; minConfidence?: number }
): Promise<DocumentClassification[]> => {
  throw new Error('Not implemented');
};

const overrideClassification = async (
  documentId: string,
  userId: string,
  newClassification: { category: string; subtype: string }
): Promise<OverrideResult> => {
  throw new Error('Not implemented');
};

const acceptClassification = async (
  documentId: string,
  userId: string
): Promise<boolean> => {
  throw new Error('Not implemented');
};

const rejectClassification = async (
  documentId: string,
  userId: string,
  reason: string
): Promise<boolean> => {
  throw new Error('Not implemented');
};

const bulkAcceptClassifications = async (
  caseId: string,
  minConfidence: number,
  userId: string
): Promise<BulkActionResult> => {
  throw new Error('Not implemented');
};

const bulkRejectClassifications = async (
  documentIds: string[],
  userId: string,
  reason: string
): Promise<BulkActionResult> => {
  throw new Error('Not implemented');
};

const requestReclassification = async (
  documentId: string,
  userId: string,
  hints?: string
): Promise<DocumentClassification> => {
  throw new Error('Not implemented');
};

const getClassificationHistory = async (
  documentId: string
): Promise<Array<{
  timestamp: Date;
  category: string;
  subtype: string;
  confidence: number;
  source: 'ai' | 'manual_override';
  userId?: string;
}>> => {
  throw new Error('Not implemented');
};

describe('Classification Review Workflow', () => {
  const mockCaseId = 'case_test123';
  const mockDocumentId = 'doc_test456';
  const mockUserId = 'user_attorney789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Get Documents for Review', () => {
    it('should get all documents needing review', async () => {
      const documents = await getDocumentsForReview(mockCaseId, { needsReview: true });

      expect(documents).toBeDefined();
      expect(Array.isArray(documents)).toBe(true);
      documents.forEach(doc => {
        expect(doc.needsReview).toBe(true);
      });
    });

    it('should filter by category', async () => {
      const documents = await getDocumentsForReview(mockCaseId, { category: 'Financial' });

      documents.forEach(doc => {
        expect(doc.category).toBe('Financial');
      });
    });

    it('should filter by minimum confidence', async () => {
      const documents = await getDocumentsForReview(mockCaseId, { minConfidence: 0.9 });

      documents.forEach(doc => {
        expect(doc.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should return empty array for case with no documents', async () => {
      const documents = await getDocumentsForReview('empty_case');

      expect(documents).toEqual([]);
    });
  });

  describe('Override Classification', () => {
    it('should allow attorney to override AI classification', async () => {
      const result = await overrideClassification(mockDocumentId, mockUserId, {
        category: 'Medical',
        subtype: 'Medical Records',
      });

      expect(result.success).toBe(true);
      expect(result.newCategory).toBe('Medical');
      expect(result.overriddenBy).toBe(mockUserId);
    });

    it('should record previous classification', async () => {
      const result = await overrideClassification(mockDocumentId, mockUserId, {
        category: 'Legal',
        subtype: 'Court Order',
      });

      expect(result.previousCategory).toBeDefined();
    });

    it('should update classification history', async () => {
      await overrideClassification(mockDocumentId, mockUserId, {
        category: 'Financial',
        subtype: 'Bank Statement',
      });

      const history = await getClassificationHistory(mockDocumentId);

      expect(history.length).toBeGreaterThan(0);
      const latestEntry = history[0];
      expect(latestEntry.source).toBe('manual_override');
      expect(latestEntry.userId).toBe(mockUserId);
    });

    it('should mark document as reviewed', async () => {
      await overrideClassification(mockDocumentId, mockUserId, {
        category: 'Medical',
        subtype: 'Medical Bills',
      });

      const documents = await getDocumentsForReview(mockCaseId);
      const doc = documents.find(d => d.documentId === mockDocumentId);

      expect(doc?.reviewedAt).toBeDefined();
      expect(doc?.reviewedBy).toBe(mockUserId);
    });

    it('should set confidence to 100% for manual overrides', async () => {
      await overrideClassification(mockDocumentId, mockUserId, {
        category: 'Legal',
        subtype: 'Petition',
      });

      const documents = await getDocumentsForReview(mockCaseId);
      const doc = documents.find(d => d.documentId === mockDocumentId);

      expect(doc?.confidence).toBe(1);
    });

    it('should validate category and subtype combination', async () => {
      await expect(
        overrideClassification(mockDocumentId, mockUserId, {
          category: 'Financial',
          subtype: 'Medical Records', // Invalid: Medical subtype for Financial category
        })
      ).rejects.toThrow('Invalid category/subtype combination');
    });
  });

  describe('Accept Classification', () => {
    it('should accept AI classification', async () => {
      const result = await acceptClassification(mockDocumentId, mockUserId);

      expect(result).toBe(true);
    });

    it('should mark document as reviewed', async () => {
      await acceptClassification(mockDocumentId, mockUserId);

      const documents = await getDocumentsForReview(mockCaseId);
      const doc = documents.find(d => d.documentId === mockDocumentId);

      expect(doc?.needsReview).toBe(false);
      expect(doc?.reviewedAt).toBeDefined();
    });

    it('should record acceptance in audit trail', async () => {
      await acceptClassification(mockDocumentId, mockUserId);

      const history = await getClassificationHistory(mockDocumentId);
      // Acceptance should be recorded
      expect(history.some(h => h.userId === mockUserId)).toBe(true);
    });
  });

  describe('Reject Classification', () => {
    it('should reject classification with reason', async () => {
      const result = await rejectClassification(
        mockDocumentId,
        mockUserId,
        'Document is illegible'
      );

      expect(result).toBe(true);
    });

    it('should require a reason', async () => {
      await expect(
        rejectClassification(mockDocumentId, mockUserId, '')
      ).rejects.toThrow('Reason is required');
    });

    it('should flag document for manual review', async () => {
      await rejectClassification(mockDocumentId, mockUserId, 'Cannot classify');

      const documents = await getDocumentsForReview(mockCaseId);
      const doc = documents.find(d => d.documentId === mockDocumentId);

      expect(doc?.needsReview).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk accept high-confidence classifications', async () => {
      const result = await bulkAcceptClassifications(mockCaseId, 0.9, mockUserId);

      expect(result.processed).toBeGreaterThanOrEqual(0);
      expect(result.accepted).toBeLessThanOrEqual(result.processed);
    });

    it('should only accept documents above confidence threshold', async () => {
      const result = await bulkAcceptClassifications(mockCaseId, 0.95, mockUserId);

      // All accepted should have been above 95% confidence
      expect(result.accepted).toBeGreaterThanOrEqual(0);
    });

    it('should report errors during bulk operations', async () => {
      const result = await bulkAcceptClassifications(mockCaseId, 0.5, mockUserId);

      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should bulk reject multiple documents', async () => {
      const documentIds = ['doc1', 'doc2', 'doc3'];
      const result = await bulkRejectClassifications(
        documentIds,
        mockUserId,
        'Batch rejection'
      );

      expect(result.processed).toBe(documentIds.length);
    });
  });

  describe('Re-classification', () => {
    it('should request re-classification of document', async () => {
      const result = await requestReclassification(mockDocumentId, mockUserId);

      expect(result).toBeDefined();
      expect(result.documentId).toBe(mockDocumentId);
    });

    it('should use hints for better classification', async () => {
      const result = await requestReclassification(
        mockDocumentId,
        mockUserId,
        'This is a bank statement from Chase'
      );

      expect(result.category).toBeDefined();
    });

    it('should add re-classification to history', async () => {
      await requestReclassification(mockDocumentId, mockUserId);

      const history = await getClassificationHistory(mockDocumentId);
      expect(history.length).toBeGreaterThan(1);
    });
  });

  describe('Classification History', () => {
    it('should return full classification history', async () => {
      const history = await getClassificationHistory(mockDocumentId);

      expect(Array.isArray(history)).toBe(true);
    });

    it('should order history by most recent first', async () => {
      const history = await getClassificationHistory(mockDocumentId);

      if (history.length > 1) {
        for (let i = 1; i < history.length; i++) {
          expect(history[i - 1].timestamp.getTime())
            .toBeGreaterThanOrEqual(history[i].timestamp.getTime());
        }
      }
    });

    it('should distinguish AI vs manual classifications', async () => {
      // First AI classification
      // Then manual override
      await overrideClassification(mockDocumentId, mockUserId, {
        category: 'Legal',
        subtype: 'Contract',
      });

      const history = await getClassificationHistory(mockDocumentId);

      const sources = history.map(h => h.source);
      expect(sources).toContain('ai');
      expect(sources).toContain('manual_override');
    });
  });
});

describe('Review Workflow API Routes', () => {
  describe('GET /api/cases/:id/documents/review', () => {
    it('should list documents needing review', async () => {
      const response = await fetch('/api/cases/case123/documents/review');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.documents)).toBe(true);
    });

    it('should filter by query parameters', async () => {
      const response = await fetch(
        '/api/cases/case123/documents/review?needsReview=true&minConfidence=0.8'
      );

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/documents/:id/classification', () => {
    it('should override classification', async () => {
      const response = await fetch('/api/documents/doc123/classification', {
        method: 'PUT',
        body: JSON.stringify({
          category: 'Financial',
          subtype: 'Bank Statement',
        }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/documents/:id/accept', () => {
    it('should accept classification', async () => {
      const response = await fetch('/api/documents/doc123/accept', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/documents/:id/reject', () => {
    it('should reject classification', async () => {
      const response = await fetch('/api/documents/doc123/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cannot classify' }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/cases/:id/documents/bulk-accept', () => {
    it('should bulk accept high-confidence documents', async () => {
      const response = await fetch('/api/cases/case123/documents/bulk-accept', {
        method: 'POST',
        body: JSON.stringify({ minConfidence: 0.9 }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.accepted).toBeDefined();
    });
  });

  describe('GET /api/documents/:id/classification-history', () => {
    it('should return classification history', async () => {
      const response = await fetch('/api/documents/doc123/classification-history');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.history)).toBe(true);
    });
  });
});
