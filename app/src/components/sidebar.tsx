import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Platform, ScrollView, Pressable, Image } from 'react-native';
import { router, type Href } from 'expo-router';

import { useAuthStore } from '@/stores/auth.store';
import { SERVER_HOST } from '@/services/api';
import { useSidebarStore } from '@/stores/sidebar.store';
import { Spacing } from '@/constants/theme';
import { userService, type StatsData, type ActivityData } from '@/services/user.service';

/* ── Chevron icon ── */
function ChevronRight() {
  return <Text style={chevronStyles.icon}>{'›'}</Text>;
}
const chevronStyles = StyleSheet.create({
  icon: { fontSize: 20, color: '#9CA3AF', lineHeight: 20 },
});

/* ── Session item (title + ⋯) ── */
function SessionItem({
  id,
  label,
  onPress,
}: {
  id: string;
  label: string;
  onPress?: (id: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress?.(id)}
      style={({ pressed }) => [sessionStyles.item, pressed && { opacity: 0.6 }]}
    >
      <Text style={sessionStyles.title} numberOfLines={1}>
        {label}
      </Text>
      <Text style={sessionStyles.more}>{'⋯'}</Text>
    </Pressable>
  );
}
const sessionStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  more: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: Spacing.two,
  },
});

/* ── Heatmap ── */
const HEAT_COLORS = ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'];
const NUM_COLS = 14;
const NUM_ROWS = 7;
const MONTH_MARKS: Record<number, string> = { 1: '4月', 5: '5月', 9: '6月', 13: '7月' };

function HeatmapGrid({
  containerWidth,
  activity,
}: {
  containerWidth: number;
  activity: number[][] | null;
}) {
  const GAP = 4;
  const PAD = 16;
  const contentWidth = containerWidth - PAD * 2;
  const cols = activity?.[0]?.length ?? NUM_COLS;
  const cellSize = Math.floor((contentWidth - (cols - 1) * GAP) / cols);

  /* Map learning-loop score → heat color */
  function colorFor(score: number): string {
    if (score < 0) return HEAT_COLORS[0]; // future
    if (score === 0) return HEAT_COLORS[0];       // 什么都没干
    if (score <= 1) return HEAT_COLORS[1];        // 聊了天，没整理
    if (score <= 3) return HEAT_COLORS[2];        // 有一定产出
    if (score <= 6) return HEAT_COLORS[3];        // 良好产出
    return HEAT_COLORS[4];                         // 学习闭环达成
  }

  // 无数据时显示全灰，不做 mock
  const rows = activity && activity.length > 0
    ? activity
    : Array.from({ length: NUM_ROWS }, () => Array(NUM_COLS).fill(0));
  const displayRows = rows;

  return (
    <View style={[heatmapStyles.grid, { paddingHorizontal: PAD }]}>
      {displayRows.map((row, ri) => (
        <View key={ri} style={[heatmapStyles.row, { gap: GAP, marginBottom: GAP }]}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={[{ width: cellSize, height: cellSize, borderRadius: 3, backgroundColor: colorFor(cell) }]}
            />
          ))}
        </View>
      ))}
      <View style={[heatmapStyles.monthRow, { gap: GAP }]}>
        {Array.from({ length: cols }).map((_, ci) => (
          <Text key={ci} style={[heatmapStyles.monthLabel, { width: cellSize }]}>
            {MONTH_MARKS[ci] ?? ''}
          </Text>
        ))}
      </View>
    </View>
  );
}
const heatmapStyles = StyleSheet.create({
  grid: { alignItems: 'center', paddingTop: 4 },
  row: { flexDirection: 'row' },
  monthRow: { flexDirection: 'row', paddingTop: 2, justifyContent: 'center' },
  monthLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
});

/* ── Stats ── */
interface StatsData {
  total_notes: number;
  total_active_days: number;
  consecutive_days: number;
}

function fmtStat(val: number | undefined | null, toDash?: boolean): string {
  if (val == null) return '–';
  if (toDash && val === 1) return '–';
  return String(val);
}

