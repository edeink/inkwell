/** @jsxImportSource @/utils/compiler */

import type { WidgetProps } from '@/core/base';
import type { EventHandler } from '@/core/events';

import { Container, Row, Text } from '@/core';
import { StatefulWidget } from '@/core/state/stateful';
import { TextAlign, TextAlignVertical } from '@/core/text';

interface ButtonProps extends WidgetProps {
  onClick?: EventHandler;
}

export class Button extends StatefulWidget<ButtonProps> {
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
        <Row>
          <Text
            key="counter-btn-text-01"
            text="点击"
            fontSize={16}
            color="#ffffff"
            textAlign={TextAlign.Center}
            textAlignVertical={TextAlignVertical.Center}
          />
          {this.props.children}
        </Row>
      </Container>
    );
  }
}
