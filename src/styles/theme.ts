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
  };

  border: {
    base: string;
    secondary: string;
  };

  component: {
    gridLine: string;
    headerBg: string;
    headerBgActive: string;
  };
}

// 硬编码的默认值，用于 Canvas 环境（无法直接读取 CSS 变量时作为回退或初始值）
// 实际运行时应尽量与 CSS 变量保持同步
export const Themes: Record<ThemeMode, ThemePalette> = {
  light: {
    primary: '#1677ff', // var(--ifm-color-primary)
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
    },
    border: {
      base: '#d9d9d9',
      secondary: '#f0f0f0',
    },
    component: {
      gridLine: '#e0e0e0',
      headerBg: '#f8f9fa',
      headerBgActive: '#e8eaed',
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
    },
    border: {
      base: '#434343',
      secondary: '#303030',
    },
    component: {
      gridLine: '#424242',
      headerBg: '#2c2c2e',
      headerBgActive: '#3a3a3c',
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
  return subscribeTheme((theme, mode) => listener(mode));
};

function notifyThemeChange() {
  const mode = getCurrentThemeMode();
  const theme = Themes[mode];
  listeners.forEach((listener) => listener(theme, mode));
}

// 监听 html 标签的 data-theme 属性变化
if (typeof MutationObserver !== 'undefined') {
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

/**
 * React Hook for using theme
 * 返回当前的主题调色板
 */
export function useTheme(): ThemePalette {
  const [theme, setTheme] = useState<ThemePalette>(Themes[getCurrentThemeMode()]);

  useEffect(() => {
    // 确保初始化正确
    setTheme(Themes[getCurrentThemeMode()]);

    return subscribeTheme((newTheme) => {
      setTheme(newTheme);
    });
  }, []);

  return theme;
}
