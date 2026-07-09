/**
 * 聊天主页
 *
 * - 初始：欢迎语 + 引导词条 + 输入框
 * - 发送消息后切换为聊天视图
 * - 侧边栏展示历史会话
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  Animated,
  Keyboard,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation, type Href } from 'expo-router';
import Markdown from 'react-native-markdown-display';

import { useChatStore } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSidebarStore } from '@/stores/sidebar.store';
import { useDocumentStore } from '@/stores/document.store';
import type { NoteType } from '@/services/document.service';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  MenuIcon,
  EditIcon,
  ModelIcon,
  MicIcon,
  SendIcon,
  MoreIcon,
  GenerateNoteIcon,
  ChevronDownIcon,
} from '@/components/icons';

const iconColor = '#000000';

const noteTypeOptions: { label: string; value: NoteType }[] = [
  { label: '通用笔记', value: 'general' },
  { label: '公众号推文', value: 'wechat_article' },
  { label: '视频口播稿', value: 'video_script' },
  { label: '小红书文案', value: 'xiaohongshu' },
];

/* ── Markdown 样式 ── */
const mdStyles = {
  body: {
    fontSize: 18, lineHeight: 29, color: '#000000',
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
  heading2: { fontSize: 19, lineHeight: 27, fontWeight: '700' as const, color: '#000000', marginBottom: 6, marginTop: 14 },
  heading3: { fontSize: 17, lineHeight: 25, fontWeight: '700' as const, color: '#000000', marginBottom: 4, marginTop: 12 },
  link: { color: '#0066FF' },
};

/* ── 引导词条 ── */
function GuidancePill({ text, borderColor, onPress }: { text: string; borderColor: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pillStyles.pill, { borderColor }, pressed && { opacity: 0.7 }]}>
      <Text style={pillStyles.text}>{text}</Text>
    </Pressable>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 16, lineHeight: 22, color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
    fontWeight: '400',
  },
});

