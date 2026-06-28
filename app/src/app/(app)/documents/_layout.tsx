/**
 * 笔记模块布局
 *
 * Stack 导航：笔记列表 → 笔记详情
 */

import { Stack } from 'expo-router';

export default function DocumentsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
