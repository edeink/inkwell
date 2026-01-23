/** @jsxImportSource @/utils/compiler */
import { invert, transformPoint } from '../helper/transform';
import { StatefulWidget } from '../state/stateful';
import { EventPhase, type EventHandler, type InkwellEvent, type WidgetProps } from '../type';
import { type ScrollView } from '../viewport/scroll-view';

import { getCurrentThemeMode, Themes } from '@/styles/theme';

/**
 * 可编辑组件通用属性
 *
 * 该接口为输入类组件（如 Input、TextArea）提供统一的受控输入能力与交互回调。
 */
export interface EditableProps extends WidgetProps {
  /** 受控文本值 */
  value: string;
  /** 文本变化回调 */
  onChange?: (value: string) => void;
  /** 选区变化回调（使用内部选区语义：selectionStart 为 Anchor，selectionEnd 为 Focus） */
  onSelectionChange?: (selectionStart: number, selectionEnd: number) => void;
  /** 获得焦点回调 */
  onFocus?: () => void;
  /** 失去焦点回调 */
  onBlur?: () => void;
  /** 键盘事件回调；返回 false 或停止传播将阻止默认行为 */
  onKeyDown?: EventHandler;
  /** 是否只读 */
  readOnly?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 最大输入长度（包含换行符） */
  maxLength?: number;
  /** 空文本时的占位提示 */
  placeholder?: string;
  /** 字体大小 */
  fontSize?: number;
  /** 行高（px）；未设置时由组件内部决定 */
  lineHeight?: number;
  /** 字体族 */
  fontFamily?: string;
  /** 选区背景色；未设置时使用主题色 */
  selectionColor?: string;
  /** 光标颜色 */
  cursorColor?: string;
  /** 是否在创建后自动获取焦点 */
  autoFocus?: boolean;
}

/**
 * 可编辑组件内部状态
 *
 * 其中 selectionStart/selectionEnd 使用“锚点/焦点”语义，支持反向选区：
 * - selectionStart：Anchor（固定端）
 * - selectionEnd：Focus（移动端）
 */
export interface EditableState {
  /** 当前文本内容 */
  text: string;
  /** 选区起点（Anchor） */
  selectionStart: number;
  /** 选区终点（Focus） */
  selectionEnd: number;
  /** 是否处于聚焦状态 */
  focused: boolean;
  /** 光标是否可见（用于闪烁效果） */
  cursorVisible: boolean;
  /** 光标与换行边界相遇时的归属，用于区分“行尾/下一行行首”等歧义位置 */
  caretAffinity?: 'start' | 'end';
  [key: string]: unknown;
}

type DragPointerTarget = {
  _worldMatrix?: [number, number, number, number, number, number];
};

/**
 * 可编辑组件基类
 *
 * 核心思路：
 * - 使用隐藏的原生 input/textarea 负责接收键盘与输入法事件
 * - 使用画布渲染层负责展示文本、选区与光标
 * - 通过持续同步隐藏输入框的屏幕位置，保证输入法候选窗跟随光标
 */
export abstract class Editable<P extends EditableProps> extends StatefulWidget<P, EditableState> {
  protected input: HTMLInputElement | HTMLTextAreaElement | null = null;
  protected measureCanvas: HTMLCanvasElement | null = null;
  protected measureCtx: CanvasRenderingContext2D | null = null;
  protected cursorTimer: number | null = null;
  protected _rafId: number | null = null;
  protected _ensureCursorRafId: number | null = null;
  protected isDragging = false;
  protected scrollViewRef: ScrollView | null = null;

  private _dragPointerTarget: DragPointerTarget | null = null;
  private _hasGlobalDragListeners = false;
  private _handleWindowMoveBound: (e: PointerEvent) => void;
  private _handleWindowUpBound: (e: PointerEvent) => void;
  private _handleInputBound: (e: Event) => void;
  private _handleKeyDownBound: (e: Event) => void;
  private _handleBlurBound: (e: Event) => void;
  private _handleFocusBound: (e: Event) => void;
  private _lastClickTs = 0;
  private _lastClickX = 0;
  private _lastClickY = 0;
  private _clickCount = 0;
  private _dragLastViewportX: number | null = null;
  private _dragLastViewportY: number | null = null;
  private _dragAutoScrollRafId: number | null = null;
  private _draggingHandle: 'start' | 'end' | null = null;
  private _lastInputLeft = Number.NaN;
  private _lastInputTop = Number.NaN;
  private _lastInputW = Number.NaN;
  private _lastInputH = Number.NaN;
  private _lastEmitSelectionStart = Number.NaN;
  private _lastEmitSelectionEnd = Number.NaN;

