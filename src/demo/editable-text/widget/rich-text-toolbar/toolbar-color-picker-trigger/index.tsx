/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：RichTextToolbar 内部复用的颜色选择触发器组件（Widget）。
 * 主要功能：展示取色按钮 Icon，并按 opened/hovered 切换背景色。
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
import { ToolbarButton } from '../toolbar-button';

import type { ThemePalette } from '@/styles/theme';

import { Icon, type InkwellEvent } from '@/core';

const colorButtonSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">',
  '<path',
  ' d="M12 3.5c-4.694 0-8.5 3.806-8.5 8.5S7.306 20.5 12 20.5h1.8c1.27 0 2.3-1.03 2.3-2.3',
  ' 0-.69-.308-1.343-.84-1.78l-.16-.13a1.7 1.7 0 0 1-.62-1.31c0-.94.76-1.7 1.7-1.7H17',
  ' c2.485 0 4.5-2.015 4.5-4.5C21.5 6.53 17.47 3.5 12 3.5Z"',
  ' stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"',
  '/>',
  '<path',
  ' d="M7.6 12.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z',
  ' m3-3a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4',
  ' M14.4 9.4a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z',
  ' m2.2 3.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z"',
  ' fill="currentColor"',
  '/>',
  '</svg>',
].join('');

export interface ToolbarColorPickerTriggerProps {
  widgetKey: string;
  theme: ThemePalette;
  width: number;
  height: number;
  opened: boolean;
  hovered: boolean;
  onPointerEnter?: (e: InkwellEvent) => void;
  onPointerLeave?: (e: InkwellEvent) => void;
  onPointerDown?: (e: InkwellEvent) => void;
}

export function ToolbarColorPickerTrigger(props: ToolbarColorPickerTriggerProps) {
  const backgroundColor = props.opened
    ? props.theme.state.hover
    : props.hovered
      ? props.theme.state.hover
      : props.theme.background.container;

  return (
    <ToolbarButton
      widgetKey={props.widgetKey}
      theme={props.theme}
      width={props.width}
      height={props.height}
      backgroundColor={backgroundColor}
      onPointerEnter={props.onPointerEnter}
      onPointerLeave={props.onPointerLeave}
      onPointerDown={props.onPointerDown}
    >
      <Icon svg={colorButtonSvg} size={16} color={props.theme.text.primary} />
    </ToolbarButton>
  );
}
