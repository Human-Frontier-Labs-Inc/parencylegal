/**
 * Cloud Storage Provider Interface Tests (TDD)
 * Tests for the abstraction layer types and factory
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CloudStorageProviderType,
  CloudStorageConnection,
  CloudStorageFolder,
  CloudStorageFile,
  CloudStorageFolderContents,
  CloudStorageError,
} from '@/lib/cloud-storage/types';
import { CloudStorageProvider } from '@/lib/cloud-storage/provider-interface';
import {
  CloudStorageProviderFactory,
  getCloudStorageProvider,
} from '@/lib/cloud-storage/provider-factory';
import { DropboxProvider } from '@/lib/cloud-storage/providers/dropbox';
import { OneDriveProvider } from '@/lib/cloud-storage/providers/onedrive';

describe('Cloud Storage Provider Interface', () => {
  describe('Provider Types', () => {
    it('should define dropbox as a valid provider type', () => {
      const type: CloudStorageProviderType = 'dropbox';
      expect(type).toBe('dropbox');
    });

    it('should define onedrive as a valid provider type', () => {
      const type: CloudStorageProviderType = 'onedrive';
      expect(type).toBe('onedrive');
    });
  });

  describe('CloudStorageConnection Interface', () => {
    it('should have all required connection fields', () => {
      const connection: CloudStorageConnection = {
        id: 'test-id',
        userId: 'user-123',
        provider: 'dropbox',
        providerAccountId: 'account-123',
        providerEmail: 'test@example.com',
        providerDisplayName: 'Test User',
        isActive: true,
        tokenExpiresAt: new Date(),
        lastVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(connection.id).toBe('test-id');
      expect(connection.userId).toBe('user-123');
      expect(connection.provider).toBe('dropbox');
      expect(connection.providerAccountId).toBe('account-123');
      expect(connection.isActive).toBe(true);
    });

    it('should allow nullable fields', () => {
      const connection: CloudStorageConnection = {
        id: 'test-id',
        userId: 'user-123',
        provider: 'onedrive',
        providerAccountId: 'account-123',
        providerEmail: null,
        providerDisplayName: null,
        isActive: true,
        tokenExpiresAt: null,
        lastVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(connection.providerEmail).toBeNull();
      expect(connection.providerDisplayName).toBeNull();
    });
  });

  describe('CloudStorageFolder Interface', () => {
    it('should normalize folder structure across providers', () => {
      const dropboxFolder: CloudStorageFolder = {
        id: 'folder-123',
        name: 'Documents',
        path: '/documents',
        pathDisplay: '/Documents',
        provider: 'dropbox',
      };

      const onedriveFolder: CloudStorageFolder = {
        id: 'folder-456',
        name: 'Documents',
        path: '/documents',
        pathDisplay: '/Documents',
        provider: 'onedrive',
      };

      // Same structure, different providers
      expect(dropboxFolder.provider).toBe('dropbox');
      expect(onedriveFolder.provider).toBe('onedrive');
      expect(dropboxFolder.name).toBe(onedriveFolder.name);
    });
  });

  describe('CloudStorageFile Interface', () => {
    it('should include common file metadata', () => {
      const file: CloudStorageFile = {
        id: 'file-123',
        name: 'contract.pdf',
        path: '/documents/contract.pdf',
        pathDisplay: '/Documents/contract.pdf',
        size: 1024000,
        mimeType: 'application/pdf',
        modifiedAt: new Date(),
        provider: 'dropbox',
        downloadable: true,
      };

      expect(file.id).toBeDefined();
      expect(file.name).toBe('contract.pdf');
      expect(file.size).toBe(1024000);
      expect(file.mimeType).toBe('application/pdf');
      expect(file.downloadable).toBe(true);
    });

    it('should allow optional contentHash', () => {
      const file: CloudStorageFile = {
        id: 'file-123',
        name: 'document.docx',
        path: '/document.docx',
        pathDisplay: '/document.docx',
        size: 5000,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        modifiedAt: new Date(),
        provider: 'onedrive',
        downloadable: true,
        contentHash: 'abc123hash',
      };

      expect(file.contentHash).toBe('abc123hash');
    });
  });

  describe('CloudStorageFolderContents Interface', () => {
    it('should contain folders, files, and pagination info', () => {
      const contents: CloudStorageFolderContents = {
        folders: [
          { id: '1', name: 'Folder1', path: '/folder1', pathDisplay: '/Folder1', provider: 'dropbox' },
        ],
        files: [
          {
            id: '2',
            name: 'file.pdf',
            path: '/file.pdf',
            pathDisplay: '/file.pdf',
            size: 1000,
            mimeType: 'application/pdf',
            modifiedAt: new Date(),
            provider: 'dropbox',
            downloadable: true,
          },
        ],
        hasMore: true,
        cursor: 'cursor-abc',
      };

      expect(contents.folders).toHaveLength(1);
      expect(contents.files).toHaveLength(1);
      expect(contents.hasMore).toBe(true);
      expect(contents.cursor).toBe('cursor-abc');
    });
  });

  describe('CloudStorageError', () => {
    it('should create error with code and provider', () => {
      const error = new CloudStorageError(
        'Token expired',
        'TOKEN_EXPIRED',
        'dropbox'
      );

      expect(error.message).toBe('Token expired');
      expect(error.code).toBe('TOKEN_EXPIRED');
      expect(error.provider).toBe('dropbox');
      expect(error.name).toBe('CloudStorageError');
    });

    it('should include original error if provided', () => {
      const originalError = new Error('Network timeout');
      const error = new CloudStorageError(
        'Network error',
        'NETWORK_ERROR',
        'onedrive',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });
  });
});

describe('CloudStorageProviderFactory', () => {
  describe('getProvider', () => {
    it('should create Dropbox provider', () => {
      const provider = CloudStorageProviderFactory.getProvider('dropbox');

      expect(provider).toBeInstanceOf(DropboxProvider);
      expect(provider.providerType).toBe('dropbox');
    });

    it('should create OneDrive provider', () => {
      const provider = CloudStorageProviderFactory.getProvider('onedrive');

      expect(provider).toBeInstanceOf(OneDriveProvider);
      expect(provider.providerType).toBe('onedrive');
    });

    it('should return same instance for same provider type (singleton)', () => {
      const provider1 = CloudStorageProviderFactory.getProvider('dropbox');
      const provider2 = CloudStorageProviderFactory.getProvider('dropbox');

      expect(provider1).toBe(provider2);
    });

    it('should throw for unsupported provider', () => {
      expect(() => CloudStorageProviderFactory.getProvider('googledrive' as any))
        .toThrow('Unsupported cloud storage provider');
    });
  });

  describe('getSupportedProviders', () => {
    it('should return all supported provider types', () => {
      const providers = CloudStorageProviderFactory.getSupportedProviders();

      expect(providers).toContain('dropbox');
      expect(providers).toContain('onedrive');
      expect(providers).toHaveLength(2);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported providers', () => {
      expect(CloudStorageProviderFactory.isSupported('dropbox')).toBe(true);
      expect(CloudStorageProviderFactory.isSupported('onedrive')).toBe(true);
    });

    it('should return false for unsupported providers', () => {
      expect(CloudStorageProviderFactory.isSupported('googledrive')).toBe(false);
      expect(CloudStorageProviderFactory.isSupported('box')).toBe(false);
    });
  });

  describe('getProviderInfo', () => {
    it('should return display info for Dropbox', () => {
      const info = CloudStorageProviderFactory.getProviderInfo('dropbox');

      expect(info.type).toBe('dropbox');
      expect(info.displayName).toBe('Dropbox');
      expect(info.icon).toBe('dropbox');
      expect(info.description).toContain('Dropbox');
    });

    it('should return display info for OneDrive', () => {
      const info = CloudStorageProviderFactory.getProviderInfo('onedrive');

      expect(info.type).toBe('onedrive');
      expect(info.displayName).toBe('OneDrive');
      expect(info.icon).toBe('onedrive');
      expect(info.description).toContain('OneDrive');
    });
  });

  describe('getAllProviderInfo', () => {
    it('should return info for all providers', () => {
      const allInfo = CloudStorageProviderFactory.getAllProviderInfo();

      expect(allInfo).toHaveLength(2);
      expect(allInfo.map((i) => i.type)).toContain('dropbox');
      expect(allInfo.map((i) => i.type)).toContain('onedrive');
    });
  });
});

describe('getCloudStorageProvider helper', () => {
  it('should be a convenience function for factory', () => {
    const provider = getCloudStorageProvider('dropbox');

    expect(provider).toBeInstanceOf(DropboxProvider);
  });
});

describe('CloudStorageProvider Base Class', () => {
  let provider: DropboxProvider;

  beforeEach(() => {
    provider = new DropboxProvider();
  });

  describe('providerType', () => {
    it('should have a provider type', () => {
      expect(provider.providerType).toBe('dropbox');
    });
  });

  describe('displayName', () => {
    it('should have a display name', () => {
      expect(provider.displayName).toBe('Dropbox');
    });
  });

  describe('required methods', () => {
    it('should implement getAuthUrl', () => {
      expect(typeof provider.getAuthUrl).toBe('function');
    });

    it('should implement exchangeCode', () => {
      expect(typeof provider.exchangeCode).toBe('function');
    });

    it('should implement refreshToken', () => {
      expect(typeof provider.refreshToken).toBe('function');
    });

    it('should implement revokeToken', () => {
      expect(typeof provider.revokeToken).toBe('function');
    });

    it('should implement validateState', () => {
      expect(typeof provider.validateState).toBe('function');
    });

    it('should implement getAccountInfo', () => {
      expect(typeof provider.getAccountInfo).toBe('function');
    });

    it('should implement verifyConnection', () => {
      expect(typeof provider.verifyConnection).toBe('function');
    });

    it('should implement listFolders', () => {
      expect(typeof provider.listFolders).toBe('function');
    });

    it('should implement searchFolders', () => {
      expect(typeof provider.searchFolders).toBe('function');
    });

    it('should implement getFolderMetadata', () => {
      expect(typeof provider.getFolderMetadata).toBe('function');
    });

    it('should implement getFileMetadata', () => {
      expect(typeof provider.getFileMetadata).toBe('function');
    });

    it('should implement downloadFile', () => {
      expect(typeof provider.downloadFile).toBe('function');
    });

    it('should implement getDownloadUrl', () => {
      expect(typeof provider.getDownloadUrl).toBe('function');
    });
  });
});
