/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：RichTextToolbar 内部复用的按钮组件（Widget）。
 * 主要功能：统一按钮的边框、圆角、背景色、光标与指针事件透传。
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Container, type CursorType, type InkwellEvent } from '@/core';

export interface ToolbarButtonProps {
  widgetKey: string;
  theme: ThemePalette;
  width: number;
  height: number;
  backgroundColor: string;
  cursor?: CursorType;
  borderRadius?: number;
  onPointerEnter?: (e: InkwellEvent) => void;
  onPointerLeave?: (e: InkwellEvent) => void;
  onPointerDown?: (e: InkwellEvent) => void;
  children?: WidgetProps[];
}

export function ToolbarButton(props: ToolbarButtonProps) {
  return (
    <Container
      key={props.widgetKey}
      width={props.width}
      height={props.height}
      borderRadius={props.borderRadius ?? 6}
      border={{ color: props.theme.border.base, width: 1 }}
      color={props.backgroundColor}
      cursor={props.cursor ?? 'pointer'}
      alignment="center"
      pointerEvent="auto"
      onPointerEnter={props.onPointerEnter}
      onPointerLeave={props.onPointerLeave}
      onPointerDown={props.onPointerDown}
      children={props.children}
    />
  );
}
