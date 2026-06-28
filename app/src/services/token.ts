/**
 * Token 存储器（打破循环依赖）
 *
 * api.ts 和 auth.store.ts 都依赖此模块，但此模块不依赖任何其他模块。
 * 以此打破 auth.store.ts ↔ api.ts 的循环引用。
 */

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokenStore = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: (): string | null => refreshToken,

  setTokens: (access: string | null, refresh: string | null) => {
    accessToken = access;
    refreshToken = refresh;
  },

  clear: () => {
    accessToken = null;
    refreshToken = null;
  },
};
