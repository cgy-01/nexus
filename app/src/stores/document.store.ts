/**
 * 笔记状态管理
 *
 * 管理笔记列表、标签过滤、搜索。
 * 调试阶段 USE_MOCKS = true 时使用本地 mock 数据，不依赖后端。
 */

import { create } from 'zustand';
import { documentService } from '@/services/document.service';
import type { GenerateNoteRequest } from '@/services/document.service';
import type { Note, NoteTag } from '@/types/document';

/* ═══════════════════════════════════════════════════════════════
   调试开关：true = 使用本地 mock 数据，无需后端
   ═══════════════════════════════════════════════════════════════ */
const USE_MOCKS = false;

/* ──────────── Mock 数据 ──────────── */

const NOW = new Date();

function agoHours(h: number) {
  return new Date(NOW.getTime() - h * 3600000).toISOString();
}

function agoDays(d: number) {
  return new Date(NOW.getTime() - d * 86400000).toISOString();
}

const MOCK_NOTES: Note[] = [
  {
    id: 'note-1',
    title: '费曼学习法核心要点',
    preview: '通过以教代学来加深理解。四个步骤：选择概念、教给别人、发现盲区、简化类比...',
    tag: '学习',
    isPinned: true,
    content: '',
    status: 'ready',
    created_at: agoHours(4),
    updated_at: agoHours(4),
  },
  {
    id: 'note-2',
    title: 'React Native 性能优化清单',
    preview: '1. 使用 FlatList 替代 ScrollView 2. 合理使用 React.memo 3. 避免匿名函数作为 props...',
    tag: '工作',
    isPinned: true,
    content: '',
    status: 'ready',
    created_at: agoDays(1),
    updated_at: agoDays(1),
  },
  {
    id: 'note-3',
    title: '周末读书笔记：《深度工作》',
    preview: '深度工作是指在无干扰的状态下进行专注的职业活动，这类工作能够创造新价值，提升技能...',
    tag: '学习',
    isPinned: false,
    content: '',
    status: 'ready',
    created_at: agoDays(2),
    updated_at: agoDays(2),
  },
  {
    id: 'note-4',
    title: '产品迭代想法池',
    preview: '笔记功能、暗色模式、多语言支持、语音输入、PDF 导出、协作编辑、标签系统优化...',
    tag: '想法',
    isPinned: false,
    content: '',
    status: 'ready',
    created_at: agoDays(4),
    updated_at: agoDays(4),
  },
  {
    id: 'note-5',
    title: '有用的 Prompt 收集',
    preview: '"请用费曼学习法的方式解释..." "将以下内容总结为三个要点..." "请用苏格拉底式提问帮我理解..."',
    tag: '收藏',
    isPinned: false,
    content: '',
    status: 'ready',
    created_at: agoDays(6),
    updated_at: agoDays(6),
  },
  {
    id: 'note-6',
    title: 'Docker 部署备忘',
    preview: 'docker-compose up -d 启动服务。常用命令：docker ps 查看容器，docker logs -f 查看日志...',
    tag: '工作',
    isPinned: false,
    content: '',
    status: 'ready',
    created_at: agoDays(8),
    updated_at: agoDays(8),
  },
];

/* ──────────── Store ──────────── */

interface DocumentState {
  notes: Note[];
  isLoading: boolean;
  fetchError: string | null;

  isGenerating: boolean;
  generateError: string | null;

  activeTag: NoteTag | '全部';
  searchQuery: string;

  // 批量选择
  isSelectionMode: boolean;
  selectedIds: string[];

  fetchNotes: () => Promise<void>;
  setActiveTag: (tag: NoteTag | '全部') => void;
  setSearchQuery: (query: string) => void;
  deleteNote: (id: string) => Promise<void>;
  generateNoteFromChat: (req: GenerateNoteRequest, optimisticId?: string) => Promise<Note | null>;

  enterSelectionMode: (noteId: string) => void;
  exitSelectionMode: () => void;
  toggleSelectNote: (id: string) => void;
  selectAll: () => void;
  batchDelete: () => Promise<void>;
  batchTogglePin: () => Promise<void>;

  /** 过滤后的笔记列表 */
  filteredNotes: () => Note[];
}

/* ── Mock 笔记生成 ── */

function generateMockNoteTitle(messages: GenerateNoteRequest['messages']): string {
  const userMsgs = messages.filter((m) => m.role === 'user');
  if (userMsgs.length === 0) return '对话笔记';
  const first = userMsgs[0].content.slice(0, 40);
  return first.length < userMsgs[0].content.length ? `${first}...` : first;
}

