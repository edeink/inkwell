/** @jsxImportSource @/utils/compiler */
import { Button } from './button';

import {
  Center,
  Container,
  MainAxisSize,
  Row,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

interface TemplateProps extends WidgetProps {}

interface TemplateState {
  count: number;
  tips: string;
  [key: string]: unknown;
}

export class Template extends StatefulWidget<TemplateProps, TemplateState> {
  private btnRef: Button | null = null;

  constructor(data: TemplateProps) {
    super(data);
    this.state = {
      count: 0,
      tips: '+1',
    };
  }

  private onInc = (_e: InkwellEvent): void => {
    console.log('[Counter] onInc called');
    const cur = this.state.count;
    this.setState({ count: cur + 1 });
    // 触发子组件更新
    if (this.btnRef) {
      this.btnRef.changeColor();
    }
  };

  render() {
    console.log('[Counter] render called');
    return (
      <Row key="counter-root" spacing={16} mainAxisSize={MainAxisSize.Max}>
        <Button ref={(r: unknown) => (this.btnRef = r as Button)} onClick={this.onInc}>
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

        {/* Functional Button (New) */}
        <FunctionalButton onClick={this.onInc} />

        <Text
          key="counter-text"
          text={`Count: ${this.state.count}`}
          fontSize={24}
          color="#333333"
        />
      </Row>
    );
  }
}

// 函数式组件定义
function FunctionalButton(props: { onClick: (e: InkwellEvent) => void }) {
  return (
    <Container
      key="functional-btn"
      width={180}
      height={48}
      color={'#722ed1'} // Purple to distinguish
      borderRadius={8}
      onClick={props.onClick}
    >
      <Center>
        <Text
          key="functional-btn-text"
          text="Func Btn +1"
          fontSize={16}
          color="#ffffff"
          textAlign={TextAlign.Center}
          textAlignVertical={TextAlignVertical.Center}
        />
      </Center>
    </Container>
  );
}
