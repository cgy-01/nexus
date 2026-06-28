/**
 * 侧边栏全局状态
 *
 * 在 Tab 布局层级渲染，覆盖整个页面（包括底栏）。
 */

import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
