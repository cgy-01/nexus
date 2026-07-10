/**
 * 聊天状态管理
 *
 * 管理会话列表、当前消息、SSE 流式发送。
 * 调试阶段 USE_MOCKS = true 时使用本地 mock 数据，不依赖后端。
 */

import { create } from 'zustand';
import { chatService } from '@/services/chat.service';
import { tokenStore } from '@/services/token';
import type { Message, SearchMetadata, Session } from '@/types/chat';

/* ═══════════════════════════════════════════════════════════════
   调试开关：true = 使用本地 mock 数据，无需后端
   ═══════════════════════════════════════════════════════════════ */
const USE_MOCKS = false;

/* ──────────── Mock 数据 ──────────── */

const NOW = new Date().toISOString();
const HOUR_AGO = new Date(Date.now() - 3600000).toISOString();
const DAY_AGO = new Date(Date.now() - 86400000).toISOString();
const WEEK_AGO = new Date(Date.now() - 7 * 86400000).toISOString();
const MONTH_AGO = new Date(Date.now() - 30 * 86400000).toISOString();

const MOCK_SESSIONS: Session[] = [
  {
    id: 'mock-session-1',
    title: '对话学习的原理',
    model: 'gpt-4o',
    total_tokens: 320,
    is_active: true,
    created_at: HOUR_AGO,
    updated_at: NOW,
  },
  {
    id: 'mock-session-2',
    title: '图标适配方案',
    model: 'gpt-4o',
    total_tokens: 850,
    is_active: true,
    created_at: DAY_AGO,
    updated_at: DAY_AGO,
  },
  {
    id: 'mock-session-3',
    title: '项目架构讨论',
    model: 'deepseek-v3',
    total_tokens: 560,
    is_active: true,
    created_at: DAY_AGO,
    updated_at: DAY_AGO,
  },
  {
    id: 'mock-session-4',
    title: 'Expo SDK 升级',
    model: 'gpt-4o',
    total_tokens: 1240,
    is_active: true,
    created_at: WEEK_AGO,
    updated_at: WEEK_AGO,
  },
  {
    id: 'mock-session-5',
    title: '需求评审记录',
    model: 'claude-opus-4-8',
    total_tokens: 2100,
    is_active: false,
    created_at: MONTH_AGO,
    updated_at: MONTH_AGO,
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  'mock-session-1': [
    {
      id: 'msg-1-1',
      session_id: 'mock-session-1',
      role: 'user',
      content: '什么是对话学习？',
      token_count: 8,
      metadata: {},
      created_at: HOUR_AGO,
    },
    {
      id: 'msg-1-2',
      session_id: 'mock-session-1',
      role: 'assistant',
      content:
        '对话学习（Conversational Learning）是一种通过**自然语言对话**来获取知识、技能或理解的学习方式。\n\n核心特点包括：\n\n1. **交互式**：不像传统教材是单向灌输，对话学习是双向的——你可以随时提问、追问、要求解释\n2. **即时反馈**：每个问题都能立刻得到针对性回答，学习效率更高\n3. **认知模型**：好的对话学习系统会跟踪你的理解水平，动态调整解释的深度\n\n常见的应用场景：\n- AI 辅导老师\n- 技术面试准备\n- 语言学习对话\n\n你想深入了解哪个方面？',
      token_count: 312,
      metadata: { model: 'gpt-4o', latency_ms: 1230 },
      created_at: HOUR_AGO,
    },
  ],
  'mock-session-2': [
    {
      id: 'msg-2-1',
      session_id: 'mock-session-2',
      role: 'user',
      content: '不同分辨率下 PNG 图标会模糊吗？',
      token_count: 12,
      metadata: {},
      created_at: DAY_AGO,
    },
    {
      id: 'msg-2-2',
      session_id: 'mock-session-2',
      role: 'assistant',
      content:
        '在正常的 App 开发中，图标的加入方式主要有两种：\n\n1. **使用位图（如 PNG）**：开发者下载或设计 PNG 格式的图标，然后根据不同的屏幕分辨率（如 Android 的 mdpi/hdpi/xhdpi/xxhdpi 或 iOS 的 @1x/@2x/@3x）分别放置对应尺寸的图片。App 运行时会根据设备屏幕密度自动加载最合适的资源。\n\n2. **使用矢量图形或代码绘制**：矢量格式（如 SVG、Android Vector Drawable、iOS 的 PDF 资源）可以无损缩放，避免多分辨率适配问题。\n\n关于"不同分辨率下 PNG 会显示异常"：**这个说法基本正确**。如果只提供单一分辨率的 PNG，在高分辨率屏幕上会被拉伸放大，导致模糊、锯齿或边缘粗糙。正确的做法是提供多套切图，或者直接使用矢量图避免此问题。',
      token_count: 248,
      metadata: { model: 'gpt-4o', latency_ms: 980 },
      created_at: DAY_AGO,
    },
    {
      id: 'msg-2-3',
      session_id: 'mock-session-2',
      role: 'user',
      content: '那 SVG 在 React Native 里怎么用？',
      token_count: 10,
      metadata: {},
      created_at: DAY_AGO,
    },
    {
      id: 'msg-2-4',
      session_id: 'mock-session-2',
      role: 'assistant',
      content:
        '在 React Native 中使用 SVG 需要 `react-native-svg` 库。你的项目已经安装了 `react-native-svg@15.15.4`，可以直接使用。\n\n```tsx\nimport Svg, { Circle, Rect, Path } from \'react-native-svg\';\n\nfunction MyIcon() {\n  return (\n    <Svg width={24} height={24} viewBox="0 0 24 24">\n      <Path\n        d="M12 2L2 7l10 5 10-5-10-5z"\n        fill="#000000"\n      />\n    </Svg>\n  );\n}\n```\n\n相比 PNG，SVG 的优势是任意缩放不失真，也不需要多套切图。',
      token_count: 180,
      metadata: { model: 'gpt-4o', latency_ms: 760 },
      created_at: DAY_AGO,
    },
  ],
  'mock-session-3': [
    {
      id: 'msg-3-1',
      session_id: 'mock-session-3',
      role: 'user',
      content: 'Expo Router 和 React Navigation 有什么区别？',
      token_count: 14,
      metadata: {},
      created_at: DAY_AGO,
    },
    {
      id: 'msg-3-2',
      session_id: 'mock-session-3',
      role: 'assistant',
      content:
        'Expo Router 是基于 React Navigation 构建的**文件系统路由**方案。\n\n| 对比 | React Navigation | Expo Router |\n|------|-----------------|-------------|\n| 路由定义 | JS 代码手动配置 | 文件名自动映射 |\n| 深层链接 | 需手动配置 | 开箱即用 |\n| 类型安全 | 需手动泛型 | 自动类型推断 |\n| 学习曲线 | 中等 | 低（约定大于配置） |\n\n简单说：Expo Router 是 React Navigation 的一层封装，用了文件约定来消除样板代码。你的项目（Expo SDK 56）用的就是 expo-router。',
      token_count: 205,
      metadata: { model: 'deepseek-v3', latency_ms: 1450 },
      created_at: DAY_AGO,
    },
  ],
  'mock-session-4': [],
  'mock-session-5': [],
};

const MOCK_REPLY =
  '这是一个很好的问题！让我从几个角度来分析：\n\n## 1. 技术层面\n\n基于你当前的架构（React Native + FastAPI + pgvector），实现这个功能需要以下步骤：\n\n1. **前端**：在聊天详情页加一个触发按钮\n2. **后端**：接收请求 → 拉取会话消息 → 调用 LLM 生成摘要\n3. **存储**：将摘要写入 documents 表，切块后向量化写入 embeddings 表\n\n## 2. 注意事项\n\n- 摘要生成是**异步任务**（Celery），不要在请求-响应周期内等待\n- 建议设置消息数量阈值（如 10 条以上才触发）\n- 文档生成后需要通知前端刷新文档列表\n\n你想深入了解哪个部分的实现细节？';

/* ──────────── Store ──────────── */

interface ChatState {
  sessions: Session[];
  currentSession: Session | null;
  currentMessages: Message[];

  isLoadingSessions: boolean;
  isSending: boolean;
  fetchError: string | null;

  streamingContent: string;
  streamError: string | null;

  fetchSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<Session | null>;
  deleteSession: (id: string) => Promise<void>;
  fetchMessages: (sessionId: string) => Promise<void>;
  setCurrentSession: (session: Session | null) => void;
  sendMessage: (sessionId: string | undefined, content: string, enableSearch?: boolean) => Promise<void>;

  addStreamToken: (token: string) => void;
  finalizeStream: (totalTokens?: number) => void;
  setStreamError: (error: string | null) => void;
  clearStream: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSession: null,
  currentMessages: [],
  isLoadingSessions: false,
  isSending: false,
  fetchError: null,
  streamingContent: '',
  streamError: null,

  /* ── 会话 ── */

  fetchSessions: async () => {
    set({ isLoadingSessions: true, fetchError: null });

    if (USE_MOCKS) {
      // 模拟网络延迟
      await new Promise((r) => setTimeout(r, 300));
      set({ sessions: MOCK_SESSIONS, isLoadingSessions: false });
      return;
    }

    try {
      const res = await chatService.getSessions();
      set({ sessions: res.data.data });
    } catch (err) {
      set({
        fetchError:
          err instanceof Error
            ? `无法连接服务器：${err.message}`
            : '无法连接服务器',
      });
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  createSession: async (title) => {
    if (USE_MOCKS) {
      const session: Session = {
        id: `mock-session-${Date.now()}`,
        title: title ?? '新对话',
        model: 'gpt-4o',
        total_tokens: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set((state) => ({
        sessions: [session, ...state.sessions],
        currentSession: session,
        currentMessages: [],
      }));
      return session;
    }

    try {
      const res = await chatService.createSession(title);
      const session = res.data;
      set((state) => ({
        sessions: [session, ...state.sessions],
        currentSession: session,
        currentMessages: [],
      }));
      return session;
    } catch {
      return null;
    }
  },

  deleteSession: async (id) => {
    if (!USE_MOCKS) {
      try {
        await chatService.deleteSession(id);
      } catch { /* 静默 */ }
    }
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSession: state.currentSession?.id === id ? null : state.currentSession,
      currentMessages: state.currentSession?.id === id ? [] : state.currentMessages,
    }));
  },

  fetchMessages: async (sessionId) => {
    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 150));
      const messages = MOCK_MESSAGES[sessionId] ?? [];
      set({ currentMessages: messages });
      return;
    }

    try {
      const res = await chatService.getMessages(sessionId);
      set({ currentMessages: res.data.data });
    } catch {
      // 静默
    }
  },

  setCurrentSession: (session) => {
    set({ currentSession: session });
  },

  /* ── 消息发送 + SSE ── */

  sendMessage: async (sessionId, content, enableSearch = false) => {
    const resolvedId: string = sessionId || 'pending';

    // 追加用户消息
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      session_id: resolvedId,
      role: 'user',
      content,
      token_count: 0,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      currentMessages: [...state.currentMessages, userMessage],
      isSending: true,
      streamingContent: '',
      streamError: null,
    }));

    /* ── Mock 流式回复 ── */
    if (USE_MOCKS) {
      const mockSid = sessionId || `mock-session-${Date.now()}`;
      const reply = MOCK_REPLY;
      for (let i = 0; i < reply.length; i += 3) {
        const chunk = reply.slice(i, i + 3);
        set((state) => ({
          streamingContent: state.streamingContent + chunk,
        }));
        await new Promise((r) => setTimeout(r, 20 + Math.random() * 30));
      }

      const aiMessage: Message = {
        id: `mock-msg-${Date.now()}`,
        session_id: mockSid,
        role: 'assistant',
        content: reply,
        token_count: Math.round(reply.length / 2.5),
        metadata: { model: 'gpt-4o', latency_ms: 1500 },
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        currentMessages: [...state.currentMessages, aiMessage],
        streamingContent: '',
        isSending: false,
      }));
      return;
    }

    /* ── 真实 SSE ── */
    const token = tokenStore.getAccessToken();
    if (!token) {
      set({ streamError: '未登录，无法发送消息', isSending: false });
      return;
    }

    try {
      const response = await chatService.sendMessageStream(
        {
          session_id: sessionId,
          content,
          enable_search: enableSearch,
          search_region: 'mainland',
        },
        token,
      );

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalTokens = 0;
      let newSessionId: string | null = null;
      let searchMeta: SearchMetadata | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) continue;
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if ('content' in payload && Object.keys(payload).length === 1) {
                set((state) => ({
                  streamingContent: state.streamingContent + payload.content,
                }));
              } else if ('sources' in payload && 'status' in payload) {
                searchMeta = payload as SearchMetadata;
              } else if ('total_tokens' in payload) {
                finalTokens = payload.total_tokens;
                if (payload.session_id) {
                  newSessionId = payload.session_id;
                }
                if (payload.search) {
                  searchMeta = payload.search as SearchMetadata;
                }
              } else if ('code' in payload) {
                throw new Error(payload.message);
              }
            } catch { /* 非 JSON 忽略 */ }
          }
        }
      }

      // After stream completes: if this was a new session, update state
      const effectiveId = newSessionId || resolvedId;

      // Update user message with real session id
      const currentMsgs = get().currentMessages;
      const updatedMsgs = currentMsgs.map((m) =>
        m.id === userMessage.id ? { ...m, session_id: effectiveId } : m,
      );

      const aiMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        session_id: effectiveId,
        role: 'assistant',
        content: get().streamingContent,
        token_count: finalTokens,
        metadata: searchMeta ? { search: searchMeta } : {},
        created_at: new Date().toISOString(),
      };

      // If this is a new session, add it to the sessions list
      const state = get();
      if (!sessionId && newSessionId) {
        const newSession: Session = {
          id: newSessionId,
          title: content.slice(0, 50),
          model: 'deepseek-chat',
          total_tokens: finalTokens,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set({
          currentMessages: [...updatedMsgs, aiMessage],
          currentSession: newSession,
          sessions: [newSession, ...state.sessions],
          streamingContent: '',
          isSending: false,
        });
      } else {
        set({
          currentMessages: [...updatedMsgs, aiMessage],
          streamingContent: '',
          isSending: false,
        });
      }
    } catch (error) {
      set({
        isSending: false,
        streamError: error instanceof Error ? error.message : '发送失败',
      });
    }
  },

  addStreamToken: (token) => {
    set((state) => ({ streamingContent: state.streamingContent + token }));
  },

  finalizeStream: (totalTokens = 0) => {
    const content = get().streamingContent;
    const sessionId = get().currentSession?.id;
    if (!content || !sessionId) return;

    const aiMessage: Message = {
      id: `msg-${Date.now()}`,
      session_id: sessionId,
      role: 'assistant',
      content,
      token_count: totalTokens,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      currentMessages: [...state.currentMessages, aiMessage],
      streamingContent: '',
      isSending: false,
    }));
  },

  setStreamError: (error) => {
    set({ streamError: error, isSending: false });
  },

  clearStream: () => {
    set({ streamingContent: '', streamError: null, isSending: false });
  },
}));
