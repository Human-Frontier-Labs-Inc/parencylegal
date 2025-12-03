/**
 * Cloud Storage Provider Factory
 * Creates provider instances based on type
 */

import { CloudStorageProviderType } from './types';
import { CloudStorageProvider } from './provider-interface';
import { DropboxProvider } from './providers/dropbox';
import { OneDriveProvider } from './providers/onedrive';

/**
 * Factory for creating cloud storage provider instances
 */
export class CloudStorageProviderFactory {
  private static providers: Map<CloudStorageProviderType, CloudStorageProvider> = new Map();

  /**
   * Get or create a provider instance
   * Providers are singletons - same instance is reused
   */
  static getProvider(type: CloudStorageProviderType): CloudStorageProvider {
    let provider = this.providers.get(type);

    if (!provider) {
      provider = this.createProvider(type);
      this.providers.set(type, provider);
    }

    return provider;
  }

  /**
   * Create a new provider instance
   */
  private static createProvider(type: CloudStorageProviderType): CloudStorageProvider {
    switch (type) {
      case 'dropbox':
        return new DropboxProvider();
      case 'onedrive':
        return new OneDriveProvider();
      default:
        throw new Error(`Unsupported cloud storage provider: ${type}`);
    }
  }

  /**
   * Get all supported provider types
   */
  static getSupportedProviders(): CloudStorageProviderType[] {
    return ['dropbox', 'onedrive'];
  }

  /**
   * Check if a provider type is supported
   */
  static isSupported(type: string): type is CloudStorageProviderType {
    return ['dropbox', 'onedrive'].includes(type);
  }

  /**
   * Get provider display info for UI
   */
  static getProviderInfo(type: CloudStorageProviderType): {
    type: CloudStorageProviderType;
    displayName: string;
    icon: string;
    description: string;
  } {
    const info: Record<CloudStorageProviderType, { displayName: string; icon: string; description: string }> = {
      dropbox: {
        displayName: 'Dropbox',
        icon: 'dropbox',
        description: 'Connect your Dropbox account to access files and folders',
      },
      onedrive: {
        displayName: 'OneDrive',
        icon: 'onedrive',
        description: 'Connect your Microsoft OneDrive account to access files and folders',
      },
    };

    return { type, ...info[type] };
  }

  /**
   * Get all provider info for UI
   */
  static getAllProviderInfo() {
    return this.getSupportedProviders().map((type) => this.getProviderInfo(type));
  }
}

/**
 * Convenience function to get a provider
 */
export function getCloudStorageProvider(type: CloudStorageProviderType): CloudStorageProvider {
  return CloudStorageProviderFactory.getProvider(type);
}
