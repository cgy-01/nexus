/**
 * 启动中转页
 *
 * 根据登录态自动跳转到：
 * - 已登录 → /(app)/chat（会话列表）
 * - 未登录 → /(auth)/login
 */

import { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

/** 调试开关：true = 跳过登录校验，直接进入主应用 */
const DEBUG_SKIP_AUTH = false;

export default function SplashScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (DEBUG_SKIP_AUTH) {
      router.replace('/(app)/chat' as Href);
      return;
    }
    if (!isLoading) {
      router.replace(isLoggedIn ? '/(app)/chat' as Href : '/(auth)/login' as Href);
    }
  }, [isLoading, isLoggedIn]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/splash-icon.png')}
        style={styles.logo}
        accessibilityLabel="Pick"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 120,
    height: 120,
  },
});
