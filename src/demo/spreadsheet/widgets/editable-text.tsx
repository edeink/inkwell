/** @jsxImportSource @/utils/compiler */
import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Container, Positioned, ScrollView, Stack } from '@/core';
import { EditableText as CoreEditableText } from '@/core/editable-text';
import { StatefulWidget } from '@/core/state/stateful';
import { TextLayout } from '@/core/text/layout';

export interface SpreadsheetEditableTextProps extends WidgetProps {
  /** 绝对定位 X (相对于 Spreadsheet 容器) */
  x: number;
  /** 绝对定位 Y (相对于 Spreadsheet 容器) */
  y: number;
  /** 最小宽度 (通常是单元格宽度) */
  minWidth: number;
  /** 最小高度 (通常是单元格高度) */
  minHeight: number;
  /** 最大宽度 (通常是视口宽度) */
  maxWidth: number;
  /** 最大高度 (通常是视口高度) */
  maxHeight: number;
  /** 初始文本值 */
  value: string;
  /** 样式主题 */
  theme: ThemePalette;
  /** 字体大小 */
  fontSize?: number;
  /** 文本颜色 */
  color?: string;
  /** 完成回调 */
  onFinish: (value: string) => void;
  /** 取消回调 */
  onCancel: () => void;
}

interface State {
  value: string;
  width: number;
  height: number;
  [key: string]: unknown;
}

export class SpreadsheetEditableText extends StatefulWidget<SpreadsheetEditableTextProps, State> {
  constructor(props: SpreadsheetEditableTextProps) {
    super(props);
    this.state = this.calculateState(props.value);
    window.addEventListener('spreadsheet-selection-change', this.handleSelectionChange);
  }

  dispose() {
    window.removeEventListener('spreadsheet-selection-change', this.handleSelectionChange);
    super.dispose();
  }

  private handleSelectionChange = () => {
    this.handleFinish(this.state.value);
  };

  createElement(props: SpreadsheetEditableTextProps) {
    if (props.value !== this.props.value) {
      this.state = this.calculateState(props.value);
    }
    super.createElement(props);
    return this;
  }

  private calculateState(value: string): State {
    const { minWidth, minHeight, maxWidth, fontSize = 14 } = this.props;

    // 测量文本尺寸
    const layout = TextLayout.layout(
      value,
      { text: value, fontSize, fontFamily: 'Arial' }, // 补全 TextProps
      {
        minWidth: 0,
        maxWidth: maxWidth - 10, // 减去 padding
        minHeight: 0,
        maxHeight: Infinity,
      },
    );

    // 计算所需宽高，增加一点 padding
    const contentWidth = layout.width + 10;
    const contentHeight = layout.height + 6;

    return {
      value,
      width: Math.max(minWidth, contentWidth),
      height: Math.max(minHeight, contentHeight),
    };
  }

  private handleChange = (newValue: string) => {
    // 每次输入都重新计算尺寸
    const nextState = this.calculateState(newValue);
    this.setState({
      value: nextState.value,
      width: nextState.width,
      height: nextState.height,
    });
  };

  private handleFinish = (val: string) => {
    this.props.onFinish(val);
    // 清除编辑状态，防止残留
    this.setState({
      value: '',
      width: this.props.minWidth,
      height: this.props.minHeight,
    });
  };

  render() {
    const { x, y, maxWidth, maxHeight, theme, fontSize = 14, color, onCancel } = this.props;
    const { value, width, height } = this.state;

    // 限制最终显示尺寸不超过 max
    const displayWidth = Math.min(width, maxWidth);
    const displayHeight = Math.min(height, maxHeight);

    // 是否需要滚动
    const needScroll = width > maxWidth || height > maxHeight;

    // 渲染内容
    const editor = (
      <Container
        width={needScroll ? Math.max(width, displayWidth) : displayWidth}
        height={needScroll ? Math.max(height, displayHeight) : displayHeight}
        color={theme.background.base}
      >
        <CoreEditableText
          value={value}
          width={needScroll ? Math.max(width, displayWidth) : displayWidth}
          height={needScroll ? Math.max(height, displayHeight) : displayHeight}
          fontSize={fontSize}
          color={color || theme.text.primary}
          autoFocus={true}
          onChange={this.handleChange}
          onFinish={this.handleFinish}
          onCancel={onCancel}
        />
      </Container>
    );

    return (
      <Stack>
        <Positioned left={x} top={y} width={displayWidth} height={displayHeight}>
          <Container
            color={theme.background.base}
            border={{ width: 2, color: theme.primary }}
            shadow={{ color: 'rgba(0,0,0,0.2)', blur: 8, offsetX: 0, offsetY: 4 }}
          >
            {needScroll ? (
              <ScrollView width={displayWidth} height={displayHeight} scrollX={0} scrollY={0}>
                {editor}
              </ScrollView>
            ) : (
              editor
            )}
          </Container>
        </Positioned>
      </Stack>
    );
  }
}
