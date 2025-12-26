/** @jsxImportSource @/utils/compiler */
import { DemoButton } from '../demo-button';
import { FunctionalButton } from '../functional-button';

import {
  Center,
  Container,
  MainAxisSize,
  Row,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
  type WidgetProps,
} from '@/core';

export interface InteractiveCounterDemoProps extends WidgetProps {}

export interface InteractiveCounterDemoState {
  count: number;
  tips: string;
  [key: string]: unknown;
}

export class InteractiveCounterDemo extends StatefulWidget<
  InteractiveCounterDemoProps,
  InteractiveCounterDemoState
> {
  private btnRef: DemoButton | null = null;

  constructor(data: InteractiveCounterDemoProps) {
    super(data);
    this.state = {
      count: 0,
      tips: '+1',
    };
  }

  private onInc = (): void => {
    console.log('[计数器] onInc 被调用');
    const cur = this.state.count;
    this.setState({ count: cur + 1 });
    // 触发子组件更新
    if (this.btnRef) {
      this.btnRef.changeColor();
    }
  };

  render() {
    console.log('[计数器] render 被调用');
    return (
      <Row key="counter-root" spacing={16} mainAxisSize={MainAxisSize.Max}>
        <DemoButton ref={(r: unknown) => (this.btnRef = r as DemoButton)} onClick={this.onInc}>
          <Text
            key="counter-btn-text-02"
            text={String(this.state.tips)}
            fontSize={16}
            color="#ffffff"
            textAlign={TextAlign.Center}
            textAlignVertical={TextAlignVertical.Center}
          />
        </DemoButton>
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

        {/* 功能按钮 (New) */}
        <FunctionalButton onClick={this.onInc} />

        <Text key="counter-text" text={`计数: ${this.state.count}`} fontSize={24} color="#333333" />
      </Row>
    );
  }
}