function StatsRow({ data }: { data: StatsData | null }) {
  const stats = [
    { value: fmtStat(data?.total_notes), label: '全部笔记' },
    { value: fmtStat(data?.total_active_days), label: '累计天数' },
    { value: fmtStat(data?.consecutive_days, true), label: '连续天数' },
  ];
  return (
    <View style={statsStyles.row}>
      {stats.map((s, i) => (
        <View key={i} style={statsStyles.card}>
          <Text style={statsStyles.value}>{s.value}</Text>
          <Text style={statsStyles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}
const statsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'column',
    gap: 0,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  label: {
    fontSize: 12,
    color: '#60646C',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
});

/* ── Time-grouped sessions ── */
interface SessionData {
  id: string;
  title: string;
  model: string;
  total_tokens: number;
  updated_at: string;
}

function groupSessions(sessions: SessionData[]) {
  const now = new Date();
  // 归零到当天 0:00，按日历日比较而非小时差
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;

  const groups: Record<string, SessionData[]> = {
    今天: [], 昨天: [], 七天内: [], '30天内': [], 更久: [],
  };
  for (const s of sessions) {
    const d = new Date(s.updated_at);
    const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.floor((today.getTime() - sessionDay.getTime()) / msPerDay);
    if (days === 0) groups['今天'].push(s);
    else if (days === 1) groups['昨天'].push(s);
    else if (days < 7) groups['七天内'].push(s);
    else if (days < 30) groups['30天内'].push(s);
    else groups['更久'].push(s);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

interface SidebarPanelProps {
  width: number;
  sessions: SessionData[];
  onSessionPress?: (sessionId: string) => void;
}

export default function SidebarPanel({ width, sessions, onSessionPress }: SidebarPanelProps) {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.display_name ?? '用户';
  const userId = user?.uid ?? (user?.id ?? '00000').slice(0, 5);
  const closeSidebar = useSidebarStore((s) => s.close);
  const groups = groupSessions(sessions);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  // 当 avatar_url 变化时递增，强制 Image 组件重新加载
  const [avatarVersion, setAvatarVersion] = useState(0);
  const prevAvatarUrl = useRef(user?.avatar_url);

  useEffect(() => {
    if (user?.avatar_url !== prevAvatarUrl.current) {
      prevAvatarUrl.current = user?.avatar_url;
      setAvatarVersion((v) => v + 1);
    }
  }, [user?.avatar_url]);

  useEffect(() => {
    userService.getStats().then((res) => setStats(res.data)).catch(() => {});
    userService.getActivity(14).then((res) => setActivity(res.data)).catch(() => {});
  }, []);

  const handleProfilePress = () => {
    closeSidebar();
    router.navigate('/(app)/profile' as Href);
  };

  return (
    <View style={[styles.root, { width }]}>
      {/* User profile */}
      <Pressable
        style={styles.profileRow}
        onPress={handleProfilePress}
      >
        <View style={styles.profileLeft}>
          <View style={styles.avatar}>
            {user?.avatar_url ? (
              <Image
                source={{ uri: `${SERVER_HOST}/api/v1/users/avatars/${user.id}?v=${avatarVersion}` }}
                style={styles.avatarImg}
              />
            ) : (
              <Text style={styles.avatarText}>
                {(displayName[0] ?? '?').toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.nameCol}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.uid}>uid{userId}</Text>
          </View>
        </View>
        <ChevronRight />
      </Pressable>

      {/* Stats */}
      <StatsRow data={stats} />

      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Heatmap */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>学习日历</Text>
        </View>
        <HeatmapGrid containerWidth={width} activity={activity?.activity ?? null} />

        {/* Divider */}
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
        </View>

        {/* Chat history */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>历史记录</Text>
        </View>
        {groups.map(([heading, items]) => (
          <View key={heading}>
            <Text style={styles.timeHeading}>{heading}</Text>
            {items.map((s) => (
              <SessionItem
                key={s.id}
                id={s.id}
                label={s.title}
                onPress={onSessionPress}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 56,
  },
  /* Profile */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: 16,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  nameCol: {
    flexDirection: 'column',
    gap: 2,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  uid: {
    fontSize: 13,
    color: '#60646C',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  /* Section title */
  sectionTitle: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  /* Divider */
  dividerWrap: {
    paddingVertical: Spacing.two,
    paddingHorizontal: 20,
    width: '100%',
  },
  dividerLine: {
    height: 1.5,
    backgroundColor: '#E0E0E0',
    width: '100%',
  },
  /* Time heading */
  timeHeading: {
    fontSize: 13,
    color: '#9CA3AF',
    paddingHorizontal: Spacing.three,
    paddingVertical: 2,
    fontFamily: Platform.select({ ios: 'system-ui', default: 'normal' }),
  },
  /* Scroll */
  scrollArea: {
    flex: 1,
  },
});
