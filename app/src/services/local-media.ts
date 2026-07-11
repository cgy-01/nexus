import * as FileSystem from 'expo-file-system/legacy';

import { localCache, type LocalMediaRecord } from '@/services/local-cache';

function mediaDirectory(userId: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${FileSystem.documentDirectory}nexus-media/${safeUserId}/`;
}

function fileExtension(uri: string): string {
  const match = uri.match(/\.[a-zA-Z0-9]{1,10}(?:\?.*)?$/);
  return match ? match[0].split('?')[0] : '';
}

export const localMedia = {
  async importFile(input: Omit<LocalMediaRecord, 'id' | 'localUri' | 'sizeBytes' | 'createdAt' | 'syncStatus'> & {
    sourceUri: string;
    syncStatus?: LocalMediaRecord['syncStatus'];
  }): Promise<LocalMediaRecord> {
    const directory = mediaDirectory(input.userId);
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

    const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const localUri = `${directory}${id}${fileExtension(input.sourceUri)}`;
    await FileSystem.copyAsync({ from: input.sourceUri, to: localUri });
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) {
      throw new Error('无法读取本地媒体文件');
    }
    const record: LocalMediaRecord = {
      id,
      userId: input.userId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      localUri,
      remoteKey: input.remoteKey ?? null,
      mimeType: input.mimeType,
      sizeBytes: info.size,
      durationMs: input.durationMs ?? null,
      syncStatus: input.syncStatus ?? 'local',
      createdAt: new Date().toISOString(),
    };
    await localCache.saveMedia(record);
    return record;
  },

  async clearUserFiles(userId: string): Promise<void> {
    await FileSystem.deleteAsync(mediaDirectory(userId), { idempotent: true });
  },
};
