/**
 * 主题配置与全局切换
 * 提供两套配色方案（dark / light），并暴露全局订阅与切换 API。
 * 组件通过导入本模块获取语义化颜色，避免使用硬编码颜色值。
 *
 * @module ThemeConfig
 */

import React from 'react';

export type ThemeName = 'light' | 'dark';

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
 * @property {string} primaryColor 主色
 * @property {string} secondaryColor 次要色
 * @property {string} backgroundColor 背景色
 * @property {string} textColor 文本色
 * @property {string} highlightColor 高亮主色（描边）
 * @property {string} highlightFillColor 高亮填充色
 * @property {string} minimapBackgroundColor 小地图背景色
 * @property {string} nodeFillColor 节点填充色
 * @property {string} connectorColor 连接线颜色
 * @property {string} nodeActiveBorderColor 节点激活边框色
 * @property {string} nodeActiveFillColor 节点激活填充色
 * @property {string} nodeSelectedBorderColor 节点选中边框色
 * @property {string} nodeSelectedFillColor 节点选中填充色
 * @property {string} nodeHoverBorderColor 节点悬停边框色
 * @property {string} nodeDefaultBorderColor 节点默认边框色
 * @property {string} nodeEditBorderColor 节点编辑边框色
 * @property {string} nodeEditFillColor 节点编辑填充色
 * @property {string} nodeTextSelectionFillColor 节点文本选区填充色
 */

/**
 * 两套完整的配色方案
 * @type {{ light: ThemePalette, dark: ThemePalette }}
 */
export const Themes: Record<ThemeName, ThemePalette> = {
  light: {
    primaryColor: '#1677ff',
    secondaryColor: '#8c8c8c',
    backgroundColor: '#ffffff',
    textColor: '#1f1f1f',
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
      textColor: '#999999',
      fontSize: 14,
      textAlign: 'left',
      lineHeight: 1.5,
    },
  },
  dark: {
    primaryColor: '#1677ff',
    secondaryColor: '#bfbfbf',
    backgroundColor: '#141414',
    textColor: '#e6f4ff',
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
      textColor: 'rgba(255, 255, 255, 0.45)',
      fontSize: 14,
      textAlign: 'left',
      lineHeight: 1.5,
    },
  },
};

/** 当前主题名 */
let currentThemeName: ThemeName = 'light';

/** 主题变化事件分发器 */
const themeBus = new EventTarget();

/**
 * 获取当前主题名
 * @returns {'light'|'dark'} 当前主题名
 */
export function getThemeName(): ThemeName {
  return currentThemeName;
}

/**
 * 获取当前主题调色板
 * @returns {ThemePalette} 当前调色板
 */
export function getTheme(): ThemePalette {
  return Themes[currentThemeName];
}

/**
 * 切换主题
 * @param {'light'|'dark'} name 主题名
 * @returns {void}
 */
export function setTheme(name: ThemeName): void {
  if (!Themes[name]) {
    return;
  }
  if (currentThemeName === name) {
    return;
  }
  currentThemeName = name;
  themeBus.dispatchEvent(new Event('themechange'));
}

/**
 * 订阅主题变化
 * @param {() => void} listener 回调
 * @returns {() => void} 取消订阅
 */
export function subscribe(listener: () => void): () => void {
  const fn: EventListener = () => listener();
  themeBus.addEventListener('themechange', fn);
  return () => themeBus.removeEventListener('themechange', fn);
}

/**
 * React Hook：获取主题调色板并在主题切换时更新
 * @returns {ThemePalette} 当前调色板
 */
export function useThemePalette(): ThemePalette {
  const [palette, setPalette] = React.useState(() => getTheme());
  React.useEffect(() => {
    const off = subscribe(() => setPalette(getTheme()));
    return () => off();
  }, []);
  return palette;
}
