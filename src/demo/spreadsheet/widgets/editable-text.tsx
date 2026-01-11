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
  /**
   * 是否可见
   * @default true
   */
  visible?: boolean;
}

interface State {
  value: string;
  width: number;
  height: number;
  /** 是否已保存 */
  isSaved: boolean;
  [key: string]: unknown;
}

export class SpreadsheetEditableText extends StatefulWidget<SpreadsheetEditableTextProps, State> {
  constructor(props: SpreadsheetEditableTextProps) {
    super(props);
    this.state = {
      ...this.calculateState(props.value),
      isSaved: false,
    };
    window.addEventListener('spreadsheet-selection-change', this.handleSelectionChange);
  }

  dispose() {
    window.removeEventListener('spreadsheet-selection-change', this.handleSelectionChange);
    super.dispose();
  }

  private handleSelectionChange = () => {
    // 选区变化时，如果未保存，则手动保存
    // 注意：如果是因为点击了其他地方导致 blur，handleFinish 应该已经被 handleBlur 触发了
    // 这里是为了防止 blur 未能触发的情况
    if (!this.state.isSaved) {
      this.handleFinish(this.state.value);
    }
  };

  protected didUpdateWidget(oldProps: SpreadsheetEditableTextProps) {
    // 检查是否切换了单元格（根据坐标判断）
    if (
      this.props.x !== oldProps.x ||
      this.props.y !== oldProps.y ||
      this.props.value !== oldProps.value ||
      this.props.visible !== oldProps.visible
    ) {
      // 重置状态
      this.setState({
        ...this.calculateState(this.props.value),
        isSaved: false,
      });
    }
    super.didUpdateWidget(oldProps);
  }

  private calculateState(value: string): { value: string; width: number; height: number } {
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
    if (this.state.isSaved) {
      return;
    }
    this.props.onFinish(val);

    // 标记为已保存，并清空状态
    // 为了满足类型检查，提供完整的 State 对象
    const emptyState = this.calculateState('');
    this.setState({
      value: '',
      width: emptyState.width,
      height: emptyState.height,
      isSaved: true,
    });
  };

  private handleBlur = () => {
    // 失去焦点时作为兜底保存
    if (!this.state.isSaved) {
      this.handleFinish(this.state.value);
    }
  };

  render() {
    const {
      x,
      y,
      maxWidth,
      maxHeight,
      theme,
      fontSize = 14,
      color,
      onCancel,
      visible = true,
    } = this.props;
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
        color={visible ? theme.background.base : 'transparent'}
      >
        <CoreEditableText
          // 移除 key，允许复用实例。通过 visible 变化来控制焦点。
          value={value}
          width={needScroll ? Math.max(width, displayWidth) : displayWidth}
          height={needScroll ? Math.max(height, displayHeight) : displayHeight}
          fontSize={fontSize}
          color={color || theme.text.primary}
          autoFocus={true} // CoreEditableText 会结合 visible 属性来判断是否真正聚焦
          visible={visible}
          onChange={this.handleChange}
          onFinish={this.handleFinish}
          onBlur={this.handleBlur}
          onCancel={onCancel}
        />
      </Container>
    );

    // 保持组件树结构一致，确保 CoreEditableText 不会被卸载
    return (
      <Stack>
        <Positioned
          left={x}
          top={y}
          width={visible ? displayWidth : 0}
          height={visible ? displayHeight : 0}
        >
          {needScroll ? (
            <ScrollView width={displayWidth} height={displayHeight} scrollX={0} scrollY={0}>
              {editor}
            </ScrollView>
          ) : (
            editor
          )}
        </Positioned>
      </Stack>
    );
  }
}
