/** @jsxImportSource @/utils/compiler */
import { Center, Container, Text, TextAlign, TextAlignVertical, type InkwellEvent } from '@/core';

export function FunctionalButton(props: { onClick: (e: InkwellEvent) => void }) {
  return (
    <Container
      key="functional-btn"
      width={180}
      height={48}
      color={'#52c41a'}
      borderRadius={8}
      onClick={props.onClick}
    >
      <Center>
        <Text
          key="functional-btn-text"
          text="功能按钮"
          fontSize={16}
          color="#ffffff"
          textAlign={TextAlign.Center}
          textAlignVertical={TextAlignVertical.Center}
        />
      </Center>
    </Container>
  );
}
