/**
 * 文档/笔记 API 调用
 */

import api from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Note, CreateNoteRequest } from '@/types/document';
import type { Message } from '@/types/chat';

export interface GenerateNoteRequest {
  messages: Pick<Message, 'role' | 'content'>[];
}

export const documentService = {
  /** 获取笔记列表 */
  async getNotes(page = 1, pageSize = 50): Promise<ApiResponse<PaginatedResponse<Note>>> {
    const { data } = await api.get('/documents', { params: { page, page_size: pageSize } });
    return data;
  },

  /** 获取笔记详情 */
  async getNote(id: string): Promise<ApiResponse<Note>> {
    const { data } = await api.get(`/documents/${id}`);
    return data;
  },

  /** 创建笔记 */
  async createNote(req: CreateNoteRequest): Promise<ApiResponse<Note>> {
    const { data } = await api.post('/documents', req);
    return data;
  },

  /** 删除笔记 */
  async deleteNote(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  /** 从对话生成笔记 */
  async generateNoteFromChat(req: GenerateNoteRequest): Promise<ApiResponse<Note>> {
    const { data } = await api.post('/documents/generate', req);
    return data;
  },
};
