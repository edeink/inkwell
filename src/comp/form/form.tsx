/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

import { Column, CrossAxisAlignment, type WidgetProps } from '@/core';

export interface FormProps extends WidgetProps {
  theme?: ThemePalette;
  labelWidth?: number;
  colon?: boolean;
  layout?: 'horizontal' | 'vertical';
  gap?: number;
}

export function Form(props: FormProps) {
  const gap = props.gap ?? 12;
  return (
    <Column key={props.key} spacing={gap} crossAxisAlignment={CrossAxisAlignment.Start}>
      {props.children}
    </Column>
  );
}
