/** @jsxImportSource @/utils/compiler */
import { Center, Container, Text, TextAlign, TextAlignVertical, type InkwellEvent } from '@/core';

/**
 * 函数式按钮组件 (Functional Component)
 *
 * 演示特性：
 * 1. 纯函数实现，无内部状态 (Stateless)
 * 2. 接收 props 并返回 JSX
 * 3. 适合展示型组件
 *
 * @param props 组件属性
 */
export function FunctionalButton(props: { onClick: (e: InkwellEvent) => void }) {
  return (
    <Container
      key="functional-btn"
      width={180}
      height={48}
      color="#1677ff"
      borderRadius={8}
      onClick={props.onClick}
    >
      <Center>
        <Text
          key="functional-btn-text"
          text="Functional Btn"
          fontSize={16}
          color="#ffffff"
          textAlign={TextAlign.Center}
          textAlignVertical={TextAlignVertical.Center}
        />
      </Center>
    </Container>
  );
}
