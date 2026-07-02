/**
 * 用户设置覆层全局状态
 *
 * 在 Tab 布局层级渲染，覆盖整个页面（包括底栏）。
 */

import { create } from 'zustand';

interface ProfileOverlayState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useProfileOverlayStore = create<ProfileOverlayState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
