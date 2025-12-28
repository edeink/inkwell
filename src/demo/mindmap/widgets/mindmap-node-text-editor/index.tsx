/** @jsxImportSource @/utils/compiler */

import { getTheme } from '../../constants/theme';
import { CustomComponentType } from '../../type';

import type { InkwellEvent } from '@/core/type';

import { Container, Stack, Text } from '@/core';
import { Widget, type WidgetProps } from '@/core/base';
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
  getViewState?: () => { scale: number; tx: number; ty: number };
}

interface EditorState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  cursorVisible: boolean;
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
 * - 新增光标闪烁动画。
 * - 使用 Text 组件的 line getter 获取精确的布局信息，支持多行文本的光标和选区。
 */
export class MindMapNodeTextEditor extends StatefulWidget<MindMapNodeTextEditorProps, EditorState> {
  private input: HTMLInputElement | null = null;
  private measureCanvas: HTMLCanvasElement | null = null;
  private measureCtx: CanvasRenderingContext2D | null = null;
  private isDragging: boolean = false;
  private cursorTimer: number | null = null;
  private textWidgetRef: Text | null = null;
  private blurTimer: number | null = null;
  private ignoreNextBlur: boolean = false;
  private isExiting: boolean = false;

  constructor(props: MindMapNodeTextEditorProps) {
    super(props);
    this.state = {
      text: props.text,
      selectionStart: 0,
      selectionEnd: props.text.length, // 默认全选
      cursorVisible: true,
    };
    this.initMeasureContext();
    // 初始化副作用：创建隐藏输入框
    this.createHiddenInput();
    // 初始同步
    this.updateInputState();
    // 启动光标闪烁定时器
    this.startCursorTimer();
    // 启动位置同步循环
    this.startInputPositionLoop();

    window.addEventListener('pointerdown', this.handleWindowPointerDown, true);
  }

  private initMeasureContext() {
    if (typeof document !== 'undefined') {
      this.measureCanvas = document.createElement('canvas');
      this.measureCtx = this.measureCanvas.getContext('2d');
    }
  }

  private startCursorTimer() {
    if (typeof window !== 'undefined' && this.cursorTimer === null) {
      this.cursorTimer = window.setInterval(() => {
        this.setState({ cursorVisible: !this.state.cursorVisible });
      }, 500);
    }
  }

  private stopCursorTimer() {
    if (this.cursorTimer !== null) {
      window.clearInterval(this.cursorTimer);
      this.cursorTimer = null;
    }
  }

  private resetCursorBlink() {
    // 保持光标可见
    if (!this.state.cursorVisible) {
      this.setState({ cursorVisible: true });
    }
    // 重置定时器：先停止，再重新启动
    this.stopCursorTimer();
    this.startCursorTimer();
  }

  private _rafId: number | null = null;

  private makeSureInputIsFocused() {
    if (this.input && document.activeElement !== this.input) {
      this.input.focus();
      this.startCursorTimer();
    }
  }

  private startInputPositionLoop() {
    if (typeof window === 'undefined') {
      return;
    }
    const loop = () => {
      this.updateInputPosition();
      this._rafId = window.requestAnimationFrame(loop);
    };
    loop();
  }

