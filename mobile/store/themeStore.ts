import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeKey, THEMES, ColorPalette, buildCustomPalette, PRIMARY_SWATCHES, ACCENT_SWATCHES, BACKGROUND_SWATCHES } from '../lib/constants';

interface ThemeState {
  themeKey: ThemeKey;
  colors: ColorPalette;
  customPrimary: string;
  customAccent: string;
  customBackground: string;
  setTheme: (key: ThemeKey) => Promise<void>;
  setCustomColors: (primary: string, accent: string, background: string) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeKey: 'sage',
  colors: THEMES.sage.colors,
  customPrimary: PRIMARY_SWATCHES[0],
  customAccent: ACCENT_SWATCHES[0],
  customBackground: BACKGROUND_SWATCHES[4], // default: charcoal dark

  setTheme: async (key) => {
    if (key === 'custom') {
      const { customPrimary, customAccent, customBackground } = get();
      const colors = buildCustomPalette(customPrimary, customAccent, customBackground);
      await AsyncStorage.setItem('theme', key);
      set({ themeKey: key, colors });
    } else {
      await AsyncStorage.setItem('theme', key);
      set({ themeKey: key, colors: THEMES[key].colors });
    }
  },

  setCustomColors: async (primary, accent, background) => {
    const colors = buildCustomPalette(primary, accent, background);
    await AsyncStorage.multiSet([
      ['theme', 'custom'],
      ['customPrimary', primary],
      ['customAccent', accent],
      ['customBackground', background],
    ]);
    set({ themeKey: 'custom', colors, customPrimary: primary, customAccent: accent, customBackground: background });
  },

  loadTheme: async () => {
    const saved = await AsyncStorage.getItem('theme') as ThemeKey | null;
    if (!saved) return;
    if (saved === 'custom') {
      const [primary, accent, background] = await Promise.all([
        AsyncStorage.getItem('customPrimary'),
        AsyncStorage.getItem('customAccent'),
        AsyncStorage.getItem('customBackground'),
      ]);
      const p = primary ?? PRIMARY_SWATCHES[0];
      const a = accent ?? ACCENT_SWATCHES[0];
      const bg = background ?? BACKGROUND_SWATCHES[4];
      set({ themeKey: 'custom', colors: buildCustomPalette(p, a, bg), customPrimary: p, customAccent: a, customBackground: bg });
    } else if (THEMES[saved as Exclude<ThemeKey, 'custom'>]) {
      set({ themeKey: saved, colors: THEMES[saved as Exclude<ThemeKey, 'custom'>].colors });
    }
  },
}));
