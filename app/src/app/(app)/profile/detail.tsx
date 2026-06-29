/**
 * 个人信息详情页
 *
 * 展示：头像、昵称、UID、手机号、微信、邮箱
 */

import { StyleSheet, View, Text, Pressable, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuthStore } from '@/stores/auth.store';
import { Spacing } from '@/constants/theme';

/* ── Chevron ── */
function ChevronRight() {
  return <Text style={styles.chevronIcon}>{'›'}</Text>;
}

/* ── Info Row ── */
function InfoRow({
  label,
  value,
  action,
  onPress,
}: {
  label: string;
  value?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      {value !== undefined ? (
        <Text style={rowStyles.value}>{value}</Text>
      ) : action ? (
        <Pressable onPress={onPress} style={rowStyles.actionWrap}>
          <Text style={rowStyles.actionText}>{action}</Text>
          <ChevronRight />
        </Pressable>
      ) : null}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  label: {
    fontSize: 17,
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  value: {
    fontSize: 16,
    color: '#60646C',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  actionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: 16,
    color: '#60646C',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
});

export default function ProfileDetailScreen() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.display_name ?? '程嘉文';
  const userId = user?.uid ?? (user?.id ?? '38271').slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>设置</Text>
        <Pressable onPress={() => router.back()} style={styles.backCircle}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        {/* 个人信息卡片 */}
        <View style={styles.profileCard}>
          {/* 头像 — 同行 */}
          <View style={rowStyles.row}>
            <Text style={rowStyles.label}>头像</Text>
            <View style={styles.avatarSm}>
              <Text style={styles.avatarSmText}>
                {(displayName[0] ?? '?').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* 昵称 */}
          <InfoRow label="昵称" value={displayName} />

          <View style={styles.cardDivider} />

          {/* UID */}
          <InfoRow label="UID" value={userId} />
        </View>

        {/* 绑定信息卡片 */}
        <View style={styles.bindCard}>
          {/* 手机号 */}
          <InfoRow label="手机号" action="去绑定" />
          <View style={styles.cardDivider} />
          {/* 微信 */}
          <InfoRow label="微信" action="去绑定" />
          <View style={styles.cardDivider} />
          {/* 邮箱 */}
          <InfoRow label="邮箱" action="去绑定" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  topBar: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backCircle: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 24,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: Spacing.two,
  },
  /* Profile card */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.three,
  },
  cardDivider: {
    height: 0.5,
    backgroundColor: '#E8E8E8',
    width: '100%',
  },
  /* Avatar inline */
  avatarSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  /* Bind card */
  bindCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Spacing.one,
  },
  /* Chevron */
  chevronIcon: {
    fontSize: 20,
    color: '#9CA3AF',
    lineHeight: 20,
  },
});
