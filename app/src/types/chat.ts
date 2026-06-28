/** 聊天相关类型 */

export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  token_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Session {
  id: string;
  title: string;
  model: string;
  total_tokens: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatRequest {
  session_id?: string;
  content: string;
}

/** SSE 事件类型 */
export interface SSETokenEvent {
  content: string;
}

export interface SSEDoneEvent {
  total_tokens: number;
  model: string;
  session_id: string;
}

export interface SSEErrorEvent {
  code: string;
  message: string;
}
