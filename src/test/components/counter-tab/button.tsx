/** @jsxImportSource @/utils/compiler */

import type { WidgetData, WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Center, Container, Text, Widget } from '@/core';
import { StatefulWidget } from '@/core/state/stateful';

type ButtonData = WidgetData & { onClick?: (e: InkwellEvent) => void };

export class Button extends StatefulWidget<ButtonData> {
  static {
    Widget.registerType('Button', Button);
  }

  constructor(data: ButtonData) {
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
            textAlign="center"
            textAlignVertical="center"
          />
        </Center>
      </Container>
    );
  }
}

export type ButtonProps = Omit<ButtonData, 'type' | 'children'> & WidgetProps;
export const ButtonElement: React.FC<ButtonProps> = () => null;
