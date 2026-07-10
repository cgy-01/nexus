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

export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
  source: string;
  region: string;
  site_name?: string | null;
  site_icon?: string | null;
  published_at?: string | null;
  score?: number | null;
}

export interface SearchMetadata {
  enabled: boolean;
  provider?: string | null;
  region: string;
  status: 'success' | 'empty' | 'failed' | 'disabled';
  sources: SearchSource[];
  error?: string | null;
  log_id?: string | null;
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

export interface ModelOption {
  id: string;
  name: string;
}

export interface ChatRequest {
  session_id?: string;
  content: string;
  model?: string;
  enable_search?: boolean;
  search_region?: 'mainland' | 'auto';
}

/** SSE 事件类型 */
export interface SSETokenEvent {
  content: string;
}

export interface SSEDoneEvent {
  total_tokens: number;
  model: string;
  session_id: string;
  search?: SearchMetadata;
  agent?: {
    search_count: number;
    source_count: number;
    elapsed_ms: number;
    stop_reason: string;
  };
}

export interface SSESourcesEvent extends SearchMetadata {}

export interface SSEAgentStatusEvent {
  stage: 'planning' | 'searching' | 'reviewing' | 'answering';
  step?: number;
}

export interface SSEErrorEvent {
  code: string;
  message: string;
}
