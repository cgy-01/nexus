/**
 * 笔记列表页 — Notes Screen
 *
 * - 笔记列表展示：标题、预览、标签、日期
 * - 标签过滤：全部 / 学习 / 工作 / 想法 / 收藏
 * - 搜索过滤
 * - 新建笔记入口
 */

import { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router, type Href } from 'expo-router';

import { useDocumentStore } from '@/stores/document.store';
import { Spacing } from '@/constants/theme';
import type { Note, NoteTag } from '@/types/document';

/* ── 所有标签 ── */
const ALL_TAGS: Array<NoteTag | '全部'> = ['全部', '学习', '工作', '想法', '收藏'];

const TAG_TEXT_COLORS: Record<NoteTag, string> = {
  '学习': '#0066FF',
  '工作': '#0066FF',
  '想法': '#0066FF',
  '收藏': '#0066FF',
};

/* ── 日期格式化 ── */
function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `今天 ${h}:${m}`;
  }
  if (diffDays === 1) {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `昨天 ${h}:${m}`;
  }
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ── 单个笔记卡片 ── */
function NoteCard({
  note, onPress, onLongPress, isSelectionMode, isSelected, onToggleSelect,
}: {
  note: Note;
  onPress: () => void;
  onLongPress: () => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const isGenerating = note.status === 'generating';
  const isFailed = note.status === 'failed';
  const canSelect = !isGenerating;

  const handlePress = () => {
    if (isSelectionMode) {
      if (canSelect) onToggleSelect();
    } else {
      onPress();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isGenerating && styles.cardGenerating,
        isSelectionMode && isSelected && styles.cardSelected,
        pressed && !isGenerating && !isSelectionMode && styles.cardPressed,
      ]}
      onPress={handlePress}
      onLongPress={canSelect ? onLongPress : undefined}
      delayLongPress={400}
    >
      {/* 选择模式 — 右上角复选框 */}
      {isSelectionMode && canSelect && (
        <View style={styles.checkbox}>
          {isSelected ? (
            <View style={styles.checkboxChecked}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          ) : (
            <View style={styles.checkboxUnchecked} />
          )}
        </View>
      )}

      {/* 标题行 */}
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          {note.isPinned && <Text style={styles.pinIcon}>📌</Text>}
          <Text
            style={[styles.cardTitle, isGenerating && styles.cardTitleGenerating]}
            numberOfLines={1}
          >
            {note.title}
          </Text>
        </View>
        {isGenerating && (
          <ActivityIndicator size="small" color="#0066FF" />
        )}
        {isFailed && !isSelectionMode && (
          <Text style={styles.failedBadge}>失败</Text>
        )}
      </View>

      {/* 预览文本 */}
      <Text style={[styles.cardPreview, isGenerating && styles.cardPreviewGenerating]} numberOfLines={2}>
        {note.preview}
      </Text>

      {/* 底部行 */}
      <View style={styles.cardFooter}>
        <View style={[styles.tagBadge, isGenerating && styles.tagBadgeGenerating]}>
          <Text style={[styles.tagText, { color: isGenerating ? '#0066FF' : TAG_TEXT_COLORS[note.tag] }]}>
            {isGenerating ? '生成中' : note.tag}
          </Text>
        </View>
        {!isGenerating && (
          <Text style={styles.cardDate}>{formatDate(note.updated_at)}</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function NotesScreen() {
  const notes = useDocumentStore((s) => s.notes);
  const isLoading = useDocumentStore((s) => s.isLoading);
  const activeTag = useDocumentStore((s) => s.activeTag);
  const searchQuery = useDocumentStore((s) => s.searchQuery);
  const fetchNotes = useDocumentStore((s) => s.fetchNotes);
  const setActiveTag = useDocumentStore((s) => s.setActiveTag);
  const setSearchQuery = useDocumentStore((s) => s.setSearchQuery);

  // 批量选择
  const isSelectionMode = useDocumentStore((s) => s.isSelectionMode);
  const selectedIds = useDocumentStore((s) => s.selectedIds);
  const enterSelectionMode = useDocumentStore((s) => s.enterSelectionMode);
  const exitSelectionMode = useDocumentStore((s) => s.exitSelectionMode);
  const toggleSelectNote = useDocumentStore((s) => s.toggleSelectNote);
  const selectAll = useDocumentStore((s) => s.selectAll);
  const batchDelete = useDocumentStore((s) => s.batchDelete);
  const batchTogglePin = useDocumentStore((s) => s.batchTogglePin);

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [fetchNotes]),
  );

  const displayNotes = useMemo(() => {
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
  }, [notes, activeTag, searchQuery]);

  // 可选笔记（排除生成中的）
  const selectableNotes = useMemo(
    () => displayNotes.filter((n) => n.status !== 'generating'),
    [displayNotes],
  );
  const allSelected = selectableNotes.length > 0
    && selectableNotes.every((n) => selectedIds.includes(n.id));

  /* 计数 / 选择文案 */
  const headerSubtitle = isSelectionMode
    ? `已选 ${selectedIds.length} 项`
    : isLoading ? '加载中...' : `共 ${displayNotes.length} 条笔记`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {isSelectionMode ? '选择笔记' : '我的笔记'}
          </Text>
          <Text style={styles.headerCount}>{headerSubtitle}</Text>
        </View>
        {isSelectionMode ? (
          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelPressed]}
            onPress={exitSelectionMode}
          >
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        )}
      </View>

      {/* 搜索栏 — 选择模式下隐藏 */}
      {!isSelectionMode && (
        <>
          <View style={styles.searchWrapper}>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="  搜索笔记..."
                placeholderTextColor="#9CA3AF"
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* 标签过滤器 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsContent}
            style={styles.tagsScroll}
          >
            {ALL_TAGS.map((tag) => {
              const isActive = activeTag === tag;
              return (
                <Pressable
                  key={tag}
                  style={({ pressed }) => [
                    styles.tagPill,
                    isActive ? styles.tagPillActive : styles.tagPillInactive,
                    pressed && styles.tagPillPressed,
                  ]}
                  onPress={() => setActiveTag(tag)}
                >
                  <Text
                    style={[
                      styles.tagPillText,
                      isActive ? styles.tagPillTextActive : styles.tagPillTextInactive,
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* 选择模式 — 全选栏 */}
      {isSelectionMode && (
        <Pressable style={styles.selectAllBar} onPress={selectAll}>
          <View style={[styles.checkboxSmall, allSelected && styles.checkboxSmallChecked]}>
            {allSelected && <Text style={styles.checkmarkSmall}>✓</Text>}
          </View>
          <Text style={styles.selectAllText}>
            {allSelected ? '取消全选' : '全选'}
          </Text>
        </Pressable>
      )}

      {/* 笔记列表 */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          isSelectionMode && { paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {displayNotes.length === 0 && !isLoading && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无笔记</Text>
          </View>
        )}
        {displayNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isSelectionMode={isSelectionMode}
            isSelected={selectedIds.includes(note.id)}
            onPress={() => {
              if (!isSelectionMode) {
                router.navigate(`/(app)/documents/${note.id}` as Href);
              }
            }}
            onLongPress={() => {
              if (!isSelectionMode && note.status !== 'generating') {
                enterSelectionMode(note.id);
              }
            }}
            onToggleSelect={() => toggleSelectNote(note.id)}
          />
        ))}
        <View style={styles.spacer} />
      </ScrollView>

      {/* 底部操作栏 — 仅选择模式 */}
      {isSelectionMode && (
        <View style={styles.bottomBar}>
          <Pressable
            style={({ pressed }) => [
              styles.bottomAction,
              pressed && styles.bottomActionPressed,
              selectedIds.length === 0 && styles.bottomActionDisabled,
            ]}
            onPress={selectedIds.length > 0 ? batchTogglePin : undefined}
          >
            <Text style={styles.bottomActionIcon}>📌</Text>
            <Text style={[
              styles.bottomActionText,
              selectedIds.length === 0 && styles.bottomActionTextDisabled,
            ]}>置顶</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.bottomAction,
              styles.bottomActionDanger,
              pressed && styles.bottomActionDangerPressed,
              selectedIds.length === 0 && styles.bottomActionDisabled,
            ]}
            onPress={selectedIds.length > 0 ? batchDelete : undefined}
          >
            <Text style={styles.bottomActionIcon}>🗑</Text>
            <Text style={[
              styles.bottomActionText,
              styles.bottomActionTextDanger,
              selectedIds.length === 0 && styles.bottomActionTextDisabled,
            ]}>删除</Text>
          </Pressable>
        </View>
      )}
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

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerLeft: {
    gap: Spacing.half,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    fontFamily,
  },
  headerCount: {
    fontSize: 15,
    color: '#60646C',
    fontFamily,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    fontSize: 24,
    color: '#ffffff',
    lineHeight: 26,
    fontFamily,
  },

  /* Search */
  searchWrapper: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontFamily,
    paddingVertical: 0,
  },

  /* Tags */
  tagsScroll: {
    flexGrow: 0,
  },
  tagsContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
    alignItems: 'center',
  },
  tagPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagPillActive: {
    backgroundColor: '#000000',
  },
  tagPillInactive: {
    backgroundColor: '#F5F5F5',
  },
  tagPillPressed: {
    opacity: 0.7,
  },
  tagPillText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily,
  },
  tagPillTextActive: {
    color: '#ffffff',
  },
  tagPillTextInactive: {
    color: '#60646C',
  },

  /* List */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },

  /* Card */
  card: {
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  cardGenerating: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#0066FF20',
  },
  cardPressed: {
    opacity: 0.7,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  pinIcon: {
    fontSize: 14,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily,
  },
  cardTitleGenerating: {
    color: '#0066FF',
  },
  cardPreview: {
    fontSize: 14,
    lineHeight: 20,
    color: '#60646C',
    fontFamily,
  },
  cardPreviewGenerating: {
    color: '#8FA3CC',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.half,
  },
  tagBadge: {
    backgroundColor: '#0066FF1A',
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  tagBadgeGenerating: {
    backgroundColor: '#0066FF10',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily,
  },
  failedBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E53E3E',
    fontFamily,
  },
  cardDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily,
  },

  /* Empty */
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontFamily,
  },

  /* Spacer */
  spacer: {
    height: 60,
  },

  /* Selection Mode — Checkbox */
  checkbox: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    zIndex: 2,
  },
  checkboxUnchecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C0C4CC',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily,
  },
  cardSelected: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#0066FF40',
  },

  /* Cancel button (header) */
  cancelButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  cancelPressed: {
    opacity: 0.7,
  },
  cancelText: {
    fontSize: 16,
    color: '#0066FF',
    fontWeight: '500',
    fontFamily,
  },

  /* Select All bar */
  selectAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  checkboxSmall: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#C0C4CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSmallChecked: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  checkmarkSmall: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily,
  },
  selectAllText: {
    fontSize: 15,
    color: '#000000',
    fontFamily,
  },

  /* Bottom Action Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 4,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  bottomActionPressed: {
    opacity: 0.7,
  },
  bottomActionDisabled: {
    opacity: 0.35,
  },
  bottomActionDanger: {
    backgroundColor: '#FFF0F0',
  },
  bottomActionDangerPressed: {
    backgroundColor: '#FFE0E0',
  },
  bottomActionIcon: {
    fontSize: 18,
  },
  bottomActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily,
  },
  bottomActionTextDanger: {
    color: '#CC0000',
  },
  bottomActionTextDisabled: {
    color: '#9CA3AF',
  },
});
