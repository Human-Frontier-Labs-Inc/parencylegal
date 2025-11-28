/**
 * Discovery Request Module
 * Phase 8: Discovery Request Tracking
 *
 * Exports all discovery-related functionality
 */

// Request CRUD
export {
  createDiscoveryRequest,
  getDiscoveryRequests,
  getDiscoveryRequest,
  updateDiscoveryRequest,
  deleteDiscoveryRequest,
  getNextRequestNumber,
  requestNumberExists,
  getDiscoveryStats,
  type CreateDiscoveryRequestInput,
  type UpdateDiscoveryRequestInput,
} from "./requests";

// Bulk Import
export {
  parseDiscoveryText,
  bulkImportDiscoveryRequests,
  validateImportText,
  type ParsedRequest,
  type BulkImportResult,
} from "./bulk-import";

// Category Detection
export {
  detectCategoryFromText,
  detectAllCategories,
  extractKeywords,
} from "./category-detection";

// Date Parsing
export {
  parseDateRangeFromText,
  matchDocumentToDateRange,
  resolveRelativeDate,
  type ParsedDateRange,
  type DateMatchResult,
} from "./date-parser";

// Document Mapping
export {
  suggestDocumentsForRequest,
  createDocumentMapping,
  getMappingsForRequest,
  getMappingsForDocument,
  updateMappingStatus,
  deleteMapping,
  calculateCoveragePercentage,
  createAISuggestions,
  type SuggestedMapping,
  type MappingSuggestionResult,
  type DocumentMapping,
} from "./document-mapping";

// Semantic Matching
export {
  semanticMatchDocuments,
  getDocumentMatchScore,
  batchDocumentMatchScores,
  type SemanticMatchResult,
} from "./semantic-matching";
