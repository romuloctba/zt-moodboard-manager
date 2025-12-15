/**
 * Google Drive Service
 * 
 * Provides CRUD operations for Google Drive API.
 * Uses the app data folder (hidden from user) for sync storage.
 */

import { retryWithBackoff } from '@/lib/utils/retry';
import { googleAuth } from './googleAuth';
import {
  SYNC_CONSTANTS,
  type DriveFileMetadata,
  type DriveListResponse
} from './types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

class GoogleDriveService {
  private appFolderId: string | null = null;
  private folderIds: Map<string, string> = new Map();

  /**
   * Get authorization headers
   */
  private async getHeaders(): Promise<HeadersInit> {
    const token = await googleAuth.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Make an authenticated request to Drive API
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    return retryWithBackoff(async () => {
      const headers = await this.getHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`Drive API Error: ${error.error?.message || response.statusText}`);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) return {} as T;

      return JSON.parse(text);
    });
  }

  /**
   * Initialize the Drive service - ensures app folder exists
   */
  async initialize(): Promise<void> {
    // Get or create the app folder in appDataFolder
    this.appFolderId = await this.getOrCreateAppFolder();

    // Pre-create subfolders
    await Promise.all([
      this.getOrCreateSubFolder(SYNC_CONSTANTS.PROJECTS_FOLDER),
      this.getOrCreateSubFolder(SYNC_CONSTANTS.CHARACTERS_FOLDER),
      this.getOrCreateSubFolder(SYNC_CONSTANTS.IMAGES_FOLDER),
      this.getOrCreateSubFolder(SYNC_CONSTANTS.FILES_FOLDER),
      this.getOrCreateSubFolder(SYNC_CONSTANTS.EDITIONS_FOLDER),
      this.getOrCreateSubFolder(SYNC_CONSTANTS.SCRIPT_PAGES_FOLDER),
      this.getOrCreateSubFolder(SYNC_CONSTANTS.PANELS_FOLDER),
    ]);
  }

  /**
   * Get or create the main app folder
   */
  private async getOrCreateAppFolder(): Promise<string> {
    const headers = await this.getHeaders();

    // Search for existing folder
    const query = encodeURIComponent(
      `name='${SYNC_CONSTANTS.ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );

    const listUrl = `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`;
    const listResponse = await this.request<DriveListResponse>(listUrl);

    if (listResponse.files && listResponse.files.length > 0) {
      return listResponse.files[0].id;
    }

    // Create folder
    const metadata = {
      name: SYNC_CONSTANTS.ROOT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['appDataFolder'],
    };

    const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create app folder');
    }

    const folder: DriveFileMetadata = await createResponse.json();
    return folder.id;
  }

  /**
   * Get or create a subfolder within the app folder
   */
  private async getOrCreateSubFolder(name: string): Promise<string> {
    // Check cache
    if (this.folderIds.has(name)) {
      return this.folderIds.get(name)!;
    }

    if (!this.appFolderId) {
      throw new Error('App folder not initialized');
    }

    const headers = await this.getHeaders();

    // Search for existing folder
    const query = encodeURIComponent(
      `name='${name}' and '${this.appFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );

    const listUrl = `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`;
    const listResponse = await this.request<DriveListResponse>(listUrl);

    if (listResponse.files && listResponse.files.length > 0) {
      this.folderIds.set(name, listResponse.files[0].id);
      return listResponse.files[0].id;
    }

    // Create folder
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [this.appFolderId],
    };

    const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create folder: ${name}`);
    }

    const folder: DriveFileMetadata = await createResponse.json();
    this.folderIds.set(name, folder.id);
    return folder.id;
  }

  /**
   * Get folder ID by name
   */
  async getFolderId(folderName: string): Promise<string> {
    if (!this.folderIds.has(folderName)) {
      await this.getOrCreateSubFolder(folderName);
    }
    return this.folderIds.get(folderName)!;
  }

  /**
   * List files in a folder
   */
  async listFiles(folderName?: string): Promise<DriveFileMetadata[]> {
    const parentId = folderName
      ? await this.getFolderId(folderName)
      : this.appFolderId;

    if (!parentId) {
      throw new Error('Parent folder not found');
    }

    const query = encodeURIComponent(
      `'${parentId}' in parents and trashed=false`
    );

    const url = `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&fields=files(id,name,mimeType,size,modifiedTime,appProperties)`;
    const response = await this.request<DriveListResponse>(url);

    return response.files || [];
  }

  /**
   * Get a file by name in a folder
   */
  async getFileByName(
    fileName: string,
    folderName?: string
  ): Promise<DriveFileMetadata | null> {
    const parentId = folderName
      ? await this.getFolderId(folderName)
      : this.appFolderId;

    if (!parentId) {
      throw new Error('Parent folder not found');
    }

    const query = encodeURIComponent(
      `name='${fileName}' and '${parentId}' in parents and trashed=false`
    );

    const url = `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&fields=files(id,name,mimeType,size,modifiedTime,appProperties)`;
    const response = await this.request<DriveListResponse>(url);

    return response.files?.[0] || null;
  }

  /**
   * Download file content as text (for JSON files)
   */
  async downloadAsText(fileId: string): Promise<string> {
    const headers = await this.getHeaders();
    const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Download file content as JSON
   */
  async downloadAsJson<T>(fileId: string): Promise<T> {
    const text = await this.downloadAsText(fileId);
    return JSON.parse(text);
  }

  /**
   * Download file content as Blob (for binary files)
   */
  async downloadAsBlob(fileId: string): Promise<Blob> {
    const headers = await this.getHeaders();
    const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Upload a JSON file
   */
  async uploadJson(
    fileName: string,
    data: unknown,
    folderName?: string,
    existingFileId?: string
  ): Promise<DriveFileMetadata> {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    return this.uploadFile(fileName, blob, 'application/json', folderName, existingFileId);
  }

  /**
   * Upload a binary file
   */
  async uploadFile(
    fileName: string,
    content: Blob,
    mimeType: string,
    folderName?: string,
    existingFileId?: string
  ): Promise<DriveFileMetadata> {
    const headers = await this.getHeaders();

    // Determine parent folder
    const parentId = folderName
      ? await this.getFolderId(folderName)
      : this.appFolderId;

    if (!parentId) {
      throw new Error('Parent folder not found');
    }

    // Use multipart upload for simplicity
    const metadata: Record<string, unknown> = {
      name: fileName,
      mimeType,
    };

    // Only set parents for new files
    if (!existingFileId) {
      metadata.parents = [parentId];
    }

    // Create multipart body
    const boundary = '-------moodboard-sync-boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart =
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata);

    // Build multipart body
    const contentArrayBuffer = await content.arrayBuffer();
    const metadataBytes = new TextEncoder().encode(
      delimiter + metadataPart + delimiter + `Content-Type: ${mimeType}\r\n\r\n`
    );
    const closeBytes = new TextEncoder().encode(closeDelimiter);

    const bodyParts = new Uint8Array(
      metadataBytes.length + contentArrayBuffer.byteLength + closeBytes.length
    );
    bodyParts.set(metadataBytes, 0);
    bodyParts.set(new Uint8Array(contentArrayBuffer), metadataBytes.length);
    bodyParts.set(closeBytes, metadataBytes.length + contentArrayBuffer.byteLength);

    // Choose endpoint based on create vs update
    const url = existingFileId
      ? `${DRIVE_UPLOAD_BASE}/files/${existingFileId}?uploadType=multipart`
      : `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`;

    const method = existingFileId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: bodyParts,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to upload file: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    const headers = await this.getHeaders();
    const url = `${DRIVE_API_BASE}/files/${fileId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }

  /**
   * Get storage quota info
   */
  async getStorageQuota(): Promise<{ used: number; limit: number }> {
    const url = `${DRIVE_API_BASE}/about?fields=storageQuota`;
    const response = await this.request<{
      storageQuota: { usage: string; limit: string };
    }>(url);

    return {
      used: parseInt(response.storageQuota.usage, 10),
      limit: parseInt(response.storageQuota.limit, 10),
    };
  }

  // ===========================================
  // Convenience methods for sync operations
  // ===========================================

  /**
   * Get the manifest file
   */
  async getManifest<T>(): Promise<T | null> {
    const file = await this.getFileByName(SYNC_CONSTANTS.MANIFEST_FILE_NAME);
    if (!file) return null;
    return this.downloadAsJson<T>(file.id);
  }

  /**
   * Save the manifest file
   */
  async saveManifest(manifest: unknown): Promise<DriveFileMetadata> {
    const existingFile = await this.getFileByName(SYNC_CONSTANTS.MANIFEST_FILE_NAME);
    return this.uploadJson(
      SYNC_CONSTANTS.MANIFEST_FILE_NAME,
      manifest,
      undefined,
      existingFile?.id
    );
  }

  /**
   * Get a project file
   */
  async getProject<T>(projectId: string): Promise<T | null> {
    const file = await this.getFileByName(
      `${projectId}.json`,
      SYNC_CONSTANTS.PROJECTS_FOLDER
    );
    if (!file) return null;
    return this.downloadAsJson<T>(file.id);
  }

  /**
   * Save a project file
   */
  async saveProject(projectId: string, data: unknown): Promise<DriveFileMetadata> {
    const existingFile = await this.getFileByName(
      `${projectId}.json`,
      SYNC_CONSTANTS.PROJECTS_FOLDER
    );
    return this.uploadJson(
      `${projectId}.json`,
      data,
      SYNC_CONSTANTS.PROJECTS_FOLDER,
      existingFile?.id
    );
  }

  /**
   * Delete a project file
   */
  async deleteProject(projectId: string): Promise<void> {
    const file = await this.getFileByName(
      `${projectId}.json`,
      SYNC_CONSTANTS.PROJECTS_FOLDER
    );
    if (file) {
      await this.deleteFile(file.id);
    }
  }

  /**
   * Get a character file
   */
  async getCharacter<T>(characterId: string): Promise<T | null> {
    const file = await this.getFileByName(
      `${characterId}.json`,
      SYNC_CONSTANTS.CHARACTERS_FOLDER
    );
    if (!file) return null;
    return this.downloadAsJson<T>(file.id);
  }

  /**
   * Save a character file
   */
  async saveCharacter(characterId: string, data: unknown): Promise<DriveFileMetadata> {
    const existingFile = await this.getFileByName(
      `${characterId}.json`,
      SYNC_CONSTANTS.CHARACTERS_FOLDER
    );
    return this.uploadJson(
      `${characterId}.json`,
      data,
      SYNC_CONSTANTS.CHARACTERS_FOLDER,
      existingFile?.id
    );
  }

  /**
   * Delete a character file
   */
  async deleteCharacter(characterId: string): Promise<void> {
    const file = await this.getFileByName(
      `${characterId}.json`,
      SYNC_CONSTANTS.CHARACTERS_FOLDER
    );
    if (file) {
      await this.deleteFile(file.id);
    }
  }

  /**
   * Get image metadata
   */
  async getImageMeta<T>(imageId: string): Promise<T | null> {
    const file = await this.getFileByName(
      `${imageId}.json`,
      SYNC_CONSTANTS.IMAGES_FOLDER
    );
    if (!file) return null;
    return this.downloadAsJson<T>(file.id);
  }

  /**
   * Save image metadata
   */
  async saveImageMeta(imageId: string, data: unknown): Promise<DriveFileMetadata> {
    const existingFile = await this.getFileByName(
      `${imageId}.json`,
      SYNC_CONSTANTS.IMAGES_FOLDER
    );
    return this.uploadJson(
      `${imageId}.json`,
      data,
      SYNC_CONSTANTS.IMAGES_FOLDER,
      existingFile?.id
    );
  }

  /**
   * Delete image metadata
   */
  async deleteImageMeta(imageId: string): Promise<void> {
    const file = await this.getFileByName(
      `${imageId}.json`,
      SYNC_CONSTANTS.IMAGES_FOLDER
    );
    if (file) {
      await this.deleteFile(file.id);
    }
  }

  /**
   * Get image file (binary)
   */
  async getImageFile(imageId: string): Promise<Blob | null> {
    const file = await this.getFileByName(
      `${imageId}.webp`,
      SYNC_CONSTANTS.FILES_FOLDER
    );
    if (!file) return null;
    return this.downloadAsBlob(file.id);
  }

  /**
   * Save image file (binary)
   */
  async saveImageFile(imageId: string, blob: Blob): Promise<DriveFileMetadata> {
    const existingFile = await this.getFileByName(
      `${imageId}.webp`,
      SYNC_CONSTANTS.FILES_FOLDER
    );
    return this.uploadFile(
      `${imageId}.webp`,
      blob,
      'image/webp',
      SYNC_CONSTANTS.FILES_FOLDER,
      existingFile?.id
    );
  }

  /**
   * Delete image file
   */
  async deleteImageFile(imageId: string): Promise<void> {
    const file = await this.getFileByName(
      `${imageId}.webp`,
      SYNC_CONSTANTS.FILES_FOLDER
    );
    if (file) {
      await this.deleteFile(file.id);
    }
  }

  /**
   * Get thumbnail file
   */
  async getThumbnailFile(imageId: string): Promise<Blob | null> {
    const file = await this.getFileByName(
      `${imageId}_thumb.webp`,
      SYNC_CONSTANTS.FILES_FOLDER
    );
    if (!file) return null;
    return this.downloadAsBlob(file.id);
  }

  /**
   * Save thumbnail file
   */
  async saveThumbnailFile(imageId: string, blob: Blob): Promise<DriveFileMetadata> {
    const existingFile = await this.getFileByName(
      `${imageId}_thumb.webp`,
      SYNC_CONSTANTS.FILES_FOLDER
    );
    return this.uploadFile(
      `${imageId}_thumb.webp`,
      blob,
      'image/webp',
      SYNC_CONSTANTS.FILES_FOLDER,
      existingFile?.id
    );
  }

  /**
   * Delete thumbnail file
   */
  async deleteThumbnailFile(imageId: string): Promise<void> {
    const file = await this.getFileByName(
      `${imageId}_thumb.webp`,
      SYNC_CONSTANTS.FILES_FOLDER
    );
    if (file) {
      await this.deleteFile(file.id);
    }
  }

  /**
   * Get an edition file
   */
  async getEdition<T>(editionId: string): Promise<T | null> {
    const file = await this.getFileByName(
      `${editionId}.json`,
      SYNC_CONSTANTS.EDITIONS_FOLDER
    );
    if (!file) return null;
    return this.downloadAsJson<T>(file.id);
  }

  /**
   * Save an edition file
   */
  async saveEdition(editionId: string, data: unknown): Promise<DriveFileMetadata> {
    const existingFile = await this.getFileByName(
      `${editionId}.json`,
      SYNC_CONSTANTS.EDITIONS_FOLDER
    );
    return this.uploadJson(
      `${editionId}.json`,
      data,
      SYNC_CONSTANTS.EDITIONS_FOLDER,
      existingFile?.id
    );
  }

  /**
   * Delete an edition file
   */
  async deleteEdition(editionId: string): Promise<void> {
    const file = await this.getFileByName(
      `${editionId}.json`,
      SYNC_CONSTANTS.EDITIONS_FOLDER
    );
    if (file) {
      await this.deleteFile(file.id);
    }
  }

  /**
   * Get a script page file
   */
  async getScriptPage<T>(pageId: string): Promise<T | null> {
    const file = await this.getFileByName(
      `${pageId}.json`,
      SYNC_CONSTANTS.SCRIPT_PAGES_FOLDER
    );
    if (!file) return null;
    return this.downloadAsJson<T>(file.id);
  }

  /**
   * Save a script page file
   */
  async saveScriptPage(pageId: string, data: unknown): Promise<DriveFileMetadata> {
    const existingFile = await this.getFileByName(
      `${pageId}.json`,
      SYNC_CONSTANTS.SCRIPT_PAGES_FOLDER
    );
    return this.uploadJson(
      `${pageId}.json`,
      data,
      SYNC_CONSTANTS.SCRIPT_PAGES_FOLDER,
      existingFile?.id
    );
  }

  /**
   * Delete a script page file
   */
  async deleteScriptPage(pageId: string): Promise<void> {
    const file = await this.getFileByName(
      `${pageId}.json`,
      SYNC_CONSTANTS.SCRIPT_PAGES_FOLDER
    );
    if (file) {
      await this.deleteFile(file.id);
    }
  }

  /**
   * Get a panel file
   */
  async getPanel<T>(panelId: string): Promise<T | null> {
    const file = await this.getFileByName(
      `${panelId}.json`,
      SYNC_CONSTANTS.PANELS_FOLDER
    );
    if (!file) return null;
    return this.downloadAsJson<T>(file.id);
  }

  /**
   * Save a panel file
   */
  async savePanel(panelId: string, data: unknown): Promise<DriveFileMetadata> {
    const existingFile = await this.getFileByName(
      `${panelId}.json`,
      SYNC_CONSTANTS.PANELS_FOLDER
    );
    return this.uploadJson(
      `${panelId}.json`,
      data,
      SYNC_CONSTANTS.PANELS_FOLDER,
      existingFile?.id
    );
  }

  /**
   * Delete a panel file
   */
  async deletePanel(panelId: string): Promise<void> {
    const file = await this.getFileByName(
      `${panelId}.json`,
      SYNC_CONSTANTS.PANELS_FOLDER
    );
    if (file) {
      await this.deleteFile(file.id);
    }
  }
}

// Singleton instance
export const googleDrive = new GoogleDriveService();
