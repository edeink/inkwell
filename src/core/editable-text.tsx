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
   * 获得焦点回调
   */
  onFocus?: () => void;
  /**
   * 失去焦点回调
   */
  onBlur?: () => void;
  /**
   * 编辑完成回调（Enter 键或失去焦点时触发）
   */
  onFinish?: (value: string) => void;
  /**
   * 编辑取消回调（Escape 键触发）
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
  /**
   * 是否为多行编辑模式
   * @default false
   */
  multiline?: boolean;
}

/**
 * 编辑器内部状态
 */
interface EditorState {
  /** 当前文本内容 */
  text: string;
  /** 选区起始索引 (Anchor) */
  selectionStart: number;
  /** 选区结束索引 (Focus) */
  selectionEnd: number;
  /** 光标是否可见（用于闪烁动画） */
  cursorVisible: boolean;
  /** 是否处于焦点状态 */
  focused: boolean;
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
  private input: HTMLInputElement | HTMLTextAreaElement | null = null;
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
  /** 是否正在取消编辑 */
  private _isCancelling: boolean = false;
  /** input 位置同步的 RAF ID */
  private _rafId: number | null = null;

  constructor(props: EditableTextProps) {
    super(props);
    this.state = {
      text: props.value,
      selectionStart: 0,
      selectionEnd: props.value.length, // 默认全选
      cursorVisible: true,
      focused: false,
    };
    this.initMeasureContext();
    this.createHiddenInput();
    this.updateInputState();
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
      if (this.input && this.input.value !== data.value) {
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
      this.input.removeEventListener('keydown', this.handleInputKeyDown as EventListener);
      this.input.removeEventListener('blur', this.handleBlur);
      this.input.removeEventListener('focus', this.handleFocus);
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

    if (this.props.multiline) {
      this.input = document.createElement('textarea');
    } else {
      this.input = document.createElement('input');
    }

    this.input.style.position = 'fixed';
    this.input.style.opacity = '0';
    this.input.style.left = '-9999px';
    this.input.style.top = '0px';
    this.input.style.zIndex = '-1';
    this.input.style.fontSize = '16px'; // 防止移动端缩放

    if (this.props.multiline) {
      this.input.style.whiteSpace = 'pre';
    }

    document.body.appendChild(this.input);

    this.input.addEventListener('input', this.handleInput);
    this.input.addEventListener('keydown', this.handleInputKeyDown as EventListener);
    this.input.addEventListener('blur', this.handleBlur);
    this.input.addEventListener('focus', this.handleFocus);
    document.addEventListener('selectionchange', this.handleSelectionChange);
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
    if (this.state.focused) {
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

    // 默认视图变换（如果未提供 getViewState）
    const viewState = this.props.getViewState?.() || { scale: 1, tx: 0, ty: 0 };

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
    // 注意：如果点击的是 Canvas 内的其他区域，Canvas 会获得焦点，
    // input 会自动 blur，所以这里不需要手动 blur。
    // 但我们需要防止点击组件内部时，input 失去焦点。
    // 不过，onPointerDown 会在 window pointerdown 之前触发吗？
    // Inkwell 事件是合成事件，通常在这里，我们只需确保不干扰原生行为。
    // 如果点击了组件区域，onPointerDown 会负责 focus input。
  };

  /**
   * 处理 input 输入事件
   */
  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
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
      if (!this.props.multiline) {
        // 单行模式下 Enter 键失去焦点
        // onFinish 会在 handleBlur 中触发
        this.input?.blur();
      }
      // 多行模式下允许默认行为（插入换行符）
    } else if (e.key === 'Escape') {
      // Escape 键失去焦点并触发取消
      this._isCancelling = true;
      this.input?.blur();
      this.props.onCancel?.();
      this._isCancelling = false;
    }

    // 在下一帧获取最新的选区状态
    setTimeout(() => {
      if (this.input) {
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

    if (e.shiftKey) {
      this.setState({
        selectionEnd: newIndex,
      });
      if (this.input) {
        const start = Math.min(this.state.selectionStart, newIndex);
        const end = Math.max(this.state.selectionStart, newIndex);
        const dir = this.state.selectionStart > newIndex ? 'backward' : 'forward';
        try {
          this.input.setSelectionRange(start, end, dir);
        } catch {}
      }
    } else {
      this.setState({
        selectionStart: newIndex,
        selectionEnd: newIndex,
      });

      if (this.input) {
        this.input.setSelectionRange(newIndex, newIndex);
      }
    }
    this.resetCursorBlink();
  }

  /**
   * 处理 input 获得焦点事件
   */
  private handleFocus = () => {
    this.setState({ focused: true, cursorVisible: true });
    this.startCursorTimer();
    this.props.onFocus?.();
  };

  /**
   * 处理 input 失去焦点事件
   */
  private handleBlur = () => {
    // 如果正在取消编辑（Escape 键触发），则不触发 onFinish
    if (!this._isCancelling) {
      this.props.onFinish?.(this.state.text);
    }

    this.setState({ focused: false, cursorVisible: false });
    this.stopCursorTimer();
    this.props.onBlur?.();
  };

  /**
   * 处理文档选区变化事件
   */
  private handleSelectionChange = () => {
    if (this.input && document.activeElement === this.input) {
      const start = this.input.selectionStart || 0;
      const end = this.input.selectionEnd || 0;
      const direction = this.input.selectionDirection || 'forward';

      let newAnchor = start;
      let newFocus = end;

      if (direction === 'backward') {
        newAnchor = end;
        newFocus = start;
      }

      const st = this.state;
      if (newAnchor !== st.selectionStart || newFocus !== st.selectionEnd) {
        this.setState({
          selectionStart: newAnchor,
          selectionEnd: newFocus,
        });
      }
    }
  };

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
      // 计算 DOM selectionStart/End 和 direction
      const start = Math.min(st.selectionStart, st.selectionEnd);
      const end = Math.max(st.selectionStart, st.selectionEnd);
      const direction = st.selectionStart > st.selectionEnd ? 'backward' : 'forward';

      if (
        this.input.selectionStart !== start ||
        this.input.selectionEnd !== end ||
        this.input.selectionDirection !== direction
      ) {
        try {
          this.input.setSelectionRange(start, end, direction);
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
    // 默认视图变换（如果未提供 getViewState）
    const viewState = this.props.getViewState?.() || { scale: 1, tx: 0, ty: 0 };

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
          const start = Math.min(st.selectionStart, index);
          const end = Math.max(st.selectionStart, index);
          const direction = st.selectionStart > index ? 'backward' : 'forward';
          try {
            this.input.setSelectionRange(start, end, direction);
          } catch {}
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
    // 确保 focus 状态
    if (!this.state.focused && this.input) {
      this.input.focus();
    }
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

  /**
   * 辅助方法：调整颜色透明度
   */
  private adjustColorOpacity(color: string, opacityFactor: number): string {
    if (color.startsWith('rgba')) {
      return color.replace(/,\s*([\d.]+)\)$/, (_, alpha) => {
        const newAlpha = parseFloat(alpha) * opacityFactor;
        return `, ${newAlpha})`;
      });
    }
    return color;
  }

  render() {
    const st = this.state;
    const { text, selectionStart, selectionEnd, focused } = st;
    const fontSize = this.props.fontSize || 14;

    // 处理选区颜色：非聚焦状态下降低透明度
    let selectionColor = this.props.selectionColor || 'rgba(0,150,255,0.3)';
    if (!focused) {
      selectionColor = this.adjustColorOpacity(selectionColor, 0.5);
    }

    const selectionRects = this.getSelectionRects(selectionStart, selectionEnd);
    const selectionWidgets = selectionRects.map((rect, i) => (
      <Positioned
        key={`selection-${i}`}
        left={rect.x}
        top={rect.y}
        width={rect.width}
        height={rect.height}
      >
        <Container color={selectionColor} />
      </Positioned>
    ));

    // 光标显示逻辑：必须聚焦且选区折叠且 cursorVisible 为真
    const showCursor = focused && st.cursorVisible && selectionStart === selectionEnd;
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
        cursor="text"
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