  constructor(props: P) {
    super(props);
    this.state = {
      text: props.value,
      selectionStart: props.value.length,
      selectionEnd: props.value.length,
      focused: false,
      cursorVisible: false,
    };

    this._handleWindowMoveBound = this.handleWindowPointerMove.bind(this);
    this._handleWindowUpBound = this.handleWindowPointerUp.bind(this);
    this._handleInputBound = this.handleInput.bind(this);
    this._handleKeyDownBound = (e) => this.handleKeyDown(e as KeyboardEvent);
    this._handleBlurBound = (_e) => this.handleBlur();
    this._handleFocusBound = (_e) => this.handleFocus();
  }

  private createKeyboardInkwellEvent(type: 'keydown', native: KeyboardEvent): InkwellEvent {
    // 将原生 KeyboardEvent 适配为 InkwellEvent，便于在框架事件系统中统一处理
    let propagationStopped = false;
    const ev: InkwellEvent = {
      type,
      target: this,
      currentTarget: this,
      eventPhase: EventPhase.Target,
      x: 0,
      y: 0,
      nativeEvent: native,
      altKey: native.altKey,
      ctrlKey: native.ctrlKey,
      metaKey: native.metaKey,
      shiftKey: native.shiftKey,
      stopPropagation: () => {
        propagationStopped = true;
      },
      get propagationStopped() {
        return propagationStopped;
      },
    };
    return ev;
  }

  protected initEditable() {
    this.initMeasureContext();
    this.createHiddenInput();
  }

  createElement(data: P) {
    if (data.value !== this.state.text) {
      this.state.text = data.value;
      if (this.input && this.input.value !== data.value) {
        this.input.value = data.value;
      }
    }
    super.createElement(data);
    return this;
  }

  protected didUpdateWidget(_oldProps: P) {
    this.updateDomInputConfig();
    super.didUpdateWidget(_oldProps);
  }

  dispose() {
    this.stopCursorTimer();
    this.stopInputPositionLoop();
    this.cancelEnsureCursorVisible();
    this.detachGlobalDragListeners();
    this.stopDragAutoScrollLoop();
    if (this.input) {
      this.input.remove();
      this.input = null;
    }
    super.dispose();
  }

  protected resolveSelectionColor(): string {
    const theme = Themes[getCurrentThemeMode()];
    if (this.state.focused) {
      return this.props.selectionColor ?? theme.state.focus;
    }
    return theme.state.selected;
  }

  protected getViewportLocalPoint(e: { x: number; y: number; currentTarget?: unknown }): {
    x: number;
    y: number;
  } {
    const target = e.currentTarget as unknown as DragPointerTarget | null;
    if (target?._worldMatrix) {
      const inv = invert(target._worldMatrix);
      return transformPoint(inv, { x: e.x, y: e.y });
    }
    return { x: e.x, y: e.y };
  }

