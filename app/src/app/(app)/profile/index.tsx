/**
 * 个人中心页
 *
 * 展示用户头像 + 昵称 + 退出登录
 */

import { StyleSheet, View, Text, Pressable, Platform, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';

import { useAuthStore } from '@/stores/auth.store';
import { useProfilePanelStore } from '@/stores/profile-panel.store';
import { SERVER_HOST } from '@/services/api';
import { Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const openProfilePanel = useProfilePanelStore((s) => s.open);

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

  const displayName = user?.display_name ?? '未设置名称';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* User card — flat, no background */}
      <Pressable
        style={styles.userRow}
        onPress={openProfilePanel}
      >
        <View style={styles.avatar}>
          {user?.avatar_url ? (
            <Image
              source={{
                uri: `${SERVER_HOST}/api/v1/users/avatars/${user.id}?v=${user.avatar_url.slice(-8)}`,
              }}
              style={styles.avatarImg}
            />
          ) : (
            <Text style={styles.avatarText}>
              {(displayName[0] ?? '?').toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.displayName}>{displayName}</Text>
        </View>
        <Text style={styles.chevron}>{'›'}</Text>
      </Pressable>

      {/* Logout */}
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
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
  /* User row */
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  nameCol: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
  },
  /* Logout */
  section: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
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
