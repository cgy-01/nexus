import type { Message, Session } from '@/types/chat';
import type { Note } from '@/types/document';
import type { User } from '@/types/auth';

export interface LocalMediaRecord {
  id: string;
  userId: string;
  ownerType: 'message' | 'note';
  ownerId: string;
  localUri: string;
  remoteKey?: string | null;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number | null;
  syncStatus: 'local' | 'uploading' | 'synced' | 'failed';
  createdAt: string;
}

const memoryCache = new Map<string, unknown>();

function read<T>(key: string): T | null {
  const memoryValue = memoryCache.get(key);
  if (memoryValue !== undefined) return memoryValue as T;
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(`nexus:${key}`);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as T;
    memoryCache.set(key, value);
    return value;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  memoryCache.set(key, value);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`nexus:${key}`, JSON.stringify(value));
  }
}

function remove(key: string): void {
  memoryCache.delete(key);
  if (typeof localStorage !== 'undefined') localStorage.removeItem(`nexus:${key}`);
}

function userKey(userId: string, type: string): string {
  return `${type}:${userId}`;
}

export const localCache = {
  async saveUser(user: User): Promise<void> {
    write(userKey(user.id, 'user'), user);
  },

  async getUser(userId: string): Promise<User | null> {
    return read<User>(userKey(userId, 'user'));
  },

  async replaceSessions(userId: string, sessions: Session[]): Promise<void> {
    write(userKey(userId, 'sessions'), sessions);
  },

  async getSessions(userId: string): Promise<Session[]> {
    return read<Session[]>(userKey(userId, 'sessions')) ?? [];
  },

  async replaceMessages(userId: string, sessionId: string, messages: Message[]): Promise<void> {
    write(`${userKey(userId, 'messages')}:${sessionId}`, messages);
  },

  async getMessages(userId: string, sessionId: string): Promise<Message[]> {
    return read<Message[]>(`${userKey(userId, 'messages')}:${sessionId}`) ?? [];
  },

  async replaceNotes(userId: string, notes: Note[]): Promise<void> {
    write(userKey(userId, 'notes'), notes);
  },

  async getNotes(userId: string): Promise<Note[]> {
    return read<Note[]>(userKey(userId, 'notes')) ?? [];
  },

  async saveMedia(record: LocalMediaRecord): Promise<void> {
    const records = read<LocalMediaRecord[]>(userKey(record.userId, 'media')) ?? [];
    write(userKey(record.userId, 'media'), [...records.filter((item) => item.id !== record.id), record]);
  },

  async listMedia(userId: string, ownerId: string): Promise<LocalMediaRecord[]> {
    const records = read<LocalMediaRecord[]>(userKey(userId, 'media')) ?? [];
    return records.filter((record) => record.ownerId === ownerId);
  },

  async clearUserData(userId: string): Promise<void> {
    const keys = [
      userKey(userId, 'user'),
      userKey(userId, 'sessions'),
      userKey(userId, 'notes'),
      userKey(userId, 'media'),
    ];
    keys.forEach(remove);
    [...memoryCache.keys()]
      .filter((key) => key.startsWith(userKey(userId, 'messages')))
      .forEach(remove);
  },
};
