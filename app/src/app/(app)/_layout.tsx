/**
 * 主应用布局（需登录）
 *
 * - 检查登录态，未登录重定向到 /login
 * - 底部 Tab 导航：聊天 / 笔记 / 用户
 * - 侧边栏在 Tabs 之上渲染，覆盖底栏
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, Text, Pressable, View, Animated, Dimensions, StyleSheet } from 'react-native';
import { Tabs, router, type Href } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useSidebarStore } from '@/stores/sidebar.store';
import { useChatStore } from '@/stores/chat.store';
import SidebarDrawer from '@/components/sidebar-drawer';
import type { Session } from '@/types/chat';

/** 调试开关：true = 跳过登录校验，直接进入主应用 */
const DEBUG_SKIP_AUTH = false;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8;

const TAB_ICONS: Record<string, string> = {
  chat: '💬',
  documents: '📒',
  profile: '👤',
};

function TabButton(props: any) {
  return (
    <Pressable
      {...props}
      android_ripple={null}
      style={({ pressed }) => [props.style]}
    />
  );
}

/* ── 按时间分组（侧边栏数据） ── */
function groupSessions(sessions: Session[]) {
  const now = new Date();
  const groups: Record<string, Session[]> = { '今天': [], '昨天': [], '七天内': [], '30天内': [], '更久': [] };

  for (const s of sessions) {
    const d = new Date(s.updated_at);
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) groups['今天'].push(s);
    else if (days === 1) groups['昨天'].push(s);
    else if (days < 7) groups['七天内'].push(s);
    else if (days < 30) groups['30天内'].push(s);
    else groups['更久'].push(s);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([heading, items]) => ({
      heading,
      items: items.map((s) => ({
        id: s.id,
        label: s.title,
        description: `${s.model} · ${s.total_tokens} tokens`,
      })),
    }));
}

export default function AppLayout() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!DEBUG_SKIP_AUTH && !isLoading && !isLoggedIn) {
      router.replace('/(auth)/login' as Href);
    }
  }, [isLoading, isLoggedIn]);

  /* ── 侧边栏 ── */
  const isSidebarOpen = useSidebarStore((s) => s.isOpen);
  const closeSidebar = useSidebarStore((s) => s.close);
  const sessions = useChatStore((s) => s.sessions);
  const fetchMessages = useChatStore((s) => s.fetchMessages);

  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    if (isSidebarOpen) {
      setSidebarVisible(true);
      Animated.spring(sidebarAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.spring(sidebarAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 })
        .start(() => setSidebarVisible(false));
    }
  }, [isSidebarOpen, sidebarAnim]);

  const overlayOpacity = sidebarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });
  const sidebarSections = groupSessions(sessions);

  const handleSessionPress = useCallback((sessionId: string) => {
    closeSidebar();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    // 设置当前会话 + 加载消息
    useChatStore.setState({ currentSession: session });
    fetchMessages(sessionId);
    // 切到聊天 Tab
    router.navigate('/(app)/chat' as Href);
  }, [closeSidebar, sessions, fetchMessages]);

  /* ── 跳过认证时不等待 hydrate ── */
  if (!DEBUG_SKIP_AUTH && isLoading) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: 'none',
          tabBarButton: TabButton,
          tabBarActiveTintColor: '#000000',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#F0F0F3',
            borderTopWidth: 1,
            paddingTop: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
          },
        }}
      >
        <Tabs.Screen
          name="chat"
          options={{
            title: '聊天',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
                {TAB_ICONS.chat}
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="documents"
          options={{
            title: '笔记',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
                {TAB_ICONS.documents}
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: '用户',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
                {TAB_ICONS.profile}
              </Text>
            ),
          }}
        />
      </Tabs>

      {/* 暗色遮罩 — 覆盖整个页面包括底栏 */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={isSidebarOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
      </Animated.View>

      {/* 侧边栏 — 最顶层 */}
      {sidebarVisible && (
        <SidebarDrawer
          animValue={sidebarAnim}
          width={SIDEBAR_WIDTH}
          sections={sidebarSections}
          onSessionPress={handleSessionPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 100,
    elevation: 100,
  },
});
