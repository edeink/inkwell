/**
 * 主题配置与全局切换
 * 提供两套配色方案（dark / light），并暴露全局订阅与切换 API。
 * 组件通过导入本模块获取语义化颜色，避免使用硬编码颜色值。
 *
 * 注意：本模块已重构为使用全局主题系统 (@/demo/styles/theme) 作为数据源。
 *
 * @module ThemeConfig
 */

import React from 'react';

import {
  Themes as GlobalThemes,
  getCurrentThemeMode,
  subscribeToThemeChange,
  type ThemeMode,
} from '../../../styles/theme';

export type ThemeName = ThemeMode;

export interface ThemePalette {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
  highlightFillColor: string;
  minimapBackgroundColor: string;
  nodeFillColor: string;
  connectorColor: string;
  // 节点状态
  nodeActiveBorderColor: string;
  nodeActiveFillColor: string;
  nodeSelectedBorderColor: string;
  nodeSelectedFillColor: string;
  nodeHoverBorderColor: string;
  nodeDefaultBorderColor: string;
  // 编辑状态
  nodeEditBorderColor: string;
  nodeEditFillColor: string;
  nodeTextSelectionFillColor: string;
  // 占位符样式
  placeholder: {
    textColor: string;
    fontSize: number;
    textAlign: string;
    lineHeight: number;
  };
}

/**
 * 语义化颜色配置对象
 * @typedef {Object} ThemePalette
 */

/**
 * 两套完整的配色方案
 * @type {{ light: ThemePalette, dark: ThemePalette }}
 */
export const Themes: Record<ThemeName, ThemePalette> = {
  light: {
    primaryColor: GlobalThemes.light.primary,
    secondaryColor: GlobalThemes.light.secondary,
    backgroundColor: GlobalThemes.light.background.base,
    textColor: GlobalThemes.light.text.primary,
    highlightColor: 'rgba(64,158,255,0.95)',
    highlightFillColor: 'rgba(64,158,255,0.18)',
    minimapBackgroundColor: 'rgba(0,0,0,0.08)',
    nodeFillColor: 'rgba(255,255,255,0.9)',
    connectorColor: 'rgba(140,140,140,0.9)',
    nodeActiveBorderColor: '#69b1ff',
    nodeActiveFillColor: 'rgba(22, 119, 255, 0.10)',
    nodeSelectedBorderColor: '#c9c9c9',
    nodeSelectedFillColor: 'rgba(22, 119, 255, 0.05)',
    nodeHoverBorderColor: '#4096ff',
    nodeDefaultBorderColor: '#c9c9c9',
    nodeEditBorderColor: '#1677ff',
    nodeEditFillColor: 'rgba(22, 119, 255, 0.15)',
    nodeTextSelectionFillColor: 'rgba(22, 119, 255, 0.3)',
    placeholder: {
      textColor: GlobalThemes.light.text.placeholder,
      fontSize: 14,
      textAlign: 'left',
      lineHeight: 1.5,
    },
  },
  dark: {
    primaryColor: GlobalThemes.dark.primary,
    secondaryColor: GlobalThemes.dark.secondary,
    backgroundColor: GlobalThemes.dark.background.base,
    textColor: GlobalThemes.dark.text.primary,
    highlightColor: 'rgba(91,169,255,0.95)',
    highlightFillColor: 'rgba(91,169,255,0.24)',
    minimapBackgroundColor: 'rgba(255,255,255,0.08)',
    nodeFillColor: 'rgba(26,26,26,0.9)',
    connectorColor: 'rgba(160,160,160,0.9)',
    nodeActiveBorderColor: '#177ddc',
    nodeActiveFillColor: 'rgba(23, 125, 220, 0.2)',
    nodeSelectedBorderColor: '#434343',
    nodeSelectedFillColor: 'rgba(23, 125, 220, 0.1)',
    nodeHoverBorderColor: '#4096ff',
    nodeDefaultBorderColor: '#434343',
    nodeEditBorderColor: '#1677ff',
    nodeEditFillColor: 'rgba(23, 125, 220, 0.3)',
    nodeTextSelectionFillColor: 'rgba(23, 125, 220, 0.4)',
    placeholder: {
      textColor: GlobalThemes.dark.text.placeholder,
      fontSize: 14,
      textAlign: 'left',
      lineHeight: 1.5,
    },
  },
};

/**
 * 获取当前主题名
 * @returns {'light'|'dark'} 当前主题名
 */
export function getThemeName(): ThemeName {
  return getCurrentThemeMode();
}

/**
 * 获取当前主题调色板
 * @returns {ThemePalette} 当前调色板
 */
export function getTheme(): ThemePalette {
  return Themes[getCurrentThemeMode()];
}

/**
 * 切换主题
 * @param {'light'|'dark'} name 主题名
 * @returns {void}
 */
export function setTheme(name: ThemeName): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', name);
  }
}

/**
 * 订阅主题变化
 * @param {() => void} listener 回调
 * @returns {() => void} 取消订阅
 */
export function subscribe(listener: () => void): () => void {
  return subscribeToThemeChange(() => listener());
}

/**
 * React Hook：获取主题调色板并在主题切换时更新
 * @returns {ThemePalette} 当前调色板
 */
export function useThemePalette(): ThemePalette {
  const [palette, setPalette] = React.useState(() => getTheme());
  React.useEffect(() => {
    const off = subscribeToThemeChange(() => setPalette(getTheme()));
    return () => off();
  }, []);
  return palette;
}
