/** @jsxImportSource @/utils/compiler */

import type { WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Center, Container, Text } from '@/core';
import { StatefulWidget } from '@/core/state/stateful';
import { TextAlign, TextAlignVertical } from '@/core/text';

interface ButtonProps extends WidgetProps {
  onClick?: (e: InkwellEvent) => void;
}

export class Button extends StatefulWidget<ButtonProps> {
  constructor(data: ButtonProps) {
    super(data);
  }

  render() {
    return (
      <Container
        key="counter-btn"
        width={180}
        height={48}
        color={'#1677ff'}
        borderRadius={8}
        onClick={this.props.onClick}
      >
        <Center>
          <Text
            key="counter-btn-text"
            text="点击 +1"
            fontSize={16}
            color="#ffffff"
            textAlign={TextAlign.Center}
            textAlignVertical={TextAlignVertical.Center}
          />
        </Center>
      </Container>
    );
  }
}
