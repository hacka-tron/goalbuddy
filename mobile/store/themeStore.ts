import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeKey, THEMES, ColorPalette, buildCustomPalette, PRIMARY_SWATCHES, ACCENT_SWATCHES } from '../lib/constants';

interface ThemeState {
  themeKey: ThemeKey;
  colors: ColorPalette;
  customPrimary: string;
  customAccent: string;
  customDark: boolean;
  setTheme: (key: ThemeKey) => Promise<void>;
  setCustomColors: (primary: string, accent: string, dark: boolean) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeKey: 'sage',
  colors: THEMES.sage.colors,
  customPrimary: PRIMARY_SWATCHES[0],
  customAccent: ACCENT_SWATCHES[0],
  customDark: false,

  setTheme: async (key) => {
    if (key === 'custom') {
      const { customPrimary, customAccent, customDark } = get();
      const colors = buildCustomPalette(customPrimary, customAccent, customDark);
      await AsyncStorage.setItem('theme', key);
      set({ themeKey: key, colors });
    } else {
      await AsyncStorage.setItem('theme', key);
      set({ themeKey: key, colors: THEMES[key].colors });
    }
  },

  setCustomColors: async (primary, accent, dark) => {
    const colors = buildCustomPalette(primary, accent, dark);
    await AsyncStorage.multiSet([
      ['theme', 'custom'],
      ['customPrimary', primary],
      ['customAccent', accent],
      ['customDark', dark ? '1' : '0'],
    ]);
    set({ themeKey: 'custom', colors, customPrimary: primary, customAccent: accent, customDark: dark });
  },

  loadTheme: async () => {
    const saved = await AsyncStorage.getItem('theme') as ThemeKey | null;
    if (!saved) return;
    if (saved === 'custom') {
      const [primary, accent, dark] = await Promise.all([
        AsyncStorage.getItem('customPrimary'),
        AsyncStorage.getItem('customAccent'),
        AsyncStorage.getItem('customDark'),
      ]);
      const p = primary ?? PRIMARY_SWATCHES[0];
      const a = accent ?? ACCENT_SWATCHES[0];
      const d = dark === '1';
      set({ themeKey: 'custom', colors: buildCustomPalette(p, a, d), customPrimary: p, customAccent: a, customDark: d });
    } else if (THEMES[saved as Exclude<ThemeKey, 'custom'>]) {
      set({ themeKey: saved, colors: THEMES[saved as Exclude<ThemeKey, 'custom'>].colors });
    }
  },
}));
