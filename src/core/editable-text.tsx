/** @jsxImportSource @/utils/compiler */

import { Container, Stack, Text } from '@/core';
import { Widget, type WidgetProps } from '@/core/base';
import { Positioned } from '@/core/positioned';
import { StatefulWidget } from '@/core/state/stateful';
import { TextAlign } from '@/core/text';
import { type InkwellEvent } from '@/core/type';

/**
 * 可编辑文本组件属性接口
 */
export interface EditableTextProps extends WidgetProps {
  /**
   * 文本内容
   */
  value: string;
  /**
   * 字体大小
   * @default 14
   */
  fontSize?: number;
  /**
   * 字体族
   */
  fontFamily?: string;
  /**
   * 文本颜色
   */
  color?: string;
  /**
   * 文本对齐方式
   */
  textAlign?: TextAlign;
  /**
   * 文本内容变更回调
   */
  onChange?: (value: string) => void;
  /**
   * 编辑完成回调（Enter键或失去焦点）
   */
  onFinish?: (value: string) => void;
  /**
   * 取消编辑回调（Escape键）
   */
  onCancel?: () => void;
  /**
   * 获取当前的视图变换状态（缩放、平移）
   * 用于正确计算 DOM 输入框的屏幕位置，以确保输入法候选窗口位置正确
   */
  getViewState?: () => { scale: number; tx: number; ty: number };
  /**
   * 选区背景颜色
   * @default 'rgba(0,150,255,0.3)'
   */
  selectionColor?: string;
  /**
   * 光标颜色
   * @default '#000000'
   */
  cursorColor?: string;
  /**
   * 停止向上遍历的条件
   * 用于计算相对坐标时确定参照系原点（例如 Viewport）
   */
  stopTraversalAt?: (node: Widget) => boolean;
}

/**
 * 编辑器内部状态
 */
interface EditorState {
  /** 当前文本内容 */
  text: string;
  /** 选区起始索引 */
  selectionStart: number;
  /** 选区结束索引 */
  selectionEnd: number;
  /** 光标是否可见（用于闪烁动画） */
  cursorVisible: boolean;
  [key: string]: unknown;
}

/**
 * EditableText (可编辑文本)
 *
 * 核心文本编辑组件，提供类似于 Flutter EditableText 的功能。
 * 使用隐藏的原生 input 元素来处理输入、输入法合成和键盘事件，
 * 同时利用 Canvas 渲染层显示文本、选区和光标。
 *
 * 主要功能：
 * - 文本输入与同步
 * - 光标闪烁与移动（支持上下左右键）
 * - 鼠标拖拽选区
 * - 双击全选
 * - 视图变换支持（缩放/平移下的坐标映射）
 */
export class EditableText extends StatefulWidget<EditableTextProps, EditorState> {
  /** 实例 ID，用于调试追踪 */
  private _instanceId = Math.random().toString(36).slice(2);
  /** 隐藏的 input 元素，用于接收原生输入 */
  private input: HTMLInputElement | null = null;
  /** 用于测量文本宽度的离屏 Canvas */
  private measureCanvas: HTMLCanvasElement | null = null;
  /** 测量用的 Canvas 上下文 */
  private measureCtx: CanvasRenderingContext2D | null = null;
  /** 是否正在拖拽选区 */
  private isDragging: boolean = false;
  /** 光标闪烁定时器 */
  private cursorTimer: number | null = null;
  /** 内部 Text 组件的引用，用于获取布局信息 */
  private textWidgetRef: Text | null = null;
  /** 失去焦点延时定时器 */
  private blurTimer: number | null = null;
  /** 是否忽略下一次 blur 事件 */
  private ignoreNextBlur: boolean = false;
  /** 是否正在退出编辑状态 */
  private isExiting: boolean = false;
  /** input 位置同步的 RAF ID */
  private _rafId: number | null = null;

