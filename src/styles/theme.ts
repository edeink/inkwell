import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

export type ThemePresetKey = 'antd' | 'material' | 'glass' | 'vitepress';

export interface ThemePalette {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;

  background: {
    base: string;
    surface: string;
    container: string;
  };

  text: {
    primary: string;
    secondary: string;
    placeholder: string;
    inverse: string;
  };

  border: {
    base: string;
    secondary: string;
  };

  shadow: {
    sm: string;
    md: string;
  };

  component: {
    gridLine: string;
    headerBg: string;
    headerBgActive: string;
  };

  state: {
    hover: string;
    active: string;
    selected: string;
    focus: string;
    disabled: string;
  };
}

export const ThemePresetLabels: Record<ThemePresetKey, string> = {
  antd: 'Antd',
  material: 'Material',
  glass: 'Liquid',
  vitepress: 'VitePress',
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function parseHexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = (hex || '').trim();
  if (!s.startsWith('#')) {
    return null;
  }
  if (s.length === 4) {
    const r = Number.parseInt(s[1] + s[1], 16);
    const g = Number.parseInt(s[2] + s[2], 16);
    const b = Number.parseInt(s[3] + s[3], 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return { r, g, b };
    }
    return null;
  }
  if (s.length === 7) {
    const r = Number.parseInt(s.slice(1, 3), 16);
    const g = Number.parseInt(s.slice(3, 5), 16);
    const b = Number.parseInt(s.slice(5, 7), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return { r, g, b };
    }
    return null;
  }
  return null;
}

function applyAlphaToHex(hex: string, alpha: number): string {
  const a = clamp01(alpha);
  const rgb = parseHexToRgb(hex);
  if (!rgb) {
    return hex;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function createPresetTheme(
  base: ThemePalette,
  accents: Pick<ThemePalette, 'primary' | 'secondary' | 'success' | 'warning' | 'danger'>,
  mode: ThemeMode,
): ThemePalette {
  const selectedAlpha = mode === 'dark' ? 0.15 : 0.1;
  const focusAlpha = mode === 'dark' ? 0.25 : 0.2;
  return {
    ...base,
    ...accents,
    state: {
      ...base.state,
      selected: applyAlphaToHex(accents.primary, selectedAlpha),
      focus: applyAlphaToHex(accents.primary, focusAlpha),
    },
  };
}

// 硬编码的默认值，用于 Canvas 环境（无法直接读取 CSS 变量时作为回退或初始值）
// 实际运行时应尽量与 CSS 变量保持同步
const AntdThemes: Record<ThemeMode, ThemePalette> = {
  light: {
    primary: '#1677ff',
    secondary: '#595959',
    success: '#52c41a',
    warning: '#faad14',
    danger: '#ff4d4f',
    background: {
      base: '#ffffff',
      surface: '#f6f6f7',
      container: '#ffffff',
    },
    text: {
      primary: '#1f1f1f',
      secondary: '#595959',
      placeholder: '#8c8c8c',
      inverse: '#ffffff',
    },
    border: {
      base: '#d9d9d9',
      secondary: '#f0f0f0',
    },
    shadow: {
      sm: 'rgba(0, 0, 0, 0.08)',
      md: 'rgba(0, 0, 0, 0.12)',
    },
    component: {
      gridLine: '#f0f0f0',
      headerBg: '#fafafa',
      headerBgActive: '#e6f4ff',
    },
    state: {
      hover: 'rgba(0, 0, 0, 0.04)',
      active: 'rgba(0, 0, 0, 0.08)',
      selected: 'rgba(22, 119, 255, 0.1)',
      focus: 'rgba(22, 119, 255, 0.2)',
      disabled: 'rgba(0, 0, 0, 0.04)',
    },
  },
  dark: {
    primary: '#177ddc',
    secondary: '#a6a6a6',
    success: '#49aa19',
    warning: '#d89614',
    danger: '#ff4d4f',
    background: {
      base: '#1b1b1f',
      surface: '#161618',
      container: '#202127',
    },
    text: {
      primary: '#f0f0f0',
      secondary: '#a6a6a6',
      placeholder: '#6b6b6b',
      inverse: '#ffffff',
    },
    border: {
      base: '#303030',
      secondary: '#262626',
    },
    shadow: {
      sm: 'rgba(0, 0, 0, 0.55)',
      md: 'rgba(0, 0, 0, 0.7)',
    },
    component: {
      gridLine: '#262626',
      headerBg: '#1f1f1f',
      headerBgActive: '#111b26',
    },
    state: {
      hover: 'rgba(255, 255, 255, 0.04)',
      active: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(23, 125, 220, 0.15)',
      focus: 'rgba(23, 125, 220, 0.25)',
      disabled: 'rgba(255, 255, 255, 0.04)',
    },
  },
};

export const ThemePresets: Record<ThemePresetKey, Record<ThemeMode, ThemePalette>> = {
  antd: {
    light: AntdThemes.light,
    dark: AntdThemes.dark,
  },
  material: {
    light: createPresetTheme(
      AntdThemes.light,
      {
        primary: '#00838f',
        secondary: '#546e7a',
        success: '#2e7d32',
        warning: '#ed6c02',
        danger: '#d32f2f',
      },
      'light',
    ),
    dark: createPresetTheme(
      AntdThemes.dark,
      {
        primary: '#80deea',
        secondary: '#b0bec5',
        success: '#81c784',
        warning: '#ffb74d',
        danger: '#ef9a9a',
      },
      'dark',
    ),
  },
  glass: {
    light: createPresetTheme(
      AntdThemes.light,
      {
        primary: '#0a84ff',
        secondary: '#8e8e93',
        success: '#34c759',
        warning: '#ff9f0a',
        danger: '#ff3b30',
      },
      'light',
    ),
    dark: createPresetTheme(
      AntdThemes.dark,
      {
        primary: '#0a84ff',
        secondary: '#aeaeb2',
        success: '#30d158',
        warning: '#ffd60a',
        danger: '#ff453a',
      },
      'dark',
    ),
  },
  vitepress: {
    light: createPresetTheme(
      AntdThemes.light,
      {
        primary: '#646cff',
        secondary: '#4b5563',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      'light',
    ),
    dark: createPresetTheme(
      AntdThemes.dark,
      {
        primary: '#a8b1ff',
        secondary: '#a1a1aa',
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',
      },
      'dark',
    ),
  },
};

export const Themes: Record<ThemeMode, ThemePalette> = {
  light: ThemePresets.vitepress.light,
  dark: ThemePresets.vitepress.dark,
};

const THEME_PRESET_ATTR = 'data-ink-preset';
const THEME_PRESET_STORAGE_KEY = 'ink-theme-preset';
let currentPreset: ThemePresetKey = 'vitepress';

function normalizeThemePresetKey(v: string | null | undefined): ThemePresetKey | null {
  if (v === 'antd' || v === 'material' || v === 'glass' || v === 'vitepress') {
    return v;
  }
  if (v === 'default') {
    return 'antd';
  }
  if (v === 'cyan' || v === 'ocean' || v === 'rose' || v === 'emerald') {
    return 'material';
  }
  if (v === 'liquid-glass') {
    return 'glass';
  }
  return null;
}

function getPresetFromDom(): ThemePresetKey | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return normalizeThemePresetKey(document.documentElement.getAttribute(THEME_PRESET_ATTR));
}

function getPresetFromStorage(): ThemePresetKey | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return normalizeThemePresetKey(window.localStorage?.getItem(THEME_PRESET_STORAGE_KEY));
  } catch {
    void 0;
  }
  return null;
}

