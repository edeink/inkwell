/** @jsxImportSource @/utils/compiler */

import { Button } from './button';

import type { WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Center, Container, Row, Text } from '@/core';
import { MainAxisSize } from '@/core/flex/type';
import { StatefulWidget } from '@/core/state/stateful';
import { TextAlign, TextAlignVertical } from '@/core/text';

interface TemplateProps extends WidgetProps {}

export class Template extends StatefulWidget<TemplateProps> {
  constructor(data: TemplateProps) {
    super(data);
    this.state = { count: 0, tips: '+1' };
  }

  private onInc = (_e: InkwellEvent): void => {
    const cur = (this.state as { count: number }).count;
    this.setState({ count: cur + 1 });
  };

  render() {
    return (
      <Row key="counter-root" spacing={16} mainAxisSize={MainAxisSize.Max}>
        {/* 片段 1 */}
        <Button onClick={this.onInc}>
          <Text
            key="counter-btn-text-02"
            text={String(this.state.tips)}
            fontSize={16}
            color="#ffffff"
            textAlign={TextAlign.Center}
            textAlignVertical={TextAlignVertical.Center}
          />
        </Button>
        {/* 片段 2 */}
        <Container
          key="counter-btn"
          width={180}
          height={48}
          color={'#1677ff'}
          borderRadius={8}
          onClick={this.onInc}
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
        <Text
          key="counter-value"
          text={String((this.state as { count: number }).count)}
          fontSize={28}
          color={'#2c3e50'}
        />
      </Row>
    );
  }
}