  constructor(props: EditableTextProps) {
    super(props);
    this.state = {
      text: props.value,
      selectionStart: 0,
      selectionEnd: props.value.length, // 默认全选
      cursorVisible: true,
    };
    this.initMeasureContext();
    this.createHiddenInput();
    this.updateInputState();
    this.startCursorTimer();
    this.startInputPositionLoop();

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.handleWindowPointerDown, true);
    }
  }

  /**
   * 组件更新时的生命周期
   * 如果 props.value 发生变化，需要同步更新内部状态和 input 值
   */
  createElement(data: EditableTextProps): Widget<EditableTextProps> {
    const prevText = this.props.value;
    if (data.value !== prevText) {
      // 在 super.createElement 调用 render 之前更新状态
      this.state.text = data.value;
      if (this.input) {
        this.input.value = data.value;
      }
    }
    super.createElement(data);
    return this;
  }

  /**
   * 销毁组件，清理资源
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
    if (typeof document !== 'undefined') {
      document.removeEventListener('selectionchange', this.handleSelectionChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.handleWindowPointerDown, true);
    }
    super.dispose();
  }

  // --- 初始化与生命周期辅助方法 ---

  /**
   * 初始化文本测量上下文
   */
  private initMeasureContext() {
    if (typeof document !== 'undefined') {
      this.measureCanvas = document.createElement('canvas');
      this.measureCtx = this.measureCanvas.getContext('2d');
    }
  }

  /**
   * 创建隐藏的 input 元素
   * 该元素负责接收用户输入，但视觉上不可见
   */
  private createHiddenInput() {
    if (typeof document === 'undefined') {
      return;
    }

    this.input = document.createElement('input');
    this.input.style.position = 'fixed';
    this.input.style.opacity = '0';
    this.input.style.left = '-9999px';
    this.input.style.top = '0px';
    this.input.style.zIndex = '-1';
    this.input.style.fontSize = '16px'; // 防止移动端缩放

    document.body.appendChild(this.input);

    this.input.addEventListener('input', this.handleInput);
    this.input.addEventListener('keydown', this.handleInputKeyDown);
    this.input.addEventListener('blur', this.handleBlur);
    document.addEventListener('selectionchange', this.handleSelectionChange);

    this.input.focus();
  }

  /**
   * 启动光标闪烁定时器
   */
  private startCursorTimer() {
    if (typeof window !== 'undefined' && this.cursorTimer === null) {
      this.cursorTimer = window.setInterval(() => {
        this.setState({ cursorVisible: !this.state.cursorVisible });
      }, 500);
    }
  }

  /**
   * 停止光标闪烁定时器
   */
  private stopCursorTimer() {
    if (this.cursorTimer !== null) {
      window.clearInterval(this.cursorTimer);
      this.cursorTimer = null;
    }
  }

  /**
   * 重置光标闪烁状态（例如用户输入时，光标应立即显示）
   */
  private resetCursorBlink() {
    if (!this.state.cursorVisible) {
      this.setState({ cursorVisible: true });
    }
    this.stopCursorTimer();
    this.startCursorTimer();
  }

  /**
   * 确保 input 元素处于聚焦状态
   */
  private makeSureInputIsFocused() {
    if (this.input && document.activeElement !== this.input) {
      this.input.focus();
      this.startCursorTimer();
    }
  }

  // --- 位置同步与坐标计算 ---

  /**
   * 启动 input 位置同步循环
   * 确保 input 元素跟随组件位置移动，保证输入法候选框位置正确
   */
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

  /**
   * 停止位置同步循环
   */
  private stopInputPositionLoop() {
    if (this._rafId !== null) {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * 计算组件在屏幕上的绝对位置和尺寸
   */
  private getWidgetScreenRect() {
    if (!this.parent) {
      return null;
    }

    const viewState = this.props.getViewState?.();
    if (!viewState) {
      // 如果没有提供 viewState，无法正确计算屏幕坐标
      return null;
    }

    // 获取 Runtime 容器位置
    const runtime = this.runtime;
    let containerRect = { left: 0, top: 0 };

    if (runtime) {
      const container = runtime.container;
      if (container && container.getBoundingClientRect) {
        const rect = container.getBoundingClientRect();
        containerRect = { left: rect.left, top: rect.top };
      }
    }

    // 向上遍历计算绝对偏移 (相对于 Viewport 或 Root)
    let absX = 0;
    let absY = 0;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curr: Widget | null = this;
    let safety = 0;

    // 我们假设 getViewState 返回的变换是应用于某个祖先节点的
    // 我们向上遍历，直到没有 parent 或满足停止条件
    while (curr && safety < 100) {
      if (this.props.stopTraversalAt?.(curr)) {
        break;
      }
      if (curr.renderObject && curr.renderObject.offset) {
        absX += curr.renderObject.offset.dx;
        absY += curr.renderObject.offset.dy;
      }
      curr = curr.parent;
      safety++;
    }

    const { scale, tx, ty } = viewState;
    const { width, height } = this.renderObject.size;

    const canvasLeft = absX * scale + tx;
    const canvasTop = absY * scale + ty;
    const canvasBottom = (absY + height) * scale + ty;

    const screenLeft = containerRect.left + canvasLeft;
    const screenTop = containerRect.top + canvasTop;
    const screenBottom = containerRect.top + canvasBottom;

    return {
      left: screenLeft,
      top: screenTop,
      width: width * scale,
      height: height * scale,
      inputTop: screenBottom,
    };
  }

  /**
   * 更新 input 元素的 CSS 位置
   */
  private updateInputPosition() {
    if (!this.input) {
      return;
    }

    const rect = this.getWidgetScreenRect();
    if (!rect) {
      return;
    }

    this.input.style.left = `${rect.left}px`;
    this.input.style.top = `${rect.inputTop}px`;
    this.input.style.width = `${rect.width}px`;
    this.input.style.height = '0px';
  }

  // --- 事件处理 ---

  /**
   * 处理全局指针按下事件
   * 用于检测点击是否发生在组件外部，从而触发 blur
   */
  private handleWindowPointerDown = (e: PointerEvent) => {
    if (e.target === this.input) {
      return;
    }

    const rect = this.getWidgetScreenRect();
    if (!rect) {
      return;
    }

    const x = e.clientX;
    const y = e.clientY;

    if (
      x >= rect.left &&
      x <= rect.left + rect.width &&
      y >= rect.top &&
      y <= rect.top + rect.height
    ) {
      this.ignoreNextBlur = true;
    } else {
      this.ignoreNextBlur = false;
    }
  };

  /**
   * 处理 input 输入事件
   */
  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.setState({
      text: target.value,
      selectionStart: target.selectionStart || 0,
      selectionEnd: target.selectionEnd || 0,
    });
    this.props.onChange?.(target.value);
    this.resetCursorBlink();
  };

  /**
   * 处理 input 键盘事件
   */
  private handleInputKeyDown = (e: KeyboardEvent) => {
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

    // 在下一帧获取最新的选区状态（因为 keydown 时 selection 可能还未更新）
    setTimeout(() => {
      if (this.input && !this.isExiting) {
        this.setState({
          selectionStart: this.input.selectionStart || 0,
          selectionEnd: this.input.selectionEnd || 0,
        });
      }
    }, 0);
  };

  /**
   * 处理垂直方向的光标移动（ArrowUp/ArrowDown）
   * 需要计算文本行布局信息
   */
  private handleVerticalCursorMove(direction: 'up' | 'down', e: KeyboardEvent) {
    if (!this.textWidgetRef || !this.textWidgetRef.lines || this.textWidgetRef.lines.length === 0) {
      return;
    }

    e.preventDefault();

    const lines = this.textWidgetRef.lines;
    const currentCursor = this.state.selectionEnd;
    let lineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (currentCursor >= lines[i].startIndex && currentCursor <= lines[i].endIndex) {
        lineIndex = i;
        break;
      }
    }

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
        const prevLine = lines[lineIndex - 1];
        const currInfo = this.getCursorInfoAtIndex(currentCursor);
        const targetY = prevLine.y + prevLine.height / 2;
        newIndex = this.getIndexAtPoint(currInfo.x, targetY);
      } else {
        newIndex = 0;
      }
    } else {
      if (lineIndex < lines.length - 1) {
        const nextLine = lines[lineIndex + 1];
        const currInfo = this.getCursorInfoAtIndex(currentCursor);
        const targetY = nextLine.y + nextLine.height / 2;
        newIndex = this.getIndexAtPoint(currInfo.x, targetY);
      } else {
        newIndex = this.state.text.length;
      }
    }

    this.setState({
      selectionStart: newIndex,
      selectionEnd: newIndex,
    });

    if (this.input) {
      this.input.setSelectionRange(newIndex, newIndex);
    }
    this.resetCursorBlink();
  }

  /**
   * 处理 input 失去焦点事件
   */
  private handleBlur = () => {
    if (this.isExiting) {
      return;
    }

    if (this.ignoreNextBlur) {
      this.ignoreNextBlur = false;
      setTimeout(() => {
        if (!this.isExiting) {
          this.input?.focus();
        }
      }, 0);
      return;
    }

    // 延迟 16ms 触发 blur，确保点击在组件内时不触发 blur
    this.blurTimer = window.setTimeout(() => {
      this.endEditing(true);
    }, 16);
  };

  /**
   * 处理文档选区变化事件
   */
  private handleSelectionChange = () => {
    if (this.isExiting) {
      return;
    }
    if (this.input && document.activeElement === this.input) {
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

  /**
   * 结束编辑
   * @param isFinish true 表示完成编辑（Enter/Blur），false 表示取消编辑（Escape）
   */
  private endEditing(isFinish: boolean) {
    if (this.isExiting) {
      return;
    }
    this.isExiting = true;

    if (this.blurTimer !== null) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.stopCursorTimer();
    this.stopInputPositionLoop();

    let restoreFocus = false;
    if (this.input) {
      this.input.style.display = 'none';
      if (typeof document !== 'undefined' && document.activeElement === this.input) {
        this.input.blur();
        restoreFocus = true;
      }
    }

    if (typeof document !== 'undefined') {
      if (restoreFocus || document.activeElement === document.body) {
        // 尝试恢复焦点到画布
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

  /**
   * 将内部状态同步到 input 元素
   */
  private updateInputState() {
    if (!this.input) {
      return;
    }
    const st = this.state;
    if (this.input.value !== st.text) {
      this.input.value = st.text;
    }
    if (document.activeElement === this.input) {
      if (
        this.input.selectionStart !== st.selectionStart ||
        this.input.selectionEnd !== st.selectionEnd
      ) {
        try {
          this.input.setSelectionRange(st.selectionStart, st.selectionEnd);
        } catch {
          // ignore
        }
      }
    }
  }

  // --- 测量与辅助计算 ---

  /**
   * 获取字体字符串
   */
  private getFontString(): string {
    const fontSize = this.props.fontSize || 14;
    const fontFamily = this.props.fontFamily || 'Arial, sans-serif';
    return `${fontSize}px ${fontFamily}`;
  }

  /**
   * 测量文本宽度
   */
  private measureTextWidth(text: string): number {
    if (!this.measureCtx) {
      return 0;
    }
    this.measureCtx.font = this.getFontString();
    return this.measureCtx.measureText(text).width;
  }

  /**
   * 获取指定索引处的光标位置信息
   */
  private getCursorInfoAtIndex(index: number): { x: number; y: number; height: number } {
    const defaultInfo = { x: 0, y: 0, height: this.props.fontSize || 14 };

    if (!this.textWidgetRef || !this.textWidgetRef.lines || this.textWidgetRef.lines.length === 0) {
      const x = this.measureTextWidth(this.state.text.substring(0, index));
      return { ...defaultInfo, x };
    }

    const lines = this.textWidgetRef.lines;
    let targetLine = lines[0];
    for (const line of lines) {
      if (index >= line.startIndex && index <= line.endIndex) {
        targetLine = line;
        break;
      }
    }
    if (!targetLine && lines.length > 0) {
      targetLine = lines[lines.length - 1];
    }
    if (!targetLine) {
      return defaultInfo;
    }

    const subText = this.state.text.substring(targetLine.startIndex, index);
    const subWidth = this.measureTextWidth(subText);

    return {
      x: targetLine.x + subWidth,
      y: targetLine.y,
      height: targetLine.height,
    };
  }

  /**
   * 获取选区矩形列表
   * 用于渲染选区背景
   */
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
      const lineStart = line.startIndex;
      const lineEnd = line.endIndex;
      const intersectStart = Math.max(min, lineStart);
      const intersectEnd = Math.min(max, lineEnd);

      if (intersectStart < intersectEnd) {
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

  /**
   * 根据坐标获取文本索引
   */
  private getIndexAtPoint(x: number, y: number): number {
    if (!this.textWidgetRef || !this.textWidgetRef.lines) {
      return 0;
    }
    const lines = this.textWidgetRef.lines;
    let targetLine = null;

    for (const line of lines) {
      if (y >= line.y && y < line.y + line.height) {
        targetLine = line;
        break;
      }
    }

    if (!targetLine) {
      if (y < lines[0].y) {
        targetLine = lines[0];
      } else if (y > lines[lines.length - 1].y + lines[lines.length - 1].height) {
        targetLine = lines[lines.length - 1];
      } else {
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
    }

    const relX = x - targetLine.x;
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

  /**
   * 将全局事件坐标转换为本地相对坐标
   */
  private getLocalPoint(e: InkwellEvent): { x: number; y: number } | null {
    const viewState = this.props.getViewState?.();
    if (!viewState) {
      return null;
    }

    const { scale, tx, ty } = viewState;
    const worldX = (e.x - tx) / scale;
    const worldY = (e.y - ty) / scale;

    let absX = 0;
    let absY = 0;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curr: Widget | null = this;
    let safety = 0;

    while (curr && safety < 100) {
      if (this.props.stopTraversalAt?.(curr)) {
        break;
      }
      if (curr.renderObject && curr.renderObject.offset) {
        absX += curr.renderObject.offset.dx;
        absY += curr.renderObject.offset.dy;
      }
      curr = curr.parent;
      safety++;
    }

    return { x: worldX - absX, y: worldY - absY };
  }

  // --- 指针事件处理 ---

  /**
   * 指针按下事件
   * 设置光标位置并开始拖拽选区
   */
  onPointerDown = (e: InkwellEvent) => {
    if (this.blurTimer !== null) {
      window.clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }

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

      if (this.input) {
        this.input.focus();
        try {
          this.input.setSelectionRange(index, index);
        } catch {}
      }
    }
    return false;
  };

  /**
   * 指针移动事件
   * 更新选区
   */
  onPointerMove = (e: InkwellEvent) => {
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
        this.setState({ selectionEnd: index });
        if (this.input) {
          this.input.setSelectionRange(st.selectionStart, index);
        }
      }
    }
    return false;
  };

  /**
   * 指针抬起事件
   * 结束拖拽
   */
  onPointerUp = (e: InkwellEvent) => {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    this.isDragging = false;
    this.resetCursorBlink();
    return false;
  };

  /**
   * 双击事件
   * 全选文本
   */
  onDblClick = (e: InkwellEvent) => {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
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

  render() {
    this.makeSureInputIsFocused();

    const st = this.state;
    const { text, selectionStart, selectionEnd } = st;
    const fontSize = this.props.fontSize || 14;

    const selectionRects = this.getSelectionRects(selectionStart, selectionEnd);
    const selectionWidgets = selectionRects.map((rect, i) => (
      <Positioned
        key={`selection-${i}`}
        left={rect.x}
        top={rect.y}
        width={rect.width}
        height={rect.height}
      >
        <Container color={this.props.selectionColor || 'rgba(0,150,255,0.3)'} />
      </Positioned>
    ));

    const showCursor = st.cursorVisible && selectionStart === selectionEnd;
    let cursor = null;
    if (showCursor) {
      const cursorInfo = this.getCursorInfoAtIndex(selectionStart);
      cursor = (
        <Positioned
          key="cursor"
          left={cursorInfo.x}
          top={cursorInfo.y}
          width={1}
          height={cursorInfo.height}
        >
          <Container color={this.props.cursorColor || '#000000'} />
        </Positioned>
      );
    }

    return (
      <Stack
        onPointerDown={this.onPointerDown}
        onPointerMove={this.onPointerMove}
        onPointerUp={this.onPointerUp}
        onDblClick={this.onDblClick}
      >
        <Text
          key="editable-text-content"
          ref={(ref) => (this.textWidgetRef = ref as Text)}
          text={text}
          fontSize={fontSize}
          fontFamily={this.props.fontFamily}
          color={this.props.color}
          textAlign={this.props.textAlign}
        />
        {selectionWidgets}
        {cursor}
      </Stack>
    );
  }
}
