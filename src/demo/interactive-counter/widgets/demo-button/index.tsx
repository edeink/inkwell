/** @jsxImportSource @/utils/compiler */
import {
  Container,
  MainAxisAlignment,
  Row,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface ButtonProps extends WidgetProps {
  onClick?: (e: InkwellEvent) => void;
}

export interface ButtonState {
  color: string;
  [key: string]: unknown;
}

export class DemoButton extends StatefulWidget<ButtonProps, ButtonState> {
  state: ButtonState = {
    color: '#1677ff',
  };

  changeColor() {
    const cur = this.state.color;
    const colors = ['#1677ff', '#52c41a', '#faad14', '#f5222d'];
    const nextColor = colors[(colors.indexOf(cur) + 1) % colors.length];
    this.setState({
      color: nextColor,
    });
  }

  render() {
    console.log('[按钮] render 被调用');
    return (
      <Container
        key="counter-btn"
        width={180}
        height={48}
        color={this.state.color}
        borderRadius={8}
        onClick={this.props.onClick}
      >
        <Row mainAxisAlignment={MainAxisAlignment.Center}>
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
