/**
 * 认证页面布局
 *
 * Stack 导航，登录/注册之间可以互相跳转
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