  protected getLocalPointFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const target = this._dragPointerTarget;
    const canvasRect = this.getCanvasClientRect();
    const x = canvasRect ? clientX - canvasRect.left : clientX;
    const y = canvasRect ? clientY - canvasRect.top : clientY;
    if (target?._worldMatrix) {
      const inv = invert(target._worldMatrix);
      return transformPoint(inv, { x, y });
    }
    return { x, y };
  }

  protected setDragPointerTarget(target: unknown) {
    this._dragPointerTarget = target as DragPointerTarget | null;
  }

  protected setDomSelectionRange(
    start: number,
    end: number,
    direction?: 'forward' | 'backward' | 'none',
  ) {
    if (!this.input) {
      return;
    }
    try {
      if (direction) {
        this.input.setSelectionRange(start, end, direction);
      } else {
        this.input.setSelectionRange(start, end);
      }
    } catch (_e) {
      return;
    }
  }

  private initMeasureContext() {
    if (typeof document !== 'undefined') {
      this.measureCanvas = document.createElement('canvas');
      this.measureCtx = this.measureCanvas.getContext('2d');
    }
  }

  protected abstract createDomInput(): HTMLInputElement | HTMLTextAreaElement;

  private createHiddenInput() {
    if (typeof document === 'undefined') {
      return;
    }

    this.input = this.createDomInput();
    // 使用不可见、不可点击的原生输入元素接收输入法与键盘事件
    this.input.style.position = 'fixed';
    this.input.style.opacity = '0';
    this.input.style.left = '-9999px';
    this.input.style.top = '0px';
    this.input.style.zIndex = '0';
    this.input.style.pointerEvents = 'none';
    this.input.style.whiteSpace = 'pre';
    this.input.style.caretColor = 'transparent';

    this.input.value = this.props.value;
    this.updateDomInputConfig();

    this.input.addEventListener('input', this._handleInputBound);
    this.input.addEventListener('keydown', this._handleKeyDownBound);
    this.input.addEventListener('blur', this._handleBlurBound);
    this.input.addEventListener('focus', this._handleFocusBound);

    document.body.appendChild(this.input);

    if (this.props.autoFocus && !this.props.disabled) {
      setTimeout(() => this.input?.focus(), 0);
    }

    // 持续同步隐藏输入框的位置，让输入法候选窗跟随光标
    this.startInputPositionLoop();
  }

  private updateDomInputConfig() {
    if (!this.input) {
      return;
    }
    const disabled = !!this.props.disabled;
    const readOnly = !!this.props.readOnly;
    const maxLength = this.props.maxLength;

    this.input.disabled = disabled;
    this.input.readOnly = readOnly;
    if (typeof maxLength === 'number' && Number.isFinite(maxLength) && maxLength >= 0) {
      this.input.maxLength = Math.floor(maxLength);
    } else {
      this.input.removeAttribute('maxLength');
    }
    if (typeof this.props.placeholder === 'string') {
      this.input.placeholder = this.props.placeholder;
    } else {
      this.input.removeAttribute('placeholder');
    }
  }

  private startInputPositionLoop() {
    if (typeof window === 'undefined') {
      return;
    }
    const loop = () => {
      this._rafId = window.requestAnimationFrame(loop);
      this.updateInputPosition();
    };
    loop();
  }

  private stopInputPositionLoop() {
    if (typeof window === 'undefined') {
      return;
    }
    if (this._rafId !== null) {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  protected handleInput(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;

    if (this.props.disabled || this.props.readOnly) {
      target.value = this.state.text;
      this.setDomSelectionRange(this.state.selectionStart, this.state.selectionEnd);
      return;
    }

    let nextText = target.value;
    const maxLength = this.props.maxLength;
    if (typeof maxLength === 'number' && Number.isFinite(maxLength) && maxLength >= 0) {
      const limit = Math.floor(maxLength);
      if (nextText.length > limit) {
        nextText = nextText.slice(0, limit);
        target.value = nextText;
      }
    }

    const nextSelectionStart = target.selectionStart || 0;
    const nextSelectionEnd = target.selectionEnd || 0;
    this.updateSelectionAndText(nextText, nextSelectionStart, nextSelectionEnd, undefined);
    this.props.onChange?.(nextText);
    this.resetCursorBlink();
    this.scheduleEnsureCursorVisible();
  }

  protected handleKeyDown(e: KeyboardEvent) {
    if (this.props.disabled) {
      e.preventDefault();
      return;
    }

    const handler = this.props.onKeyDown;
    if (typeof handler === 'function') {
      const ev = this.createKeyboardInkwellEvent('keydown', e);
      const res = handler(ev);
      if (res === false || ev.propagationStopped) {
        e.preventDefault();
        return;
      }
    }

    this.resetCursorBlink();
    setTimeout(() => {
      if (this.input) {
        this.updateSelectionAndText(
          undefined,
          this.input.selectionStart || 0,
          this.input.selectionEnd || 0,
          undefined,
        );
        this.scheduleEnsureCursorVisible();
      }
    }, 0);
  }

  protected handleFocus() {
    if (this.props.disabled) {
      this.input?.blur();
      return;
    }
    this.setState({ focused: true, cursorVisible: true });
    this.startCursorTimer();
    this.scheduleEnsureCursorVisible();
    this.props.onFocus?.();
  }

  protected handleBlur() {
    this.setState({ focused: false, cursorVisible: false });
    this.stopCursorTimer();
    this.props.onBlur?.();
  }

  protected startCursorTimer() {
    if (typeof window !== 'undefined' && this.cursorTimer === null) {
      this.cursorTimer = window.setInterval(() => {
        this.setState({ cursorVisible: !this.state.cursorVisible });
      }, 500);
    }
  }

  protected stopCursorTimer() {
    if (typeof window === 'undefined') {
      return;
    }
    if (this.cursorTimer !== null) {
      window.clearInterval(this.cursorTimer);
      this.cursorTimer = null;
    }
  }

  protected resetCursorBlink() {
    this.setState({ cursorVisible: true });
    this.stopCursorTimer();
    if (this.state.focused) {
      this.startCursorTimer();
    }
  }

  protected cancelEnsureCursorVisible() {
    if (this._ensureCursorRafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this._ensureCursorRafId);
    }
    this._ensureCursorRafId = null;
  }

  protected scheduleEnsureCursorVisible() {
    if (typeof window === 'undefined') {
      return;
    }
    if (this._ensureCursorRafId !== null) {
      return;
    }
    const raf = window.requestAnimationFrame;
    if (typeof raf !== 'function') {
      setTimeout(() => this.ensureCursorVisible(), 0);
      return;
    }
    this._ensureCursorRafId = raf(() => {
      this._ensureCursorRafId = null;
      this.ensureCursorVisible();
    });
  }

  protected abstract ensureCursorVisible(): void;
  protected abstract getIndexAtContentPoint(contentX: number, contentY: number): number;

  protected getSelectionAtContentPoint(
    contentX: number,
    contentY: number,
  ): { index: number; caretAffinity?: 'start' | 'end' } {
    return { index: this.getIndexAtContentPoint(contentX, contentY) };
  }

  protected handlePointerDown = (e: InkwellEvent) => {
    if (this.props.disabled) {
      e.stopPropagation?.();
      return;
    }
    e.stopPropagation?.();
    this.input?.focus();
    this.setDragPointerTarget(e.currentTarget);

    const vp = this.getViewportLocalPoint(e);
    this._dragLastViewportX = vp.x;
    this._dragLastViewportY = vp.y;

    // 通过“时间 + 位移”组合判断连续点击，支持双击选词/三击选行
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = now - this._lastClickTs;
    const dx = vp.x - this._lastClickX;
    const dy = vp.y - this._lastClickY;
    const close = dx * dx + dy * dy <= 9;
    if (dt <= 300 && close) {
      this._clickCount += 1;
    } else {
      this._clickCount = 1;
    }
    this._lastClickTs = now;
    this._lastClickX = vp.x;
    this._lastClickY = vp.y;

    const pt = this.toContentPoint(vp.x, vp.y);
    const sel = this.getSelectionAtContentPoint(pt.x, pt.y);
    const index = sel.index;

    if (this._clickCount === 2) {
      // 双击：尽量选中“词/连续字符块”
      const range = this.getWordRangeAtIndex(index);
      if (range) {
        this.endDragInternal();
        this.updateSelectionAndText(undefined, range.start, range.end, undefined);
        this.setDomSelectionRange(range.start, range.end, 'forward');
        this.scheduleEnsureCursorVisible();
        return;
      }
    }

    if (this._clickCount >= 3) {
      // 三击：选中“行”（默认实现为全选；多行文本可覆写）
      const range = this.getLineRangeAtIndex(index);
      if (range) {
        this.endDragInternal();
        this.updateSelectionAndText(undefined, range.start, range.end, undefined);
        this.setDomSelectionRange(range.start, range.end, 'forward');
        this.scheduleEnsureCursorVisible();
        return;
      }
    }

    this._draggingHandle = null;
    this.isDragging = true;
    this.attachGlobalDragListeners();
    this.startDragAutoScrollLoop();

    // 单击：将光标移动到命中位置并开始拖拽选区
    this.updateSelectionAndText(undefined, index, index, sel.caretAffinity);
    this.setDomSelectionRange(index, index);
    this.scheduleEnsureCursorVisible();
  };

  protected handlePointerMove = (e: InkwellEvent) => {
    if (this.props.disabled) {
      e.stopPropagation?.();
      return;
    }
    e.stopPropagation?.();
    if (this.shouldIgnoreLocalPointer(e)) {
      return;
    }
    if (!this.isDragging) {
      return;
    }
    const vp = this.getViewportLocalPoint(e);
    this._dragLastViewportX = vp.x;
    this._dragLastViewportY = vp.y;
    this.updateSelectionByViewportPoint(vp.x, vp.y);
  };

  protected handlePointerUp = (e: InkwellEvent) => {
    if (this.props.disabled) {
      e.stopPropagation?.();
      return;
    }
    e.stopPropagation?.();
    if (this.shouldIgnoreLocalPointer(e)) {
      return;
    }
    this.endDragInternal();
    this.input?.focus();
    this.scheduleEnsureCursorVisible();
  };

  protected beginSelectionHandleDrag(which: 'start' | 'end', e: InkwellEvent) {
    if (this.props.disabled) {
      e.stopPropagation?.();
      return;
    }
    e.stopPropagation?.();
    this.input?.focus();
    this._draggingHandle = which;
    this.isDragging = true;
    this.setDragPointerTarget(this);
    this.attachGlobalDragListeners();
    this.startDragAutoScrollLoop();
    const vp = this.getViewportLocalPointFromCanvasXY(e.x, e.y);
    this._dragLastViewportX = vp.x;
    this._dragLastViewportY = vp.y;
    this.updateSelectionByViewportPoint(vp.x, vp.y);
  }

  protected endSelectionHandleDrag() {
    if (this.props.disabled) {
      return;
    }
    this.endDragInternal();
    this.input?.focus();
    this.scheduleEnsureCursorVisible();
  }

  private endDragInternal() {
    this.isDragging = false;
    this._draggingHandle = null;
    this.detachGlobalDragListeners();
    this.stopDragAutoScrollLoop();
  }

  private updateSelectionByViewportPoint(viewportX: number, viewportY: number) {
    if (!this.isDragging) {
      return;
    }
    const pt = this.toContentPoint(viewportX, viewportY);
    const sel = this.getSelectionAtContentPoint(pt.x, pt.y);
    const index = sel.index;
    const st = this.state;

    let nextStart = st.selectionStart;
    let nextEnd = st.selectionEnd;
    if (this._draggingHandle === 'start') {
      nextStart = index;
    } else {
      nextEnd = index;
    }

    this.updateSelectionAndText(undefined, nextStart, nextEnd, sel.caretAffinity);
    if (this.input) {
      const start = Math.min(nextStart, nextEnd);
      const end = Math.max(nextStart, nextEnd);
      const dir = nextStart > nextEnd ? 'backward' : 'forward';
      this.setDomSelectionRange(start, end, dir);
    }
    this.scheduleEnsureCursorVisible();
  }

  protected attachGlobalDragListeners() {
    if (typeof window === 'undefined') {
      return;
    }
    if (this._hasGlobalDragListeners) {
      return;
    }
    this._hasGlobalDragListeners = true;
    window.addEventListener('pointermove', this._handleWindowMoveBound);
    window.addEventListener('pointerup', this._handleWindowUpBound);
  }

  protected detachGlobalDragListeners() {
    if (typeof window === 'undefined') {
      return;
    }
    if (!this._hasGlobalDragListeners) {
      return;
    }
    this._hasGlobalDragListeners = false;
    window.removeEventListener('pointermove', this._handleWindowMoveBound);
    window.removeEventListener('pointerup', this._handleWindowUpBound);
  }

  private handleWindowPointerMove(e: PointerEvent) {
    if (!this.isDragging) {
      return;
    }
    const pt = this.getLocalPointFromClient(e.clientX, e.clientY);
    this._dragLastViewportX = pt.x;
    this._dragLastViewportY = pt.y;
    this.updateSelectionByViewportPoint(pt.x, pt.y);
  }

  private handleWindowPointerUp(_e: PointerEvent) {
    if (!this.isDragging) {
      return;
    }
    this.endDragInternal();
    this.input?.focus();
    this.scheduleEnsureCursorVisible();
  }

  protected shouldIgnoreLocalPointer(e: InkwellEvent | null): boolean {
    const ne = e?.nativeEvent as PointerEvent | undefined;
    return !!(
      this.isDragging &&
      this._hasGlobalDragListeners &&
      ne &&
      typeof ne.clientX === 'number'
    );
  }

  private startDragAutoScrollLoop() {
    if (typeof window === 'undefined') {
      return;
    }
    if (this._dragAutoScrollRafId !== null) {
      return;
    }
    const step = () => {
      this._dragAutoScrollRafId = window.requestAnimationFrame(step);
      if (!this.isDragging) {
        return;
      }
      const sv = this.scrollViewRef;
      const x = this._dragLastViewportX;
      const y = this._dragLastViewportY;
      if (!sv || x === null || y === null) {
        return;
      }
      const vw = sv.width;
      const vh = sv.height;
      if (vw <= 0 || vh <= 0) {
        return;
      }
      // 当指针拖拽到视口边缘附近时，按距离边缘的程度计算滚动速度，实现“自动滚动选区”
      const threshold = 24;
      const maxSpeed = 24;

      let dx = 0;
      let dy = 0;

      if (x < threshold) {
        dx = -maxSpeed * (1 - Math.max(0, x) / threshold);
      } else if (x > vw - threshold) {
        dx = maxSpeed * (1 - Math.max(0, vw - x) / threshold);
      }

      if (y < threshold) {
        dy = -maxSpeed * (1 - Math.max(0, y) / threshold);
      } else if (y > vh - threshold) {
        dy = maxSpeed * (1 - Math.max(0, vh - y) / threshold);
      }

      if (dx === 0 && dy === 0) {
        return;
      }
      const nextX = sv.scrollX + dx;
      const nextY = sv.scrollY + dy;
      sv.scrollTo(nextX, nextY);
      // 视口滚动后，继续用当前指针位置更新选区，保证拖拽体验连贯
      this.updateSelectionByViewportPoint(x, y);
    };
    this._dragAutoScrollRafId = window.requestAnimationFrame(step);
  }

  private stopDragAutoScrollLoop() {
    if (typeof window === 'undefined') {
      return;
    }
    if (this._dragAutoScrollRafId !== null) {
      window.cancelAnimationFrame(this._dragAutoScrollRafId);
      this._dragAutoScrollRafId = null;
    }
  }

  private toContentPoint(viewportX: number, viewportY: number): { x: number; y: number } {
    const sv = this.scrollViewRef;
    if (!sv) {
      return { x: viewportX, y: viewportY };
    }
    return { x: viewportX + sv.scrollX, y: viewportY + sv.scrollY };
  }

  protected getWordRangeAtIndex(index: number): { start: number; end: number } | null {
    const text = this.state.text;
    if (text.length === 0) {
      return null;
    }
    const i = Math.max(0, Math.min(index, text.length));
    const pivot = i === text.length ? i - 1 : i;
    if (pivot < 0) {
      return null;
    }
    const ch = text[pivot] ?? '';
    if (!ch || /\s/.test(ch)) {
      return null;
    }
    // 按字符类别决定“词边界”：英文/数字/下划线、中文、其他符号分别按连续块扩展
    const isWord = /[A-Za-z0-9_]/.test(ch);
    const isCjk = /[\u4E00-\u9FFF]/.test(ch);
    const type = isWord ? 'word' : isCjk ? 'cjk' : 'other';
    let start = pivot;
    let end = pivot + 1;
    while (start > 0) {
      const c = text[start - 1] ?? '';
      if (!c || /\s/.test(c)) {
        break;
      }
      const cIsWord = /[A-Za-z0-9_]/.test(c);
      const cIsCjk = /[\u4E00-\u9FFF]/.test(c);
      const cType = cIsWord ? 'word' : cIsCjk ? 'cjk' : 'other';
      if (cType !== type) {
        break;
      }
      start -= 1;
    }
    while (end < text.length) {
      const c = text[end] ?? '';
      if (!c || /\s/.test(c)) {
        break;
      }
      const cIsWord = /[A-Za-z0-9_]/.test(c);
      const cIsCjk = /[\u4E00-\u9FFF]/.test(c);
      const cType = cIsWord ? 'word' : cIsCjk ? 'cjk' : 'other';
      if (cType !== type) {
        break;
      }
      end += 1;
    }
    return { start, end };
  }

  protected getLineRangeAtIndex(_index: number): { start: number; end: number } | null {
    return { start: 0, end: this.state.text.length };
  }

  protected getCaretViewportRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    return null;
  }

  protected getCanvasClientRect(): { left: number; top: number } | null {
    const rt = this.runtime as unknown as {
      getRenderer?: () => { getRawInstance?: () => { canvas?: HTMLCanvasElement } | null } | null;
      container?: HTMLElement | null;
    } | null;
    const raw = rt?.getRenderer?.()?.getRawInstance?.() as { canvas?: HTMLCanvasElement } | null;
    const canvas = raw?.canvas ?? rt?.container?.querySelector?.('canvas') ?? null;
    if (!canvas || typeof canvas.getBoundingClientRect !== 'function') {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  }

  private updateInputPosition() {
    if (!this.input || !this.state.focused || this.props.disabled) {
      return;
    }
    const caret = this.getCaretViewportRect();
    if (!caret) {
      return;
    }
    const canvasRect = this.getCanvasClientRect();
    if (!canvasRect) {
      return;
    }
    // 将“控件内坐标”转换为屏幕坐标，用于摆放隐藏输入框，让输入法候选窗定位正确
    const abs = this.getAbsolutePosition();
    const left = canvasRect.left + abs.dx + caret.left;
    const top = canvasRect.top + abs.dy + caret.top;
    const width = caret.width;
    const height = caret.height;
    if (
      left === this._lastInputLeft &&
      top === this._lastInputTop &&
      width === this._lastInputW &&
      height === this._lastInputH
    ) {
      return;
    }
    this._lastInputLeft = left;
    this._lastInputTop = top;
    this._lastInputW = width;
    this._lastInputH = height;

    this.input.style.left = `${left}px`;
    this.input.style.top = `${top}px`;
    this.input.style.width = `${Math.max(1, width)}px`;
    this.input.style.height = `${Math.max(1, height)}px`;
    this.input.style.fontSize = `${this.props.fontSize || 14}px`;
    this.input.style.fontFamily = this.props.fontFamily || 'Arial, sans-serif';
    this.input.style.lineHeight = `${Math.max(1, height)}px`;
  }

  private getViewportLocalPointFromCanvasXY(x: number, y: number): { x: number; y: number } {
    const self = this as unknown as DragPointerTarget | null;
    if (self?._worldMatrix) {
      const inv = invert(self._worldMatrix);
      return transformPoint(inv, { x, y });
    }
    return { x, y };
  }

  private updateSelectionAndText(
    nextText: string | undefined,
    selectionStart: number,
    selectionEnd: number,
    caretAffinity: 'start' | 'end' | undefined,
  ) {
    const prevText = this.state.text;
    const prevStart = this.state.selectionStart;
    const prevEnd = this.state.selectionEnd;

    if (typeof nextText === 'string' && nextText !== prevText) {
      this.setState({ text: nextText, selectionStart, selectionEnd, caretAffinity });
    } else {
      this.setState({ selectionStart, selectionEnd, caretAffinity });
    }

    if (prevStart !== selectionStart || prevEnd !== selectionEnd) {
      // 统一从这里对外触发选区变化，避免各处分散触发造成重复回调
      this.emitSelectionChange(selectionStart, selectionEnd);
    }
  }

  private emitSelectionChange(selectionStart: number, selectionEnd: number) {
    if (
      selectionStart === this._lastEmitSelectionStart &&
      selectionEnd === this._lastEmitSelectionEnd
    ) {
      return;
    }
    this._lastEmitSelectionStart = selectionStart;
    this._lastEmitSelectionEnd = selectionEnd;
    this.props.onSelectionChange?.(selectionStart, selectionEnd);
  }
}