export default function ChatMainScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const {
    currentSession, currentMessages, isSending, streamingContent, streamError,
    fetchSessions, sendMessage,
  } = useChatStore();
  const isGenerating = useDocumentStore((s) => s.isGenerating);
  const generateNoteFromChat = useDocumentStore((s) => s.generateNoteFromChat);

  const [inputText, setInputText] = useState('');
  const [chatStarted, setChatStarted] = useState(false);
  const [noteMenuOpen, setNoteMenuOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hasInput = inputText.trim().length > 0;

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 侧边栏选择历史会话 → 自动进入聊天视图
  useEffect(() => {
    if (currentSession && currentMessages.length > 0) {
      setChatStarted(true);
    }
  }, [currentSession?.id, currentMessages.length > 0]);

  /* ── 整理笔记 ── */
  const handleOrganizeNote = useCallback(async (noteType: NoteType) => {
    if (isGenerating || currentMessages.length === 0) return;
    setNoteMenuOpen(false);

    // 1. 直接在 store 插入"生成中"占位卡片（同步，先于导航生效）
    const optimisticId = `note-gen-${Date.now()}`;
    useDocumentStore.setState((state) => ({
      notes: [
        {
          id: optimisticId,
          title: '生成中...',
          preview: 'AI 正在整理对话内容...',
          tag: '学习' as const,
          isPinned: false,
          content: '',
          status: 'generating' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...state.notes,
      ],
    }));

    // 2. 跳转到笔记页（此时 store 已有占位卡片）
    router.navigate('/(app)/documents' as Href);

    // 3. 异步调用 LLM 整理，完成后替换占位卡片
    generateNoteFromChat(
      {
        messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
        note_type: noteType,
      },
      optimisticId,
    );
  }, [isGenerating, currentMessages, generateNoteFromChat]);

  /* ── 发送 ── */
  const handleSend = useCallback(async () => {
    if (!hasInput || isSending) return;
    const text = inputText.trim();
    setInputText('');
    setNoteMenuOpen(false);

    if (!chatStarted) {
      setChatStarted(true);
      // 不预先创建会话，后端 chat 接口会自动创建
      await sendMessage(undefined, text);
    } else if (currentSession) {
      await sendMessage(currentSession.id, text);
    }
  }, [hasInput, isSending, chatStarted, currentSession, inputText, sendMessage]);

  /* ── 新建对话 ── */
  const handleNewChat = useCallback(() => {
    setChatStarted(false);
    setInputText('');
    setNoteMenuOpen(false);
    // 清空 store 中的当前会话
    useChatStore.setState({ currentSession: null, currentMessages: [], streamingContent: '' });
  }, []);

  /* ── 侧边栏 ── */
  const openSidebar = useSidebarStore((s) => s.open);

  /* ── 键盘 ── */
  const navigation = useNavigation();
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      // 减去底栏高度 + 留一点呼吸空间（~8px）
      const offset = Math.max(0, e.endCoordinates.height - 42);
      Animated.timing(keyboardAnim, {
        toValue: offset,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
          paddingTop: 4,
          display: 'flex',
        },
      });
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [keyboardAnim, navigation]);

  /* ── 合并消息用于渲染 ── */
  const displayMessages = [
    ...currentMessages.map((m) => ({ key: m.id, role: m.role, content: m.content })),
    ...(streamingContent ? [{ key: 'streaming', role: 'assistant' as const, content: streamingContent }] : []),
  ];

  const pageContent = (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={openSidebar} style={styles.topBarLeft}>
          <MenuIcon color={iconColor} />
        </Pressable>
        <View style={styles.topBarRight}>
          {chatStarted ? (
            <View style={styles.chatPill}>
              <Pressable onPress={handleNewChat}>
                <EditIcon color={iconColor} />
              </Pressable>
              <Pressable>
                <MoreIcon />
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable onPress={handleNewChat}>
                <EditIcon color={iconColor} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* 内容区 */}
      {chatStarted ? (
        <>
          {streamError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{streamError}</Text>
            </View>
          )}
          <ScrollView
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            ref={scrollRef}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {displayMessages.map((msg) =>
              msg.role === 'user' ? (
                <View key={msg.key} style={bubbleStyles.rowOwn}>
                  <View style={bubbleStyles.bubbleOwn}>
                    <Text style={bubbleStyles.textOwn}>{msg.content}</Text>
                  </View>
                </View>
              ) : (
                <View key={msg.key} style={styles.llmMessage}>
                  <Markdown style={mdStyles}>{msg.content}</Markdown>
                </View>
              ),
            )}
          </ScrollView>
        </>
      ) : (
        <>
          <View style={styles.greeting}>
            <Text style={styles.greetingName}>{user?.display_name || '你来了'}</Text>
            <Text style={styles.greetingQuestion}>今天想聊些什么</Text>
          </View>
          <View style={styles.guidance}>
            <GuidancePill
              text="📒 查看笔记"
              borderColor={theme.nexusCardBorder}
              onPress={() => router.push('/documents' as Href)}
            />
          </View>
        </>
      )}

      {/* Input Bar & Action Button */}
      <Animated.View
        style={[styles.inputBarContainer, { transform: [{ translateY: Animated.multiply(keyboardAnim, -1) }] }]}
      >
        {chatStarted && (
          <View style={styles.generateNoteWrap}>
            {noteMenuOpen && !isGenerating && (
              <View style={styles.noteTypeMenu}>
                {noteTypeOptions.map((option, index) => (
                  <Pressable
                    key={option.value}
                    onPress={() => handleOrganizeNote(option.value)}
                    style={({ pressed }) => [
                      styles.noteTypeItem,
                      index > 0 && styles.noteTypeItemBorder,
                      pressed && styles.noteTypeItemPressed,
                    ]}
                  >
                    <Text style={styles.noteTypeText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable
              onPress={() => {
                if (!isGenerating && currentMessages.length > 0) {
                  setNoteMenuOpen((open) => !open);
                }
              }}
              disabled={isGenerating || currentMessages.length === 0}
              style={({ pressed }) => [
                styles.generateNoteButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <View style={{ marginTop: 0.5 }}>
                    <GenerateNoteIcon size={14.5} color="#000000" />
                  </View>
                  <Text style={styles.generateNoteText}>生成笔记</Text>
                  <View style={styles.generateNoteDivider} />
                  <ChevronDownIcon size={13} color="#000000" />
                </>
              )}
            </Pressable>
          </View>
        )}
        <View style={styles.inputBar}>
          <Pressable style={styles.modelButton}>
            <ModelIcon color={iconColor} />
          </Pressable>
          <TextInput
            style={styles.textInput}
            placeholder="问问 DeepSeek"
            placeholderTextColor="rgba(0,0,0,0.55)"
            value={inputText}
            onChangeText={setInputText}
            multiline
            textAlignVertical="center"
          />
          <Pressable
            style={({ pressed }) => [styles.sendButton, pressed && styles.sendPressed]}
            onPress={hasInput ? handleSend : undefined}
          >
            {hasInput ? <SendIcon /> : <MicIcon />}
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );

  return (
    <View style={styles.root}>
      <View style={styles.frame}>
        {pageContent}
      </View>
    </View>
  );
}

/* ──────────── Styles ──────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  frame: {
    flex: 1, backgroundColor: '#ffffff',
  },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },

  /* Top Bar */
  topBar: { height: 35, flexDirection: 'row', alignItems: 'center', marginTop: Platform.select({ android: Spacing.two }) },
  topBarLeft: { position: 'absolute', left: 0, zIndex: 1 },
  topBarRight: { position: 'absolute', right: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, zIndex: 1 },
  chatPill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 21, paddingHorizontal: Spacing.two + 4, height: 42,
  },
  brandTitle: {
    flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '400', color: '#000000', lineHeight: 30,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },

  /* Greeting */
  greeting: { marginTop: 92 },
  greetingName: { fontSize: 24, fontWeight: '400', color: '#000000', lineHeight: 30, fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
  greetingQuestion: { fontSize: 32, fontWeight: '400', color: '#000000', lineHeight: 40, marginTop: Spacing.one, fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },

  /* Guidance */
  guidance: { marginTop: 44, gap: 12 },

  /* Chat */
  chatArea: { flex: 1 },
  chatContent: { paddingTop: 20, paddingBottom: 80 },
  llmMessage: { paddingHorizontal: 5, marginBottom: 24 },

  /* Error */
  errorBanner: { backgroundColor: '#FFF3CD', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 10, marginBottom: Spacing.two },
  errorText: { color: '#856404', fontSize: 13, fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },

  /* Input Bar */
  inputBarContainer: {
    position: 'absolute', bottom: 0, left: '5%', right: '5%',
    alignItems: 'stretch',
  },
  generateNoteWrap: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    position: 'relative',
    zIndex: 10,
  },
  generateNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  generateNoteText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  generateNoteDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.16)',
    marginLeft: 8,
    marginRight: 6,
  },
  noteTypeMenu: {
    position: 'absolute',
    left: 0,
    bottom: 34,
    minWidth: 158,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  noteTypeItem: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  noteTypeItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  noteTypeItemPressed: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  noteTypeText: {
    color: '#000000',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  inputBar: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
  },
  modelButton: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.two,
  },
  textInput: {
    flex: 1,
    fontSize: 17, lineHeight: 24, color: '#000000',
    paddingVertical: Spacing.one, paddingHorizontal: Spacing.one,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
    maxHeight: 120,
  },
  sendButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.two },
  sendPressed: { opacity: 0.7 },
});

/* ── Bubble (仅用户消息) ── */
const bubbleStyles = StyleSheet.create({
  rowOwn: { marginBottom: 16, alignItems: 'flex-end' },
  bubbleOwn: {
    maxWidth: '90%', minWidth: 60, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  textOwn: { fontSize: 18, lineHeight: 29, color: '#000000', fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }) },
});
