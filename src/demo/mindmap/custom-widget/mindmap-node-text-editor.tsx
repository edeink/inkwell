/** @jsxImportSource @/utils/compiler */

import { getTheme } from '../config/theme';

import { Viewport } from './viewport';

import type { InkwellEvent } from '@/core/events';

import { Container, Stack, Text } from '@/core';
import { Widget, type WidgetProps } from '@/core/base';
import { findWidget } from '@/core/helper/widget-selector';
import { Positioned } from '@/core/positioned';
import { StatefulWidget } from '@/core/state/stateful';
import { TextAlign, TextAlignVertical } from '@/core/text';

export interface MindMapNodeTextEditorProps extends WidgetProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: TextAlign;
  onChange?: (text: string) => void;
  onFinish?: (text: string) => void;
  onCancel?: () => void;
}

interface EditorState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  isFocused: boolean;
  measureCtx: CanvasRenderingContext2D | null;
  [key: string]: unknown;
}

/**
 * MindMapNodeTextEditor
 *
 * 专门处理 MindMapNode 文本编辑的组件。
 * 使用隐藏的 input 元素来处理输入和选区，利用 Canvas 绘制光标和选区高亮。
 *
 * 重构说明：
 * - 移除了 React 生命周期方法，改为框架原生的 constructor/dispose 机制。
 * - 修复了光标跳转和选区事件冒泡问题。
 * - 增强了输入框同步逻辑。
 */
export class MindMapNodeTextEditor extends StatefulWidget<MindMapNodeTextEditorProps, EditorState> {
  private input: HTMLInputElement | null = null;
  private measureCanvas: HTMLCanvasElement | null = null;
  private isDragging: boolean = false;

  constructor(props: MindMapNodeTextEditorProps) {
    super(props);
    this.state = {
      text: props.text,
      selectionStart: 0,
      selectionEnd: props.text.length, // 默认全选
      isFocused: true,
      measureCtx: null,
    };
    this.initMeasureContext();
    // 初始化副作用：创建隐藏输入框
    this.createHiddenInput();
    // 初始同步
    this.updateInputState();
  }

  private get typedProps(): MindMapNodeTextEditorProps {
    return this.props as unknown as MindMapNodeTextEditorProps;
  }

  private initMeasureContext() {
    if (typeof document !== 'undefined') {
      this.measureCanvas = document.createElement('canvas');
      const ctx = this.measureCanvas.getContext('2d');
      if (ctx) {
        this.setState({ measureCtx: ctx });
      }
    }
  }

  /**
   * 销毁组件时清理资源
   * 必须在 src/core/base.ts 中正确调用 dispose
   */
  dispose() {
    if (this.input) {
      this.input.removeEventListener('input', this.handleInput);
      this.input.removeEventListener('keydown', this.handleKeyDown);
      this.input.removeEventListener('blur', this.handleBlur);
      this.input.remove();
      this.input = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('selectionchange', this.handleSelectionChange);
    }
    super.dispose();
  }

  createElement(data: MindMapNodeTextEditorProps): Widget<MindMapNodeTextEditorProps> {
    super.createElement(data);
    // 如果 props 中的文本发生变化（如外部更新），则同步到 state
    if (data.text !== this.state.text) {
      this.setState({ text: data.text });
      // 同步更新 input value，防止状态不一致
      if (this.input) {
        this.input.value = data.text;
      }
    }
    return this;
  }

  private createHiddenInput() {
    if (typeof document === 'undefined') {
      return;
    }

    this.input = document.createElement('input');
    // 样式设置：确保不可见但可聚焦
    this.input.style.position = 'fixed';
    this.input.style.opacity = '0';
    this.input.style.left = '-9999px'; // 移出视口，防止干扰布局
    this.input.style.top = '0px';
    this.input.style.zIndex = '-1';
    // 防止移动端缩放
    this.input.style.fontSize = '16px';

    document.body.appendChild(this.input);

    this.input.addEventListener('input', this.handleInput);
    this.input.addEventListener('keydown', this.handleKeyDown);
    this.input.addEventListener('blur', this.handleBlur);
    // 同步输入框选区到组件状态
    document.addEventListener('selectionchange', this.handleSelectionChange);

    this.input.focus();
  }

