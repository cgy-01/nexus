/**
 * 认证状态管理
 *
 * 管理用户登录态、JWT token、注册/登录/注销流程。
 * token 同时写入 tokenStore（供 api.ts 拦截器使用）。
 */

import { create } from 'zustand';
import { authService } from '@/services/auth.service';
import { tokenStore } from '@/services/token';
import type { User, LoginRequest, RegisterRequest } from '@/types/auth';

interface AuthState {
  /* ── 数据 ── */
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  /* ── 派生状态 ── */
  isLoggedIn: boolean;
  isLoading: boolean;

  /* ── 操作 ── */
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<void>;
  logout: () => void;
  setTokens: (tokens: { access_token: string; refresh_token: string; token_type: string }) => void;
  setUser: (user: User) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoggedIn: false,
  isLoading: true,

  login: async (req) => {
    const res = await authService.login(req);
    const { access_token, refresh_token } = res.data;
    tokenStore.setTokens(access_token, refresh_token);
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
    tokenStore.setTokens(access_token, refresh_token);
    set({
      user: res.data.user,
      accessToken: access_token,
      refreshToken: refresh_token,
      isLoggedIn: true,
    });
  },

  logout: () => {
    authService.logout().catch(() => {});
    tokenStore.clear();
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
  },

  hydrate: () => {
    // 启动时从 tokenStore 恢复 token（如果有持久化）
    const access = tokenStore.getAccessToken();
    if (access) {
      set({ accessToken: access, refreshToken: tokenStore.getRefreshToken() });
      // TODO: 用 access token 调 /users/me 验证有效性
    }
    set({ isLoading: false });
  },
}));
