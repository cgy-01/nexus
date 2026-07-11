/** 认证相关类型 */

export interface EmailCodeRequest {
  email: string;
}

export interface EmailCodeVerifyRequest {
  email: string;
  code: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  uid?: string | null;
  phone?: string | null;
  wechat?: string | null;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}
