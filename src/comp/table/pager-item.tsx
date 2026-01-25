/** @jsxImportSource @/utils/compiler */
import { getDefaultTokens } from '../theme';

import type { ThemePalette } from '@/styles/theme';

import { Container, Text, TextAlignVertical, type InkwellEvent } from '@/core';
import { Overflow } from '@/core/text';

export interface PagerItemProps {
  widgetKey: string;
  theme: ThemePalette;
  tokens: ReturnType<typeof getDefaultTokens>;
  width: number;
  height: number;
  fontSize: number;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function PagerItem(props: PagerItemProps) {
  const active = !!props.active;
  const disabled = !!props.disabled;
  const borderColor = active ? props.theme.primary : props.theme.border.base;
  const bg = active ? props.theme.primary : props.theme.background.container;
  const textColor = active
    ? props.theme.text.inverse
    : disabled
      ? props.theme.text.placeholder
      : props.theme.text.primary;
  return (
    <Container
      key={props.widgetKey}
      width={props.width}
      height={props.height}
      padding={{ left: 8, right: 8 }}
      borderRadius={props.tokens.borderRadius}
      border={{ width: props.tokens.borderWidth, color: borderColor }}
      color={disabled ? props.theme.state.disabled : bg}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      alignment="center"
      pointerEvent="auto"
      onPointerDown={(e: InkwellEvent) => {
        if (disabled) {
          return;
        }
        e.stopPropagation?.();
        props.onClick?.();
      }}
    >
      <Text
        text={props.label}
        fontSize={props.fontSize}
        lineHeight={props.height}
        color={textColor}
        textAlignVertical={TextAlignVertical.Center}
        maxLines={1}
        overflow={Overflow.Ellipsis}
        pointerEvent="none"
      />
    </Container>
  );
}
