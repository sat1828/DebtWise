import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: true,
      toggle: () => {
        const next = !get().isDark;
        document.documentElement.classList.toggle('dark', next);
        set({ isDark: next });
      },
      setDark: (dark) => {
        document.documentElement.classList.toggle('dark', dark);
        set({ isDark: dark });
      },
    }),
    { name: 'debtwise-theme' }
  )
);
