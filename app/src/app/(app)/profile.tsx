/**
 * 个人中心页
 *
 * 显示用户信息 + 退出登录
 */

import { StyleSheet, View, Text, Pressable, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';

import { useAuthStore } from '@/stores/auth.store';
import { Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login' as Href);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>个人中心</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.display_name ?? user?.email ?? '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>
            {user?.display_name ?? '未设置名称'}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  email: {
    fontSize: 14,
    color: '#60646C',
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  section: {
    marginTop: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  logoutButton: {
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    paddingVertical: Spacing.three + 2,
    alignItems: 'center',
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  logoutText: {
    color: '#CC0000',
    fontSize: 17,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
});
