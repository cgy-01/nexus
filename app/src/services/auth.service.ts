/**
 * 认证 API 调用
 */

import api from './api';
import type { ApiResponse } from '@/types/api';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth';

export const authService = {
  /** 登录 */
  async login(req: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const { data } = await api.post('/auth/login', req);
    return data;
  },

  /** 注册 */
  async register(req: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const { data } = await api.post('/auth/register', req);
    return data;
  },

  /** 刷新 token */
  async refresh(refreshToken: string): Promise<ApiResponse<{ access_token: string; refresh_token: string; token_type: string }>> {
    const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return data;
  },

  /** 注销（吊销 refresh token） */
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  /** 获取当前用户信息 */
  async getMe(): Promise<ApiResponse<User>> {
    const { data } = await api.get('/users/me');
    return data;
  },
};
