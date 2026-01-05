/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

import { Center, Column, Container, MainAxisSize, Text, TextAlign } from '@/core';

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
  /**
   * 是否自动计算宽度。
   * 如果为 true，则忽略 width 属性，允许卡片根据父容器约束自适应宽度。
   * 这对于 Wrap 等响应式布局是必须的。
   */
  autoWidth?: boolean;
}) => (
  <Column key={`card-${title}`} spacing={8} mainAxisSize={MainAxisSize.Min}>
    <Container
      key={`card-bg-${title}`}
      width={autoWidth ? undefined : width}
      padding={16}
      color={theme.background.container}
      borderRadius={8}
      // shadow={{ color: 'rgba(0,0,0,0.1)', blur: 10, offset: { x: 0, y: 2 } }} // 假设支持阴影
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
