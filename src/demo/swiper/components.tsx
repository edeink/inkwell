/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

import { Center, Column, Container, MainAxisSize, Text, TextAlign, Widget } from '@/core';

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

// 辅助组件：演示卡片
export const DemoCard = ({
  title,
  children,
  theme,
  width = 300,
  autoWidth = false,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
  theme: ThemePalette;
  width?: number;
  autoWidth?: boolean;
}) => (
  <Column key={`card-${title}`} spacing={8} mainAxisSize={MainAxisSize.Min}>
    <Container
      key={`card-bg-${title}`}
      width={autoWidth ? undefined : width}
      padding={16}
      color={theme.background.container}
      borderRadius={8}
      border={{ width: 1, color: theme.border.base }}
    >
      <Center>{children}</Center>
    </Container>
    <Text
      key={`card-title-${title}`}
      text={title}
      fontSize={14}
      color={theme.text.primary}
      textAlign={TextAlign.Center}
    />
  </Column>
);
