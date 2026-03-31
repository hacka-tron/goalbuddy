import { StateCreator } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ThemeKey, THEMES, ColorPalette, buildCustomPalette,
  PRIMARY_SWATCHES, ACCENT_SWATCHES, BACKGROUND_SWATCHES,
} from '../../lib/constants';

export interface ThemeSlice {
  themeKey: ThemeKey;
  colors: ColorPalette;
  customPrimary: string;
  customAccent: string;
  customBackground: string;
  setTheme: (key: ThemeKey) => void;
  setCustomColors: (primary: string, accent: string, background: string) => void;
  loadTheme: () => void;
}

export const createThemeSlice: StateCreator<ThemeSlice> = (set, get) => ({
  themeKey: 'sage',
  colors: THEMES.sage.colors,
  customPrimary: PRIMARY_SWATCHES[0],
  customAccent: ACCENT_SWATCHES[0],
  customBackground: BACKGROUND_SWATCHES[4],

  setTheme: (key) => {
    if (key === 'custom') {
      const { customPrimary, customAccent, customBackground } = get();
      const colors = buildCustomPalette(customPrimary, customAccent, customBackground);
      AsyncStorage.setItem('theme', key);
      set({ themeKey: key, colors });
    } else {
      AsyncStorage.setItem('theme', key);
      set({ themeKey: key, colors: THEMES[key].colors });
    }
  },

  setCustomColors: (primary, accent, background) => {
    const colors = buildCustomPalette(primary, accent, background);
    AsyncStorage.multiSet([
      ['theme', 'custom'],
      ['customPrimary', primary],
      ['customAccent', accent],
      ['customBackground', background],
    ]);
    set({ themeKey: 'custom', colors, customPrimary: primary, customAccent: accent, customBackground: background });
  },

  loadTheme: () => {
    AsyncStorage.multiGet(['theme', 'customPrimary', 'customAccent', 'customBackground']).then(
      ([[, saved], [, p], [, a], [, bg]]) => {
        if (!saved) return;
        const primary = p ?? PRIMARY_SWATCHES[0];
        const accent = a ?? ACCENT_SWATCHES[0];
        const background = bg ?? BACKGROUND_SWATCHES[4];
        if (saved === 'custom') {
          set({ themeKey: 'custom', colors: buildCustomPalette(primary, accent, background), customPrimary: primary, customAccent: accent, customBackground: background });
        } else if (THEMES[saved as Exclude<ThemeKey, 'custom'>]) {
          set({ themeKey: saved as ThemeKey, colors: THEMES[saved as Exclude<ThemeKey, 'custom'>].colors });
        }
      }
    );
  },
});
