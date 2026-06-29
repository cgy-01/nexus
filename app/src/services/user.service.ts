/**
 * 用户数据 API
 *
 * 侧栏统计 & 热力图数据
 */

import api from './api';
import type { ApiResponse } from '@/types/api';

export interface StatsData {
  total_notes: number;
  total_active_days: number;
  consecutive_days: number;
}

export interface ActivityData {
  activity: number[][];  // 7 rows × N cols, weighted score (float)
}

export const userService = {
  /** 获取用户统计（全部笔记 / 累计天数 / 连续天数） */
  async getStats(): Promise<ApiResponse<StatsData>> {
    const { data } = await api.get('/users/stats');
    return data;
  },

  /** 获取用户活动热力图 （7 行 × weeks 列） */
  async getActivity(weeks = 14): Promise<ApiResponse<ActivityData>> {
    const { data } = await api.get('/users/activity', { params: { weeks } });
    return data;
  },
};
