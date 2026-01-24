/** @jsxImportSource @/utils/compiler */
import type { WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

import { Column, Container, MainAxisSize, Text } from '@/core';
import { applyAlpha } from '@/core/helper/color';
import { Themes } from '@/styles/theme';

export const GlassSection = ({
  title,
  children,
  theme,
  width,
}: {
  title: string;
  children?: WidgetProps[];
  theme: ThemePalette;
  width: number;
}) => (
  <Column key={`section-${title}`} spacing={16} mainAxisSize={MainAxisSize.Min}>
    <Column key={`section-header-${title}`} spacing={6} mainAxisSize={MainAxisSize.Min}>
      <Text text={title} fontSize={18} fontWeight="bold" color={theme.text.primary} />
      <Container
        width={width}
        height={1}
        color={applyAlpha(theme.text.primary, theme === Themes.dark ? 0.14 : 0.1)}
      />
    </Column>
    <Column
      key={`section-body-${title}`}
      spacing={16}
      mainAxisSize={MainAxisSize.Min}
      children={children}
    />
  </Column>
);
