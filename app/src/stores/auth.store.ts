/**
 * 认证状态管理
 *
 * 管理用户登录态、JWT token、注册/登录/注销流程。
 * token 同时写入 tokenStore（供 api.ts 拦截器使用）。
 */

import { create } from 'zustand';
import { authService } from '@/services/auth.service';
import { localCache } from '@/services/local-cache';
import { localMedia } from '@/services/local-media';
import { tokenStore } from '@/services/token';
import type {
  User,
  EmailCodeRequest,
  EmailCodeVerifyRequest,
  LoginRequest,
  RegisterRequest,
} from '@/types/auth';

interface AuthState {
  /* ── 数据 ── */
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  /* ── 派生状态 ── */
  isLoggedIn: boolean;
  isLoading: boolean;

  /* ── 操作 ── */
  requestEmailCode: (req: EmailCodeRequest) => Promise<string>;
  verifyEmailCode: (req: EmailCodeVerifyRequest) => Promise<void>;
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (tokens: { access_token: string; refresh_token: string; token_type: string }) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoggedIn: false,
  isLoading: true,

  requestEmailCode: async (req) => {
    const res = await authService.requestEmailCode(req);
    return res.data.message;
  },

  verifyEmailCode: async (req) => {
    const res = await authService.verifyEmailCode(req);
    const { access_token, refresh_token } = res.data;
    await tokenStore.persistTokens(access_token, refresh_token, res.data.user.id);
    await localCache.saveUser(res.data.user);
    set({
      user: res.data.user,
      accessToken: access_token,
      refreshToken: refresh_token,
      isLoggedIn: true,
    });
  },

  login: async (req) => {
    const res = await authService.login(req);
    const { access_token, refresh_token } = res.data;
    await tokenStore.persistTokens(access_token, refresh_token, res.data.user.id);
    await localCache.saveUser(res.data.user);
    set({
      user: res.data.user,
      accessToken: access_token,
      refreshToken: refresh_token,
      isLoggedIn: true,
    });
  },

  register: async (req) => {
    const res = await authService.register(req);
    const { access_token, refresh_token } = res.data;
    await tokenStore.persistTokens(access_token, refresh_token, res.data.user.id);
    await localCache.saveUser(res.data.user);
    set({
      user: res.data.user,
      accessToken: access_token,
      refreshToken: refresh_token,
      isLoggedIn: true,
    });
  },

  logout: async () => {
    const userId = useAuthStore.getState().user?.id;
    await authService.logout().catch(() => {});
    await tokenStore.clearPersisted();
    if (userId) {
      await localCache.clearUserData(userId);
      await localMedia.clearUserFiles(userId);
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoggedIn: false,
    });
  },

  setTokens: (tokens) => {
    tokenStore.setTokens(tokens.access_token, tokens.refresh_token);
    set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  },

  setUser: (user) => {
    set({ user });
    void localCache.saveUser(user);
  },

  clearSession: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoggedIn: false,
    });
  },

  hydrate: async () => {
    let cachedUser: User | null = null;
    let restoredRefreshToken: string | null = null;
    try {
      const { refreshToken, userId } = await tokenStore.restoreSession();
      if (!refreshToken) return;
      restoredRefreshToken = refreshToken;

      cachedUser = userId ? await localCache.getUser(userId) : null;
      if (cachedUser) {
        set({ user: cachedUser, refreshToken, isLoggedIn: true });
      }

      const refreshed = await authService.refresh(refreshToken);
      tokenStore.setTokens(refreshed.data.access_token, refreshed.data.refresh_token);
      const user = await authService.getMe();
      await tokenStore.persistTokens(
        refreshed.data.access_token,
        refreshed.data.refresh_token,
        user.data.id,
      );
      await localCache.saveUser(user.data);
      set({
        user: user.data,
        accessToken: refreshed.data.access_token,
        refreshToken: refreshed.data.refresh_token,
        isLoggedIn: true,
      });
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (cachedUser && !status) {
        set({ user: cachedUser, refreshToken: restoredRefreshToken, isLoggedIn: true });
      } else {
        await tokenStore.clearPersisted();
        set({ user: null, accessToken: null, refreshToken: null, isLoggedIn: false });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
