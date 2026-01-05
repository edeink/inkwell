/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

import { Column, Container, MainAxisSize, Text, Widget } from '@/core';

// 辅助组件：章节标题
export const Section = ({
  title,
  children,
  theme,
}: {
  title: string;
  children: Widget | Widget[];
  theme: ThemePalette;
}) => (
  <Column key={`section-${title}`} spacing={16} mainAxisSize={MainAxisSize.Min}>
    <Column key={`section-header-wrapper-${title}`} spacing={0} mainAxisSize={MainAxisSize.Min}>
      <Container key={`section-header-${title}`} padding={{ bottom: 8 }} width={600}>
        <Text
          key={`section-title-${title}`}
          text={title}
          fontSize={18}
          fontWeight="bold"
          color={theme.text.primary}
        />
      </Container>
      <Container key={`section-border-${title}`} width={600} height={1} color={theme.border.base} />
    </Column>
    {children}
  </Column>
);
