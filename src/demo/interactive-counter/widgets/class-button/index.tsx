/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

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
  theme: ThemePalette;
}

export interface ButtonState {
  color: string;
  [key: string]: unknown;
}

/**
 * 基于 Class 的按钮组件 (StatefulWidget)
 *
 * 演示特性：
 * 1. 组件继承自 StatefulWidget
 * 3. 实现了 render 方法返回 JSX
 */
export class ClassButton extends StatefulWidget<ButtonProps, ButtonState> {
  render() {
    return (
      <Container
        key="counter-btn"
        width={180}
        height={48}
        color={this.props.theme.primary}
        borderRadius={8}
        // Fix: 不要将 onClick 传递给 Container，否则会导致事件冒泡时被重复触发
        // ClassButton 自身作为 StatefulWidget 已经绑定了 onClick
      >
        <Row mainAxisAlignment={MainAxisAlignment.Center}>
          <Text
            key="counter-btn-text-01"
            text="Class"
            fontSize={16}
            color={this.props.theme.text.inverse}
            textAlign={TextAlign.Center}
            textAlignVertical={TextAlignVertical.Center}
          />

          {this.props.children}
        </Row>
      </Container>
    );
  }
}
