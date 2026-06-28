/**
 * 笔记详情页 — Note Detail Screen
 *
 * - 阅读笔记完整内容（Markdown 渲染）
 * - 顶部导航：返回 + 编辑/更多操作
 * - 元信息：标签、日期
 */

import { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Markdown from 'react-native-markdown-display';

import { useDocumentStore } from '@/stores/document.store';
import { Spacing } from '@/constants/theme';
import type { NoteTag } from '@/types/document';

/* ── 日期格式化 ── */
function formatFullDate(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  const timeStr = `${h}:${m}`;

  if (diffDays === 0) return `今天 ${timeStr}`;
  if (diffDays === 1) return `昨天 ${timeStr}`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${timeStr}`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function isEdited(createdAt: string, updatedAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  return updated - created > 60000; // more than 1 minute difference
}

/* ── Markdown 样式 ── */
const mdStyles = {
  body: {
    fontSize: 17,
    lineHeight: 29,
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  paragraph: { marginBottom: 6, marginTop: 0 },
  strong: { fontWeight: '700' as const },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
  bullet_list_icon: { marginRight: 8, fontSize: 16, lineHeight: 26, color: '#000000' },
  ordered_list_icon: { marginRight: 8, fontSize: 16, lineHeight: 26, color: '#000000' },
  fence: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginVertical: 8 },
  code_inline: { backgroundColor: '#f0f0f0', paddingHorizontal: 4, borderRadius: 4 },
  heading1: { fontSize: 22, lineHeight: 30, fontWeight: '700' as const, color: '#000000', marginBottom: 8, marginTop: 16 },
  heading2: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const, color: '#000000', marginBottom: 6, marginTop: 14 },
  heading3: { fontSize: 17, lineHeight: 25, fontWeight: '600' as const, color: '#000000', marginBottom: 4, marginTop: 12 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#0066FF',
    paddingLeft: 12,
    marginVertical: 8,
    backgroundColor: 'transparent',
  },
  link: { color: '#0066FF' },
  hr: { backgroundColor: '#E5E5E5', height: 1, marginVertical: 16 },
};

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notes = useDocumentStore((s) => s.notes);
  const isLoading = useDocumentStore((s) => s.isLoading);

  // 从 store 或 API 获取笔记
  const note = useMemo(() => notes.find((n) => n.id === id), [notes, id]);

  // 如果 store 中没有完整内容（可能是深层链接），拉取一下
  const fetchNotes = useDocumentStore((s) => s.fetchNotes);
  useEffect(() => {
    if (!note || !note.content) {
      fetchNotes();
    }
  }, [id, note, fetchNotes]);

  if (!note) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingBox}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#0066FF" />
          ) : (
            <Text style={styles.notFoundText}>笔记未找到</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const edited = isEdited(note.created_at, note.updated_at);
  const dateLabel = `${formatFullDate(note.updated_at)}${edited ? ' · 已编辑' : ''}`;

  // 清理内容：移除末尾的标签标记行（由后端生成）
  const displayContent = note.content
    .replace(/^标签[：:]\s*\S+$/m, '')  // 移除 "标签: xxx" 行
    .replace(/---\s*$/m, '')            // 移除末尾的 "---"
    .trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 笔记</Text>
        </Pressable>
        <View style={styles.actions}>
          <Pressable style={styles.actionButton}>
            <Text style={styles.editText}>编辑</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Text style={styles.moreText}>⋯</Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{note.tag}</Text>
          </View>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{note.title}</Text>

        {/* Body — Markdown rendering */}
        <View style={styles.body}>
          <Markdown style={mdStyles}>{displayContent}</Markdown>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ──────────── Styles ──────────── */

const fontFamily = Platform.select({ ios: 'system-ui', default: 'normal' });

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  /* Loading / Not Found */
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontFamily,
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: Spacing.four,
  },
  backButton: {
    paddingVertical: Spacing.one,
  },
  backText: {
    fontSize: 16,
    color: '#0066FF',
    fontFamily,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  actionButton: {
    paddingVertical: Spacing.one,
  },
  editText: {
    fontSize: 16,
    color: '#0066FF',
    fontFamily,
  },
  moreText: {
    fontSize: 16,
    color: '#60646C',
    fontFamily,
  },

  /* Content scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },

  /* Meta Row */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  tagBadge: {
    backgroundColor: '#0066FF1A',
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0066FF',
    fontFamily,
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily,
  },

  /* Title */
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    fontFamily,
    lineHeight: 36,
    marginBottom: Spacing.four,
  },

  /* Body */
  body: {
    gap: 12,
  },

  /* Spacer */
  spacer: {
    height: 60,
  },
});
