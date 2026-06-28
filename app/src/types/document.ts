/** 笔记/文档相关类型 */

export type NoteTag = '学习' | '工作' | '想法' | '收藏';

export type NoteStatus = 'generating' | 'ready' | 'failed';

export interface Note {
  id: string;
  title: string;
  preview: string;
  tag: NoteTag;
  isPinned: boolean;
  content: string;
  status: NoteStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteRequest {
  title: string;
  content?: string;
  tag?: NoteTag;
}
