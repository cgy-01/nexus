/**
 * 聊天 API 调用
 *
 * SSE 流式请求使用 fetch + ReadableStream，不走 Axios
 */

import api, { BASE_URL } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { ChatRequest, Message, Session } from '@/types/chat';

export const chatService = {
  /** 获取会话列表 */
  async getSessions(page = 1, pageSize = 20): Promise<ApiResponse<PaginatedResponse<Session>>> {
    const { data } = await api.get('/sessions', { params: { page, page_size: pageSize } });
    return data;
  },

  /** 创建新会话 */
  async createSession(title?: string): Promise<ApiResponse<Session>> {
    const { data } = await api.post('/sessions', { title });
    return data;
  },

  /** 获取会话详情 */
  async getSession(id: string): Promise<ApiResponse<Session>> {
    const { data } = await api.get(`/sessions/${id}`);
    return data;
  },

  /** 删除会话 */
  async deleteSession(id: string): Promise<void> {
    await api.delete(`/sessions/${id}`);
  },

  /** 获取消息历史 */
  async getMessages(sessionId: string, page = 1, pageSize = 50): Promise<ApiResponse<PaginatedResponse<Message>>> {
    const { data } = await api.get(`/sessions/${sessionId}/messages`, {
      params: { page, page_size: pageSize },
    });
    return data;
  },

  /**
   * SSE 流式发送消息
   *
   * 返回 fetch Response 对象，调用方自行通过 ReadableStream 解析 SSE
   */
  async sendMessageStream(req: ChatRequest, accessToken: string): Promise<Response> {
    const body: Record<string, unknown> = { content: req.content };
    if (req.session_id) {
      body.session_id = req.session_id;
    }
    if (req.enable_search) {
      body.enable_search = req.enable_search;
      body.search_region = req.search_region ?? 'mainland';
    }

    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || `HTTP ${response.status}`);
    }

    return response;
  },
};
