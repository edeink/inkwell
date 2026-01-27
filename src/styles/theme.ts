import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

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

// 硬编码的默认值，用于 Canvas 环境（无法直接读取 CSS 变量时作为回退或初始值）
// 实际运行时应尽量与 CSS 变量保持同步
export const Themes: Record<ThemeMode, ThemePalette> = {
  light: {
    primary: '#1677ff', // var(--ink-demo-primary)
    secondary: '#8c8c8c',
    success: '#52c41a',
    warning: '#faad14',
    danger: '#ff4d4f',
    background: {
      base: '#ffffff',
      surface: '#f5f5f5',
      container: '#ffffff',
    },
    text: {
      primary: '#1f1f1f',
      secondary: '#8c8c8c',
      placeholder: '#bfbfbf',
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
      gridLine: '#e0e0e0',
      headerBg: '#f8f9fa',
      headerBgActive: '#e8eaed',
    },
    state: {
      hover: 'rgba(0, 0, 0, 0.04)',
      active: 'rgba(0, 0, 0, 0.08)',
      selected: 'rgba(22, 119, 255, 0.1)', // Primary with opacity
      focus: 'rgba(22, 119, 255, 0.2)',
      disabled: 'rgba(0, 0, 0, 0.04)',
    },
  },
  dark: {
    primary: '#1677ff',
    secondary: '#bfbfbf',
    success: '#52c41a',
    warning: '#faad14',
    danger: '#ff4d4f',
    background: {
      base: '#1b1b1d',
      surface: '#242526',
      container: '#242526',
    },
    text: {
      primary: '#e6f4ff',
      secondary: '#bfbfbf',
      placeholder: '#5c5c5c',
      inverse: '#ffffff',
    },
    border: {
      base: '#434343',
      secondary: '#303030',
    },
    shadow: {
      sm: 'rgba(0, 0, 0, 0.55)',
      md: 'rgba(0, 0, 0, 0.7)',
    },
    component: {
      gridLine: '#424242',
      headerBg: '#2c2c2e',
      headerBgActive: '#3a3a3c',
    },
    state: {
      hover: 'rgba(255, 255, 255, 0.04)',
      active: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(22, 119, 255, 0.15)',
      focus: 'rgba(22, 119, 255, 0.25)',
      disabled: 'rgba(255, 255, 255, 0.04)',
    },
  },
};

/**
 * 获取当前页面主题模式
 */
export function getCurrentThemeMode(): ThemeMode {
  if (typeof document === 'undefined') {
    return 'light';
  }
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function getCurrentTheme(): ThemePalette {
  return Themes[getCurrentThemeMode()];
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
  const mode = getCurrentThemeMode();
  const theme = Themes[mode];
  listeners.forEach((listener) => listener(theme, mode));
}

// 监听 html 标签的 data-theme 属性变化
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        notifyThemeChange();
      }
    });
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
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

export function registerTheme(mode: ThemeMode, theme: ThemePalette): void {
  Themes[mode] = theme;
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