  private updateInputState() {
    if (!this.input) {
      return;
    }
    const st = this.state;
    // 仅在值确实不同时更新，避免光标跳动
    if (this.input.value !== st.text) {
      this.input.value = st.text;
    }
    // 确保选区同步
    if (document.activeElement === this.input) {
      if (
        this.input.selectionStart !== st.selectionStart ||
        this.input.selectionEnd !== st.selectionEnd
      ) {
        // 捕获异常，防止 input type 不支持 selection
        try {
          this.input.setSelectionRange(st.selectionStart, st.selectionEnd);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    // 更新状态，但不立即回写 input (因为是 input 触发的)
    this.setState({
      text: target.value,
      selectionStart: target.selectionStart || 0,
      selectionEnd: target.selectionEnd || 0,
    });
    this.typedProps.onChange?.(target.value);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      this.finishEditing();
    } else if (e.key === 'Escape') {
      this.typedProps.onCancel?.();
    }
    // 推迟选区更新，等待默认行为完成（如全选、移动光标）
    setTimeout(() => {
      if (this.input) {
        this.setState({
          selectionStart: this.input.selectionStart || 0,
          selectionEnd: this.input.selectionEnd || 0,
        });
      }
    }, 0);
  };

  private handleBlur = () => {
    // 失去焦点时完成编辑
    // 稍微延迟，防止点击内部元素（虽然目前没有）导致的误触发
    // 或者防止因为各种原因的临时失焦
    // 简单起见，直接完成
    this.finishEditing();
  };

  private handleSelectionChange = () => {
    if (this.input && document.activeElement === this.input) {
      // 同步输入框选区到组件状态
      const newStart = this.input.selectionStart || 0;
      const newEnd = this.input.selectionEnd || 0;
      const st = this.state;

      if (newStart !== st.selectionStart || newEnd !== st.selectionEnd) {
        this.setState({
          selectionStart: newStart,
          selectionEnd: newEnd,
        });
      }
    }
  };

  private finishEditing() {
    const st = this.state;
    this.typedProps.onFinish?.(st.text);
  }

  // --- 几何计算辅助方法 ---

  private getFontString(): string {
    const fontSize = this.typedProps.fontSize || 14;
    const fontFamily = this.typedProps.fontFamily || 'Arial, sans-serif';
    return `${fontSize}px ${fontFamily}`;
  }

  private measureTextWidth(text: string): number {
    const st = this.state;
    if (!st.measureCtx) {
      return 0;
    }
    st.measureCtx.font = this.getFontString();
    return st.measureCtx.measureText(text).width;
  }

  private getXAtIndex(index: number): number {
    const st = this.state;
    const text = st.text;
    if (index <= 0) {
      return 0;
    }
    if (index > text.length) {
      index = text.length;
    }
    const sub = text.substring(0, index);
    return this.measureTextWidth(sub);
  }

  private getIndexAtX(x: number): number {
    const st = this.state;
    const text = st.text;
    if (x <= 0) {
      return 0;
    }

    let bestIndex = 0;
    let minDiff = Math.abs(x);

    // 简单扫描查找最近的光标位置
    // 优化：对于长文本可以二分查找，这里假设节点文本较短
    for (let i = 0; i <= text.length; i++) {
      const w = this.getXAtIndex(i);
      const diff = Math.abs(x - w);
      if (diff < minDiff) {
        minDiff = diff;
        bestIndex = i;
      } else {
        // 宽度单调增加，如果 diff 开始增加，说明已经过了最佳点
        if (w > x) {
          break;
        }
      }
    }
    return bestIndex;
  }

  // --- 指针事件 ---

  // 事件坐标转换为组件局部坐标
  private getLocalPoint(e: InkwellEvent): { x: number; y: number } | null {
    const vp = findWidget(this.root, 'Viewport') as Viewport | null;
    if (!vp) {
      return null;
    }

    // 世界坐标
    const worldX = (e.x - vp.tx) / vp.scale;
    const worldY = (e.y - vp.ty) / vp.scale;

    // 累加自身及父级的相对偏移，得到组件在世界中的绝对位置
    // 注意：Widget.renderObject.offset 是相对于父组件的偏移
    // 我们需要从当前组件向上遍历直到 Viewport
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curr: Widget | null = this;
    let absX = 0;
    let absY = 0;

    // 安全计数，防止死循环
    let safety = 0;
    while (curr && curr !== vp && safety < 100) {
      if (curr.renderObject && curr.renderObject.offset) {
        absX += curr.renderObject.offset.dx;
        absY += curr.renderObject.offset.dy;
      }
      curr = curr.parent;
      safety++;
    }
    // 如果 curr 没找到 Viewport，说明层级关系可能有误，或者 Viewport 不是直接祖先
    // 这里假设 MindMapNode 在 Viewport 内

    return { x: worldX - absX, y: worldY - absY };
  }

  onPointerDown = (e: InkwellEvent) => {
    // 阻止冒泡，防止触发父组件（MindMapNode）的拖拽逻辑
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    this.isDragging = true;
    const pt = this.getLocalPoint(e);
    if (pt) {
      const index = this.getIndexAtX(pt.x);
      this.setState({
        selectionStart: index,
        selectionEnd: index,
        isFocused: true,
      });

      // 聚焦输入框并设置光标
      if (this.input) {
        this.input.focus();
        try {
          this.input.setSelectionRange(index, index);
        } catch (err) {
          // ignore
        }
      }
    }

    // 返回 false 在 inkwell 事件系统中表示停止传播
    return false;
  };

  onPointerMove = (e: InkwellEvent) => {
    // 同样阻止冒泡
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (!this.isDragging) {
      return false;
    }

    const pt = this.getLocalPoint(e);
    if (pt) {
      const index = this.getIndexAtX(pt.x);
      const st = this.state;
      if (index !== st.selectionEnd) {
        this.setState({
          selectionEnd: index,
        });
        if (this.input) {
          try {
            this.input.setSelectionRange(st.selectionStart, index);
          } catch (err) {
            // ignore
          }
        }
      }
    }
    return false;
  };

  onPointerUp = (e: InkwellEvent) => {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    this.isDragging = false;
    return false;
  };

  onDblClick = (e: InkwellEvent) => {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    // 全选
    const st = this.state;
    this.setState({
      selectionStart: 0,
      selectionEnd: st.text.length,
    });
    if (this.input) {
      this.input.select();
    }
    return false;
  };

  // --- 渲染 ---

  render() {
    const st = this.state;
    const { text, selectionStart, selectionEnd } = st;
    const theme = getTheme();
    const fontSize = this.typedProps.fontSize || 14;

    // 计算几何信息
    const minS = Math.min(selectionStart, selectionEnd);
    const maxS = Math.max(selectionStart, selectionEnd);

    const startX = this.getXAtIndex(minS);
    const endX = this.getXAtIndex(maxS);
    const cursorX = this.getXAtIndex(selectionEnd);

    // 选区矩形
    const selectionRect =
      minS !== maxS ? (
        <Positioned
          key="selection"
          left={startX}
          top={0}
          width={endX - startX}
          height={fontSize * 1.2} // 近似行高
        >
          <Container color={theme.nodeSelectedFillColor} />
        </Positioned>
      ) : null;

    // 光标线
    // 可添加闪烁动画，暂且实心
    const showCursor = st.isFocused;
    const cursor = showCursor ? (
      <Positioned
        key="cursor"
        left={cursorX - 1} // 居中显示
        top={0}
        width={2}
        height={fontSize * 1.2}
      >
        <Container color={theme.textColor} />
      </Positioned>
    ) : null;

    return (
      <Stack
        fit="loose"
        onPointerDown={this.onPointerDown}
        onPointerMove={this.onPointerMove}
        onPointerUp={this.onPointerUp}
        onDblClick={this.onDblClick}
      >
        {selectionRect}
        <Text
          text={text}
          fontSize={fontSize}
          color={this.typedProps.color}
          textAlign={TextAlign.Left}
          textAlignVertical={TextAlignVertical.Top}
        />
        {cursor}
      </Stack>
    );
  }
}
