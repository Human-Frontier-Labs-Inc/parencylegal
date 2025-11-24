import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Global test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'user_' + crypto.randomUUID(),
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  ...overrides,
})

export const createMockCase = (userId: string, overrides = {}) => ({
  id: crypto.randomUUID(),
  userId,
  name: 'Test Case v. Defendant',
  clientName: 'Test Client',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockDocument = (caseId: string, userId: string, overrides = {}) => ({
  id: crypto.randomUUID(),
  caseId,
  userId,
  fileName: 'test-document.pdf',
  fileType: 'pdf',
  source: 'dropbox',
  storagePath: '/test/path.pdf',
  uploadedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})
