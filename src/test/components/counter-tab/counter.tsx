/** @jsxImportSource @/utils/compiler */

import { ButtonElement } from './button';

import type { WidgetData, WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Center, Container, Row, Text, Widget } from '@/core';
import { StatefulWidget } from '@/core/state/stateful';

type TemplateData = WidgetData;

export class Template extends StatefulWidget<TemplateData> {
  static {
    Widget.registerType('Template', Template);
  }

  constructor(data: TemplateData) {
    super(data);
    this.state = { count: 0 };
  }

  private onInc = (_e: InkwellEvent): void => {
    const cur = (this.state as { count: number }).count;
    this.setState({ count: cur + 1 });
  };

  render() {
    return (
      <Row key="counter-root" spacing={16} mainAxisSize="min">
        {/* 片段 1 */}
        <ButtonElement onClick={this.onInc} />
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
              textAlign="center"
              textAlignVertical="center"
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

export type TemplateProps = Omit<TemplateData, 'type' | 'children'> & WidgetProps;
export const TemplateElement: React.FC<TemplateProps> = () => null;