  private stopInputPositionLoop() {
    if (this._rafId !== null) {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  private getNodeScreenRect() {
    if (!this.root || !this.parent) {
      return null;
    }

    const viewState = this.props.getViewState?.();
    if (!viewState) {
      return null;
    }

    // 尝试获取 Runtime 容器位置
    const runtime = this.root.runtime;
    let containerRect = { left: 0, top: 0 };

    if (runtime) {
      const container = runtime.container;
      if (container && container.getBoundingClientRect) {
        const rect = container.getBoundingClientRect();
        containerRect = { left: rect.left, top: rect.top };
      }
    }

    // 寻找 Node 容器 (MindMapNode 渲染的 Container)
    const nodeContainer = this.parent;
    let absX = 0;
    let absY = 0;
    let curr: Widget | null = nodeContainer;
    let foundVp = false;
    let safety = 0;

    while (curr && safety < 100) {
      if (curr.type === CustomComponentType.MindMapViewport) {
        foundVp = true;
        break;
      }
      if (curr.renderObject && curr.renderObject.offset) {
        absX += curr.renderObject.offset.dx;
        absY += curr.renderObject.offset.dy;
      }
      curr = curr.parent;
      safety++;
    }

    if (!foundVp) {
      // 如果没找到 Viewport，可能是独立的或者测试环境，
      // 我们仍然可以使用累加的坐标，但要意识到可能不准确。
      // 或者为了安全起见返回 null。
      // 这里为了兼容性，如果有了 viewState，我们假设找到了“逻辑上的”Viewport
      foundVp = true;
    }

    const { scale, tx, ty } = viewState;

    // 节点尺寸 (未缩放)
    const nodeWidth = nodeContainer.renderObject.size.width;
    const nodeHeight = nodeContainer.renderObject.size.height;

    // 计算 Canvas 坐标
    const canvasLeft = absX * scale + tx;
    const canvasTop = absY * scale + ty;
    // 定位到节点左下角（用于 input）
    const canvasBottom = (absY + nodeHeight) * scale + ty;

    const screenLeft = containerRect.left + canvasLeft;
    const screenTop = containerRect.top + canvasTop;
    const screenBottom = containerRect.top + canvasBottom;

    return {
      left: screenLeft,
      top: screenTop,
      width: nodeWidth * scale,
      height: nodeHeight * scale,
      inputTop: screenBottom, // 用于 input 定位的 top
    };
  }

  private updateInputPosition() {
    if (!this.input) {
      return;
    }

    const rect = this.getNodeScreenRect();
    if (!rect) {
      return;
    }

    this.input.style.left = `${rect.left}px`;
    this.input.style.top = `${rect.inputTop}px`;
    this.input.style.width = `${rect.width}px`;
    this.input.style.height = '0px';
  }

  /**
   * 销毁组件时清理资源
   * 必须在 src/core/base.ts 中正确调用 dispose
   */
  dispose() {
    this.stopCursorTimer();
    this.stopInputPositionLoop();
    if (this.input) {
      this.input.removeEventListener('input', this.handleInput);
      this.input.removeEventListener('keydown', this.handleInputKeyDown);
      this.input.removeEventListener('blur', this.handleBlur);
      this.input.remove();
      this.input = null;
    }
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    window.removeEventListener('pointerdown', this.handleWindowPointerDown, true);
    super.dispose();
  }

  private handleWindowPointerDown = (e: PointerEvent) => {
    // 如果点击的是 hidden input 本身，不需要处理
    if (e.target === this.input) {
      return;
    }

    const rect = this.getNodeScreenRect();
    if (!rect) {
      return;
    }

    // 检查点击位置是否在 Node 范围内
    const x = e.clientX;
    const y = e.clientY;

    if (
      x >= rect.left &&
      x <= rect.left + rect.width &&
      y >= rect.top &&
      y <= rect.top + rect.height
    ) {
      // 点击在 Node 范围内，标记为忽略下一次 blur
      this.ignoreNextBlur = true;
    } else {
      // 点击在 Node 范围外，不忽略 blur（允许结束编辑）
      this.ignoreNextBlur = false;
    }
  };

  createElement(data: MindMapNodeTextEditorProps): Widget<MindMapNodeTextEditorProps> {
    const prevText = this.props.text;
    super.createElement(data);
    // 只有当 props.text 确实发生变化时才同步到 state
    // 这样可以避免父组件重新渲染（传递相同的 text）导致编辑器的 draft state 被重置
    if (data.text !== prevText) {
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
    this.input.addEventListener('keydown', this.handleInputKeyDown);
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
        } catch {
          // 忽略
        }
      }
    }
  }

  /**
   * @deprecated 键盘事件处理已迁移至 Input 组件
   * 请勿在此添加新的事件处理逻辑
   */
  handleKeyDown(e?: KeyboardEvent) {
    // 空实现，仅作兼容保留
  }

