/**
 * Token 存储器（打破循环依赖）
 *
 * api.ts 和 auth.store.ts 都依赖此模块，但此模块不依赖任何其他模块。
 * 以此打破 auth.store.ts ↔ api.ts 的循环引用。
 */

import * as SecureStore from 'expo-secure-store';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let authExpiredHandler: (() => void) | null = null;

const REFRESH_TOKEN_KEY = 'nexus.refresh-token';
const USER_ID_KEY = 'nexus.user-id';

export const tokenStore = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: (): string | null => refreshToken,

  setTokens: (access: string | null, refresh: string | null) => {
    accessToken = access;
    refreshToken = refresh;
  },

  persistTokens: async (access: string, refresh: string, userId?: string) => {
    accessToken = access;
    refreshToken = refresh;
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    if (userId) {
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
    }
  },

  restoreRefreshToken: async (): Promise<string | null> => {
    const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    refreshToken = stored;
    return stored;
  },

  restoreSession: async (): Promise<{ refreshToken: string | null; userId: string | null }> => {
    const [storedRefreshToken, userId] = await Promise.all([
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(USER_ID_KEY),
    ]);
    refreshToken = storedRefreshToken;
    return { refreshToken: storedRefreshToken, userId };
  },

  clear: () => {
    accessToken = null;
    refreshToken = null;
  },

  onAuthExpired: (handler: () => void) => {
    authExpiredHandler = handler;
    return () => {
      if (authExpiredHandler === handler) authExpiredHandler = null;
    };
  },

  notifyAuthExpired: () => {
    authExpiredHandler?.();
  },

  clearPersisted: async () => {
    accessToken = null;
    refreshToken = null;
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
  },
};