function setPresetToStorage(preset: ThemePresetKey): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage?.setItem(THEME_PRESET_STORAGE_KEY, preset);
  } catch {
    void 0;
  }
}

function setPresetToDom(preset: ThemePresetKey): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute(THEME_PRESET_ATTR, preset);
}

function getEffectivePreset(): ThemePresetKey {
  return getPresetFromDom() ?? currentPreset;
}

const cssVars = {
  primary: '--ink-demo-primary',
  secondary: '--ink-demo-secondary',
  success: '--ink-demo-success',
  warning: '--ink-demo-warning',
  danger: '--ink-demo-danger',
  bgBase: '--ink-demo-bg-base',
  bgSurface: '--ink-demo-bg-surface',
  bgContainer: '--ink-demo-bg-container',
  textPrimary: '--ink-demo-text-primary',
  textSecondary: '--ink-demo-text-secondary',
  textPlaceholder: '--ink-demo-text-placeholder',
  textInverse: '--ink-demo-text-inverse',
  border: '--ink-demo-border',
  borderSecondary: '--ink-demo-border-secondary',
  gridLine: '--ink-demo-grid-line',
  headerBg: '--ink-demo-header-bg',
  headerBgActive: '--ink-demo-header-bg-active',
} as const;

function applyPaletteToCssVars(palette: ThemePalette): void {
  if (typeof document === 'undefined') {
    return;
  }
  const style = document.documentElement.style;
  style.setProperty(cssVars.primary, palette.primary);
  style.setProperty(cssVars.secondary, palette.secondary);
  style.setProperty(cssVars.success, palette.success);
  style.setProperty(cssVars.warning, palette.warning);
  style.setProperty(cssVars.danger, palette.danger);
  style.setProperty(cssVars.bgBase, palette.background.base);
  style.setProperty(cssVars.bgSurface, palette.background.surface);
  style.setProperty(cssVars.bgContainer, palette.background.container);
  style.setProperty(cssVars.textPrimary, palette.text.primary);
  style.setProperty(cssVars.textSecondary, palette.text.secondary);
  style.setProperty(cssVars.textPlaceholder, palette.text.placeholder);
  style.setProperty(cssVars.textInverse, palette.text.inverse);
  style.setProperty(cssVars.border, palette.border.base);
  style.setProperty(cssVars.borderSecondary, palette.border.secondary);
  style.setProperty(cssVars.gridLine, palette.component.gridLine);
  style.setProperty(cssVars.headerBg, palette.component.headerBg);
  style.setProperty(cssVars.headerBgActive, palette.component.headerBgActive);
}

