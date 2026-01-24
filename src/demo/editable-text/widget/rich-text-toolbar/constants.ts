/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：RichTextToolbar 配置常量。
 * 主要功能：集中管理工具栏的尺寸、间距、下拉列表与配色面板等配置。
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
export const toolbarConstants = {
  buttonSize: 28,
  spacing: 8,
  paddingX: 8,
  paddingY: 8,
  fontSizeW: 56,
  fontFamilyW: 96,
  dropdownOffsetY: 6,
  selectDropdownPadding: 6,
  dropdownItemH: 24,
  dropdownGap: 4,
  dropdownVisibleCount: 6,
  colorPanelCols: 6,
  colorSwatchSize: 22,
  colorPanelGap: 6,
  colorPanelPadding: 8,
  triggerRadius: 6,
  toolbarRadius: 8,
} as const;

export const toolbarDerived = {
  itemCount: 2 + 2 + 1,
  toolbarW:
    toolbarConstants.buttonSize * 2 +
    toolbarConstants.fontSizeW +
    toolbarConstants.fontFamilyW +
    toolbarConstants.buttonSize +
    Math.max(0, 2 + 2 + 1 - 1) * toolbarConstants.spacing +
    toolbarConstants.paddingX * 2,
  toolbarH: toolbarConstants.buttonSize + toolbarConstants.paddingY * 2,
  dropdownTopFromTrigger:
    toolbarConstants.buttonSize + toolbarConstants.paddingY + toolbarConstants.dropdownOffsetY,
  dropdownViewportH:
    toolbarConstants.dropdownItemH * toolbarConstants.dropdownVisibleCount +
    toolbarConstants.dropdownGap * (toolbarConstants.dropdownVisibleCount - 1),
  colorPanelW:
    toolbarConstants.colorPanelPadding * 2 +
    toolbarConstants.colorPanelCols * toolbarConstants.colorSwatchSize +
    Math.max(0, toolbarConstants.colorPanelCols - 1) * toolbarConstants.colorPanelGap,
  colorDropdownLeftFromTrigger:
    toolbarConstants.buttonSize -
    (toolbarConstants.colorPanelPadding * 2 +
      toolbarConstants.colorPanelCols * toolbarConstants.colorSwatchSize +
      Math.max(0, toolbarConstants.colorPanelCols - 1) * toolbarConstants.colorPanelGap),
} as const;

export const fontSizeOptions = [12, 14, 16, 18, 20, 22, 24, 28, 32] as const;

export const fontFamilyOptions = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", Times, serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
  { label: 'Menlo', value: 'Menlo, Monaco, Consolas, "Courier New", monospace' },
  { label: '苹方', value: '"PingFang SC", "Helvetica Neue", Arial, sans-serif' },
  { label: '思源黑体', value: '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", sans-serif' },
  { label: '宋体', value: '"Songti SC", SimSun, serif' },
] as const;