  private handleInputKeyDown = (e: KeyboardEvent) => {
    // 键盘事件处理逻辑已从 handleKeyDown 迁移至此
    this.resetCursorBlink();
    if (e.key === 'ArrowUp') {
      this.handleVerticalCursorMove('up', e);
      return;
    }
    if (e.key === 'ArrowDown') {
      this.handleVerticalCursorMove('down', e);
      return;
    }

    if (e.key === 'Enter') {
      this.endEditing(true);
    } else if (e.key === 'Escape') {
      this.endEditing(false);
    }
    // 推迟选区更新，等待默认行为完成（如全选、移动光标）
    setTimeout(() => {
      if (this.input && !this.isExiting) {
        this.setState({
          selectionStart: this.input.selectionStart || 0,
          selectionEnd: this.input.selectionEnd || 0,
        });
      }
    }, 0);
  };

  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    // 更新状态，但不立即回写 input (因为是 input 触发的)
    this.setState({
      text: target.value,
      selectionStart: target.selectionStart || 0,
      selectionEnd: target.selectionEnd || 0,
    });
    this.props.onChange?.(target.value);
    this.resetCursorBlink();
  };

  private handleVerticalCursorMove(direction: 'up' | 'down', e: KeyboardEvent) {
    if (!this.textWidgetRef || !this.textWidgetRef.lines || this.textWidgetRef.lines.length === 0) {
      return;
    }

    e.preventDefault();

    const lines = this.textWidgetRef.lines;
    const currentCursor = this.state.selectionEnd;

    // 找到包含当前光标的行
    let lineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      // 这里的判定需要与 getCursorInfoAtIndex 保持一致
      if (currentCursor >= lines[i].startIndex && currentCursor <= lines[i].endIndex) {
        lineIndex = i;
        break;
      }
    }

    // 兜底逻辑：如果未找到（例如在最后），默认为最后一行
    if (lineIndex === -1) {
      if (lines.length > 0 && currentCursor >= lines[lines.length - 1].endIndex) {
        lineIndex = lines.length - 1;
      } else {
        lineIndex = 0;
      }
    }

    let newIndex = currentCursor;

    if (direction === 'up') {
      if (lineIndex > 0) {
        // 上一行
        const prevLine = lines[lineIndex - 1];
        const currInfo = this.getCursorInfoAtIndex(currentCursor);
        // 目标 Y：上一行中心
        const targetY = prevLine.y + prevLine.height / 2;
        // 保持 X 坐标寻找对应索引
        newIndex = this.getIndexAtPoint(currInfo.x, targetY);
      } else {
        // 第一行，跳转到行首
        newIndex = 0;
      }
    } else {
      if (lineIndex < lines.length - 1) {
        // 下一行
        const nextLine = lines[lineIndex + 1];
        const currInfo = this.getCursorInfoAtIndex(currentCursor);
        // 目标 Y：下一行中心
        const targetY = nextLine.y + nextLine.height / 2;
        newIndex = this.getIndexAtPoint(currInfo.x, targetY);
      } else {
        // 最后一行，跳转到行尾
        newIndex = this.state.text.length;
      }
    }

    // 更新状态
    this.setState({
      selectionStart: newIndex,
      selectionEnd: newIndex,
    });

    // 同步 input
    if (this.input) {
      try {
        this.input.setSelectionRange(newIndex, newIndex);
      } catch {
        // ignore
      }
    }
    this.resetCursorBlink();
  }

  private handleBlur = () => {
    if (this.isExiting) {
      return;
    }

    // 如果是因为点击了 Node 内部区域导致的 blur，忽略之并重新聚焦
    if (this.ignoreNextBlur) {
      this.ignoreNextBlur = false;
      // 使用 setTimeout 确保在 blur 之后重新聚焦
      setTimeout(() => {
        if (!this.isExiting) {
          this.input?.focus();
        }
      }, 0);
      return;
    }

    // 失去焦点时完成编辑
    this.blurTimer = window.setTimeout(() => {
      this.endEditing(true);
    }, 100);
  };

  private handleSelectionChange = () => {
    if (this.isExiting) {
      return;
    }
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

  private endEditing(isFinish: boolean) {
    if (this.isExiting) {
      return;
    }
    this.isExiting = true;

    // 清理定时器
    if (this.blurTimer !== null) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.stopCursorTimer();
    this.stopInputPositionLoop();

    let restoreFocus = false;
    // 立即隐藏并清理 input，防止闪烁或后续事件
    if (this.input) {
      this.input.style.display = 'none';
      // 如果当前焦点还在 input 上（如按 Enter 触发），则手动 blur 并标记需要恢复焦点
      if (typeof document !== 'undefined' && document.activeElement === this.input) {
        this.input.blur();
        restoreFocus = true;
      }
    }

    // 尝试恢复焦点到 Canvas，确保键盘快捷键可用
    // 仅在焦点从 input 移除或丢失到 body 时执行，避免抢夺 Toolbar 等组件的焦点
    if (typeof document !== 'undefined') {
      if (restoreFocus || document.activeElement === document.body) {
        const canvas = document.querySelector('canvas[data-inkwell-id]');
        if (canvas instanceof HTMLElement) {
          canvas.focus({ preventScroll: true });
        }
      }
    }

    if (isFinish) {
      this.props.onFinish?.(this.state.text);
    } else {
      this.props.onCancel?.();
    }
  }

  // --- 几何计算辅助方法 ---

  private getFontString(): string {
    const fontSize = this.props.fontSize || 14;
    const fontFamily = this.props.fontFamily || 'Arial, sans-serif';
    return `${fontSize}px ${fontFamily}`;
  }

  private measureTextWidth(text: string): number {
    if (!this.measureCtx) {
      return 0;
    }
    this.measureCtx.font = this.getFontString();
    return this.measureCtx.measureText(text).width;
  }

  private getCursorInfoAtIndex(index: number): { x: number; y: number; height: number } {
    const defaultInfo = { x: 0, y: 0, height: this.props.fontSize || 14 };

    // 如果没有 ref 或者 metrics 尚未计算（首次渲染），回退到估算
    if (!this.textWidgetRef || !this.textWidgetRef.lines || this.textWidgetRef.lines.length === 0) {
      // 简单的单行估算
      const x = this.measureTextWidth(this.state.text.substring(0, index));
      return { ...defaultInfo, x };
    }

    const lines = this.textWidgetRef.lines;

    // 找到包含该 index 的行
    // 注意：index 可能等于 text.length（光标在最后）
    let targetLine = lines[0];
    for (const line of lines) {
      if (index >= line.startIndex && index <= line.endIndex) {
        targetLine = line;
        break;
      }
    }

    // 如果找不到（比如 index 超出范围），取最后一行
    if (!targetLine && lines.length > 0) {
      targetLine = lines[lines.length - 1];
    }

    if (!targetLine) {
      return defaultInfo;
    }

    // 在行内计算 X 偏移
    // 需要截取行内文本：从 line.startIndex 到 index
    const subText = this.state.text.substring(targetLine.startIndex, index);
    const subWidth = this.measureTextWidth(subText);

    return {
      x: targetLine.x + subWidth,
      y: targetLine.y,
      height: targetLine.height,
    };
  }

  private getSelectionRects(
    start: number,
    end: number,
  ): { x: number; y: number; width: number; height: number }[] {
    if (start === end) {
      return [];
    }
    if (!this.textWidgetRef || !this.textWidgetRef.lines) {
      return [];
    }

    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const rects: { x: number; y: number; width: number; height: number }[] = [];

    const lines = this.textWidgetRef.lines;

    for (const line of lines) {
      // 判断该行是否在选区范围内
      // 选区区间 [min, max)
      // 行区间 [line.startIndex, line.endIndex]

      // 计算该行与选区的交集
      const lineStart = line.startIndex;
      const lineEnd = line.endIndex; // line.text.length 是否包含尾随空格/字符？

      const intersectStart = Math.max(min, lineStart);
      const intersectEnd = Math.min(max, lineEnd);

      if (intersectStart < intersectEnd) {
        // 有交集，计算矩形
        const preText = this.state.text.substring(lineStart, intersectStart);
        const selText = this.state.text.substring(intersectStart, intersectEnd);

        const preWidth = this.measureTextWidth(preText);
        const selWidth = this.measureTextWidth(selText);

        rects.push({
          x: line.x + preWidth,
          y: line.y,
          width: selWidth,
          height: line.height,
        });
      }
    }

    return rects;
  }

  private getIndexAtPoint(x: number, y: number): number {
    if (!this.textWidgetRef || !this.textWidgetRef.lines) {
      return 0;
    }

    const lines = this.textWidgetRef.lines;

    // 1. 找到 Y 坐标对应的行
    let targetLine = null;

    // 简单的线性查找，假设行是按 Y 排序的
    for (const line of lines) {
      if (y >= line.y && y < line.y + line.height) {
        targetLine = line;
        break;
      }
    }

    // 如果点击在上方，取第一行；下方，取最后一行
    if (!targetLine) {
      if (y < lines[0].y) {
        targetLine = lines[0];
      } else if (y > lines[lines.length - 1].y + lines[lines.length - 1].height) {
        targetLine = lines[lines.length - 1];
      } else {
        // 在行之间的空隙？找最近的
        let minDiff = Infinity;
        for (const line of lines) {
          const diff = Math.min(Math.abs(y - line.y), Math.abs(y - (line.y + line.height)));
          if (diff < minDiff) {
            minDiff = diff;
            targetLine = line;
          }
        }
      }
    }

    if (!targetLine) {
      return 0;
    } // 如果 lines > 0，这种情况不应发生

    // 2. 在行内找到 X 坐标对应的索引
    // 相对行的 X
    const relX = x - targetLine.x;

    // 类似 getIndexAtX 的逻辑，但在行范围内
    const lineText = targetLine.text;
    const startIndex = targetLine.startIndex;

    let bestOffset = 0;
    let minDiff = Math.abs(relX);

    for (let i = 0; i <= lineText.length; i++) {
      const sub = lineText.substring(0, i);
      const w = this.measureTextWidth(sub);
      const diff = Math.abs(relX - w);
      if (diff < minDiff) {
        minDiff = diff;
        bestOffset = i;
      } else if (w > relX) {
        break;
      }
    }

    return startIndex + bestOffset;
  }

  // --- 指针事件 ---

  // 事件坐标转换为组件局部坐标
  private getLocalPoint(e: InkwellEvent): { x: number; y: number } | null {
    const viewState = this.props.getViewState?.();
    if (!viewState) {
      return null;
    }

    const { scale, tx, ty } = viewState;

    // 世界坐标
    const worldX = (e.x - tx) / scale;
    const worldY = (e.y - ty) / scale;

    // 累加自身及父级的相对偏移，得到组件在世界中的绝对位置
    // 注意：Widget.renderObject.offset 是相对于父组件的偏移
    // 我们需要从当前组件向上遍历直到 Viewport
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curr: Widget | null = this;
    let absX = 0;
    let absY = 0;

    // 安全计数，防止死循环
    let safety = 0;
    while (curr && curr.type !== CustomComponentType.MindMapViewport && safety < 100) {
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
    // 清除失焦定时器，保持编辑状态
    if (this.blurTimer !== null) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }

    // 阻止冒泡，防止触发父组件（MindMapNode）的拖拽逻辑
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    this.isDragging = true;
    this.stopCursorTimer();

    const pt = this.getLocalPoint(e);
    if (pt) {
      const index = this.getIndexAtPoint(pt.x, pt.y);
      this.setState({
        selectionStart: index,
        selectionEnd: index,
        cursorVisible: true,
      });

      // 聚焦输入框并设置光标
      if (this.input) {
        this.input.focus();
        try {
          this.input.setSelectionRange(index, index);
        } catch {
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
      const index = this.getIndexAtPoint(pt.x, pt.y);
      const st = this.state;
      if (index !== st.selectionEnd) {
        this.setState({
          selectionEnd: index,
        });
        if (this.input) {
          try {
            this.input.setSelectionRange(st.selectionStart, index);
          } catch {
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
    this.resetCursorBlink();
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
    // 确保输入框获得焦点
    this.makeSureInputIsFocused();

    const st = this.state;
    const { text, selectionStart, selectionEnd } = st;
    const theme = getTheme();
    const fontSize = this.props.fontSize || 14;

    // 选区矩形
    const selectionRects = this.getSelectionRects(selectionStart, selectionEnd);
    const selectionWidgets = selectionRects.map((rect, i) => (
      <Positioned
        key={`selection-${i}`}
        left={rect.x}
        top={rect.y}
        width={rect.width}
        height={rect.height}
      >
        <Container color={theme.nodeTextSelectionFillColor} />
      </Positioned>
    ));

    // 光标
    const showCursor = st.cursorVisible && selectionStart === selectionEnd;
    let cursor = null;
    if (showCursor) {
      const cursorInfo = this.getCursorInfoAtIndex(selectionEnd);
      cursor = (
        <Positioned
          key="cursor"
          left={cursorInfo.x}
          top={cursorInfo.y}
          width={1}
          height={cursorInfo.height}
        >
          <Container color={theme.textColor} />
        </Positioned>
      );
    }

    return (
      <Stack
        fit="loose"
        onPointerDown={this.onPointerDown}
        onPointerMove={this.onPointerMove}
        onPointerUp={this.onPointerUp}
        onDblClick={this.onDblClick}
        cursor={'text'}
      >
        {selectionWidgets}
        <Text
          ref={(ref) => (this.textWidgetRef = ref as Text | null)}
          text={text}
          fontSize={fontSize}
          color={this.props.color}
          textAlign={this.props.textAlign || TextAlign.Left}
          textAlignVertical={TextAlignVertical.Top}
        />
        {cursor}
      </Stack>
    );
  }
}
