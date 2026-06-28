/**
 * SSE 流式消费 Hook
 *
 * 用于在 React 组件中消费 Server-Sent Events 流，
 * 将 fetch Response 的 ReadableStream 逐行解析为 SSE 事件。
 *
 * 事件格式（服务端约定）：
 *   event: token
 *   data: {"content": "你好"}
 *
 *   event: done
 *   data: {"total_tokens": 156, "model": "gpt-4o"}
 *
 *   event: error
 *   data: {"code": "rate_limited", "message": "请求过于频繁"}
 *
 * 用法：
 *   const { content, isStreaming, error, startStream, abort } = useSSE({
 *     onToken: (t) => console.log(t),
 *     onDone: (meta) => console.log('done', meta),
 *   });
 *   await startStream(response);
 */

import { useState, useRef, useCallback } from 'react';

export interface SSECallbacks {
  onToken?: (content: string) => void;
  onDone?: (meta: { totalTokens: number; model: string }) => void;
  onError?: (error: { code: string; message: string }) => void;
}

export interface UseSSEReturn {
  content: string;
  isStreaming: boolean;
  error: { code: string; message: string } | null;
  startStream: (response: Response) => Promise<void>;
  abort: () => void;
}

export function useSSE(callbacks?: SSECallbacks): UseSSEReturn {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const startStream = useCallback(async (response: Response) => {
    setContent('');
    setError(null);
    setIsStreaming(true);

    const reader = response.body?.getReader();
    if (!reader) {
      setError({ code: 'NO_BODY', message: 'Response body is empty' });
      setIsStreaming(false);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7).trim();
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const payload = JSON.parse(dataStr);

              if (currentEvent === 'token' || ('content' in payload && Object.keys(payload).length === 1)) {
                setContent((prev) => prev + payload.content);
                callbacksRef.current?.onToken?.(payload.content);
              } else if (currentEvent === 'done' || 'total_tokens' in payload) {
                callbacksRef.current?.onDone?.(payload as { totalTokens: number; model: string });
              } else if (currentEvent === 'error' || 'code' in payload) {
                setError(payload as { code: string; message: string });
                callbacksRef.current?.onError?.(payload as { code: string; message: string });
              }
            } catch {
              // 非 JSON data，跳过
            }
            currentEvent = '';
          }

          if (trimmed === '') {
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // 正常取消
      }
      setError({ code: 'STREAM_ERROR', message: err instanceof Error ? err.message : 'Stream error' });
    } finally {
      setIsStreaming(false);
      reader.releaseLock();
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { content, isStreaming, error, startStream, abort };
}