function clearPaletteCssVars(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const style = document.documentElement.style;
  Object.values(cssVars).forEach((k) => style.removeProperty(k));
}

function syncThemePresetToThemes(preset: ThemePresetKey): void {
  currentPreset = preset;
  Themes.light = ThemePresets[preset].light;
  Themes.dark = ThemePresets[preset].dark;
}

function syncCssVarsForCurrentState(): void {
  const preset = getEffectivePreset();
  if (preset === 'glass') {
    clearPaletteCssVars();
    return;
  }
  const mode = getCurrentThemeMode();
  applyPaletteToCssVars(ThemePresets[preset][mode]);
}

/**
 * 获取当前页面主题模式
 */
export function getCurrentThemeMode(): ThemeMode {
  if (typeof document === 'undefined') {
    return 'light';
  }
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    return 'dark';
  }
  if (document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
}

export function getCurrentTheme(): ThemePalette {
  return Themes[getCurrentThemeMode()];
}

export function getCurrentThemePreset(): ThemePresetKey {
  return getEffectivePreset();
}

type ThemeChangeListener = (theme: ThemePalette, mode: ThemeMode) => void;
const listeners: Set<ThemeChangeListener> = new Set();

/**
 * 订阅主题变化
 * @param listener 回调函数
 * @returns 取消订阅函数
 */
export function subscribeTheme(listener: ThemeChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 兼容旧 API 名称，但推荐使用 subscribeTheme
export const subscribeToThemeChange = (listener: (mode: ThemeMode) => void) => {
  return subscribeTheme((_theme, mode) => listener(mode));
};

function notifyThemeChange() {
  const preset = getEffectivePreset();
  if (preset !== currentPreset) {
    syncThemePresetToThemes(preset);
  }
  syncCssVarsForCurrentState();
  const mode = getCurrentThemeMode();
  const theme = Themes[mode];
  listeners.forEach((listener) => listener(theme, mode));

  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }
}

// 监听 html 标签的 data-theme / class 属性变化（适配 VitePress 通过 class="dark" 切换主题）
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === 'attributes' &&
        (mutation.attributeName === 'data-theme' ||
          mutation.attributeName === 'class' ||
          mutation.attributeName === THEME_PRESET_ATTR)
      ) {
        notifyThemeChange();
      }
    });
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', THEME_PRESET_ATTR],
    });
  }
}

export function setThemeMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute('data-theme', mode);
  notifyThemeChange();
}

export function setThemePreset(preset: ThemePresetKey): void {
  setPresetToDom(preset);
  setPresetToStorage(preset);
  currentPreset = preset;
  syncThemePresetToThemes(preset);
  notifyThemeChange();
}

export function registerTheme(mode: ThemeMode, theme: ThemePalette): void {
  Themes[mode] = theme;
  ThemePresets[currentPreset][mode] = theme;
  notifyThemeChange();
}

export function mergeTheme(mode: ThemeMode, patch: Partial<ThemePalette>): void {
  Themes[mode] = {
    ...Themes[mode],
    ...patch,
    background: { ...Themes[mode].background, ...patch.background },
    text: { ...Themes[mode].text, ...patch.text },
    border: { ...Themes[mode].border, ...patch.border },
    shadow: { ...Themes[mode].shadow, ...patch.shadow },
    component: { ...Themes[mode].component, ...patch.component },
    state: { ...Themes[mode].state, ...patch.state },
  };
  ThemePresets[currentPreset][mode] = Themes[mode];
  notifyThemeChange();
}

/**
 * React Hook for using theme
 * 返回当前的主题调色板
 */
export function useTheme(): ThemePalette {
  const [theme, setTheme] = useState<ThemePalette>(getCurrentTheme());

  useEffect(() => {
    // 确保初始化正确
    setTheme(getCurrentTheme());

    return subscribeTheme((newTheme) => {
      setTheme(newTheme);
    });
  }, []);

  return theme;
}

if (typeof document !== 'undefined') {
  const preset = getPresetFromDom() ?? getPresetFromStorage();
  if (preset) {
    setPresetToDom(preset);
    syncThemePresetToThemes(preset);
  }
  syncCssVarsForCurrentState();
}