function generateMockNoteContent(messages: GenerateNoteRequest['messages']): string {
  const userMsgs = messages.filter((m) => m.role === 'user');
  const assistantMsgs = messages.filter((m) => m.role === 'assistant');

  let content = '# 对话笔记\n\n## 话题摘要\n\n';
  for (const m of userMsgs) {
    content += `- ${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}\n`;
  }

  if (assistantMsgs.length > 0) {
    content += '\n## AI 回复要点\n\n';
    for (const m of assistantMsgs) {
      const lines = m.content.split('\n').filter((l) => l.trim());
      for (const line of lines.slice(0, 2)) {
        content += `- ${line.slice(0, 100)}${line.length > 100 ? '...' : ''}\n`;
      }
    }
  }

  content += `\n> 自动生成于 ${new Date().toLocaleString('zh-CN')}`;
  return content;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  notes: [],
  isLoading: false,
  fetchError: null,
  isGenerating: false,
  generateError: null,
  activeTag: '全部',
  searchQuery: '',
  isSelectionMode: false,
  selectedIds: [],

  fetchNotes: async () => {
    set({ isLoading: true, fetchError: null });

    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 300));
      set({ notes: MOCK_NOTES, isLoading: false });
      return;
    }

    try {
      const res = await documentService.getNotes();
      // 保留正在生成的笔记（状态为 'generating'），防止被 API 返回覆盖
      set((state) => {
        const generatingNotes = state.notes.filter((n) => n.status === 'generating');
        const fetchedNotes: Note[] = res.data.data;
        // 去重：如果 API 已返回了同一个 ID 的笔记（状态变为 ready），用 API 的版本
        const merged = [
          ...generatingNotes,
          ...fetchedNotes.filter(
            (fn) => !generatingNotes.some((gn) => gn.id === fn.id),
          ),
        ];
        return { notes: merged, isLoading: false };
      });
    } catch (err) {
      set({
        fetchError:
          err instanceof Error
            ? `无法加载笔记：${err.message}`
            : '无法加载笔记',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveTag: (tag) => {
    set({ activeTag: tag });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  deleteNote: async (id) => {
    if (!USE_MOCKS) {
      try {
        await documentService.deleteNote(id);
      } catch { /* 静默 */ }
    }
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }));
  },

  /* ── 批量选择 ── */

  enterSelectionMode: (noteId) => {
    set({ isSelectionMode: true, selectedIds: [noteId] });
  },

  exitSelectionMode: () => {
    set({ isSelectionMode: false, selectedIds: [] });
  },

  toggleSelectNote: (id) => {
    set((state) => {
      const isSelected = state.selectedIds.includes(id);
      return {
        selectedIds: isSelected
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      };
    });
  },

  selectAll: () => {
    set((state) => {
      const allIds = state.notes.map((n) => n.id);
      return { selectedIds: allIds };
    });
  },

  batchDelete: async () => {
    const { selectedIds } = get();
    // 批量删除
    if (!USE_MOCKS) {
      await Promise.allSettled(
        selectedIds.map((id) =>
          documentService.deleteNote(id).catch(() => {}),
        ),
      );
    }
    set((state) => ({
      notes: state.notes.filter((n) => !selectedIds.includes(n.id)),
      isSelectionMode: false,
      selectedIds: [],
    }));
  },

  batchTogglePin: async () => {
    // 暂时只做本地切换，后端 pin 接口后续补充
    set((state) => {
      const { selectedIds } = state;
      // 判断当前选中的是否全部已置顶
      const selectedNotes = state.notes.filter((n) => selectedIds.includes(n.id));
      const allPinned = selectedNotes.every((n) => n.isPinned);
      const newPinned = !allPinned;

      return {
        notes: state.notes.map((n) =>
          selectedIds.includes(n.id) ? { ...n, isPinned: newPinned } : n,
        ),
        isSelectionMode: false,
        selectedIds: [],
      };
    });
  },

  generateNoteFromChat: async (req, optimisticId) => {
    set({ isGenerating: true, generateError: null });

    // 如果调用方未提供乐观 ID，则自行插入占位笔记
    const oid = optimisticId || `note-gen-${Date.now()}`;
    if (!optimisticId) {
      const optimisticNote: Note = {
        id: oid,
        title: '生成中...',
        preview: 'AI 正在整理对话内容...',
        tag: '学习',
        isPinned: false,
        content: '',
        status: 'generating',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set((state) => ({
        notes: [optimisticNote, ...state.notes],
      }));
    }

    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 1500));
      const now = new Date().toISOString();
      const title = generateMockNoteTitle(req.messages);
      const content = generateMockNoteContent(req.messages);
      const note: Note = {
        id: oid,
        title,
        preview: content.replace(/^#.*\n/g, '').replace(/\n/g, ' ').slice(0, 100),
        tag: '学习',
        isPinned: false,
        content,
        status: 'ready',
        created_at: now,
        updated_at: now,
      };
      // 替换占位笔记
      set((state) => ({
        notes: state.notes.map((n) => (n.id === oid ? note : n)),
        isGenerating: false,
      }));
      return note;
    }

    try {
      const res = await documentService.generateNoteFromChat(req);
      const realNote: Note = { ...res.data, status: 'ready' };
      // 替换占位笔记
      set((state) => ({
        notes: state.notes.map((n) => (n.id === oid ? realNote : n)),
        isGenerating: false,
      }));
      return realNote;
    } catch (err) {
      // 失败时更新占位笔记为失败状态
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === oid
            ? { ...n, title: '生成失败', preview: '点击重试', status: 'failed' as const }
            : n,
        ),
        isGenerating: false,
        generateError:
          err instanceof Error
            ? `笔记生成失败：${err.message}`
            : '笔记生成失败',
      }));
      return null;
    }
  },

  filteredNotes: () => {
    const { notes, activeTag, searchQuery } = get();
    let result = notes;

    if (activeTag !== '全部') {
      result = result.filter((n) => n.tag === activeTag);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.preview.toLowerCase().includes(q),
      );
    }

    return result;
  },
}));
