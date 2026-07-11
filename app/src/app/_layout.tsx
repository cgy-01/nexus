/**
 * 根布局
 *
 * - ThemeProvider（暗色/亮色）
 * - SafeAreaProvider
 * - 启动时 hydrate 认证状态
 * - Stack 导航（headerShown: false，各子布局自行控制）
 */

import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { useDocumentStore } from '@/stores/document.store';
import { tokenStore } from '@/services/token';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    return tokenStore.onAuthExpired(() => {
      useAuthStore.getState().clearSession();
    });
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    void useChatStore.getState().hydrateCache(userId);
    void useDocumentStore.getState().hydrateCache(userId);
  }, [isLoggedIn, userId]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
