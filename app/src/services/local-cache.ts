import * as SQLite from 'expo-sqlite';

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

let databasePromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('nexus-cache.db');
  }
  const db = await databasePromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cached_users (
      user_id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_sessions (
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, session_id)
    );
    CREATE TABLE IF NOT EXISTS cached_messages (
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, message_id)
    );
    CREATE TABLE IF NOT EXISTS cached_notes (
      user_id TEXT NOT NULL,
      note_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, note_id)
    );
    CREATE TABLE IF NOT EXISTS local_media (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      owner_type TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      remote_key TEXT,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      duration_ms INTEGER,
      sync_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

function decodeRows<T>(rows: Array<{ payload: string }>): T[] {
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.payload) as T];
    } catch {
      return [];
    }
  });
}

export const localCache = {
  async saveUser(user: User): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO cached_users (user_id, payload, updated_at) VALUES (?, ?, ?)`,
      user.id,
      JSON.stringify(user),
      Date.now(),
    );
  },

  async getUser(userId: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ payload: string }>(
      `SELECT payload FROM cached_users WHERE user_id = ?`,
      userId,
    );
    if (!row) return null;
    try {
      return JSON.parse(row.payload) as User;
    } catch {
      return null;
    }
  },

  async replaceSessions(userId: string, sessions: Session[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM cached_sessions WHERE user_id = ?`, userId);
      for (const session of sessions) {
        await db.runAsync(
          `INSERT INTO cached_sessions (user_id, session_id, payload, updated_at) VALUES (?, ?, ?, ?)`,
          userId,
          session.id,
          JSON.stringify(session),
          Date.parse(session.updated_at) || Date.now(),
        );
      }
    });
  },

  async getSessions(userId: string): Promise<Session[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ payload: string }>(
      `SELECT payload FROM cached_sessions WHERE user_id = ? ORDER BY updated_at DESC`,
      userId,
    );
    return decodeRows<Session>(rows);
  },

  async replaceMessages(userId: string, sessionId: string, messages: Message[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM cached_messages WHERE user_id = ? AND session_id = ?`,
        userId,
        sessionId,
      );
      for (const message of messages) {
        await db.runAsync(
          `INSERT INTO cached_messages (user_id, session_id, message_id, payload, updated_at) VALUES (?, ?, ?, ?, ?)`,
          userId,
          sessionId,
          message.id,
          JSON.stringify(message),
          Date.parse(message.created_at) || Date.now(),
        );
      }
    });
  },

  async getMessages(userId: string, sessionId: string): Promise<Message[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ payload: string }>(
      `SELECT payload FROM cached_messages WHERE user_id = ? AND session_id = ? ORDER BY updated_at ASC`,
      userId,
      sessionId,
    );
    return decodeRows<Message>(rows);
  },

  async replaceNotes(userId: string, notes: Note[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM cached_notes WHERE user_id = ?`, userId);
      for (const note of notes) {
        await db.runAsync(
          `INSERT INTO cached_notes (user_id, note_id, payload, updated_at) VALUES (?, ?, ?, ?)`,
          userId,
          note.id,
          JSON.stringify(note),
          Date.parse(note.updated_at) || Date.now(),
        );
      }
    });
  },

  async getNotes(userId: string): Promise<Note[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ payload: string }>(
      `SELECT payload FROM cached_notes WHERE user_id = ? ORDER BY updated_at DESC`,
      userId,
    );
    return decodeRows<Note>(rows);
  },

  async saveMedia(record: LocalMediaRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO local_media
       (id, user_id, owner_type, owner_id, local_uri, remote_key, mime_type, size_bytes, duration_ms, sync_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.userId,
      record.ownerType,
      record.ownerId,
      record.localUri,
      record.remoteKey ?? null,
      record.mimeType,
      record.sizeBytes,
      record.durationMs ?? null,
      record.syncStatus,
      record.createdAt,
    );
  },

  async listMedia(userId: string, ownerId: string): Promise<LocalMediaRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      user_id: string;
      owner_type: LocalMediaRecord['ownerType'];
      owner_id: string;
      local_uri: string;
      remote_key: string | null;
      mime_type: string;
      size_bytes: number;
      duration_ms: number | null;
      sync_status: LocalMediaRecord['syncStatus'];
      created_at: string;
    }>(`SELECT * FROM local_media WHERE user_id = ? AND owner_id = ?`, userId, ownerId);
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      ownerType: row.owner_type,
      ownerId: row.owner_id,
      localUri: row.local_uri,
      remoteKey: row.remote_key,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      durationMs: row.duration_ms,
      syncStatus: row.sync_status,
      createdAt: row.created_at,
    }));
  },

  async clearUserData(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM cached_users WHERE user_id = ?`, userId);
      await db.runAsync(`DELETE FROM cached_sessions WHERE user_id = ?`, userId);
      await db.runAsync(`DELETE FROM cached_messages WHERE user_id = ?`, userId);
      await db.runAsync(`DELETE FROM cached_notes WHERE user_id = ?`, userId);
      await db.runAsync(`DELETE FROM local_media WHERE user_id = ?`, userId);
    });
  },
};
