/** @jsxImportSource @/utils/compiler */
import { Colors } from '../../constants/colors';

import { Center, Column, Container, MainAxisSize, Text, TextAlign } from '@/core';

// 辅助组件：演示卡片
export const DemoCard = ({
  title,
  children,
  width = 200,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
  width?: number;
}) => (
  <Column key={`card-${title}`} spacing={8} mainAxisSize={MainAxisSize.Min}>
    <Container
      key={`card-bg-${title}`}
      width={width}
      padding={16}
      color={Colors.Background.Card}
      borderRadius={8}
      // shadow={{ color: 'rgba(0,0,0,0.1)', blur: 10, offset: { x: 0, y: 2 } }} // 假设支持阴影
      border={{ width: 1, color: Colors.Border }}
    >
      <Center>{children}</Center>
    </Container>
    <Text
      key={`card-title-${title}`}
      text={title}
      fontSize={14}
      color={Colors.Text.Body}
      textAlign={TextAlign.Center}
    />
  </Column>
);
