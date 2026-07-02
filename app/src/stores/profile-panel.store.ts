/**
 * 个人信息面板全局状态
 *
 * 在 Tab 布局层级渲染，覆盖整个页面（包括底栏）。
 */

import { create } from 'zustand';

interface ProfilePanelState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useProfilePanelStore = create<ProfilePanelState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
