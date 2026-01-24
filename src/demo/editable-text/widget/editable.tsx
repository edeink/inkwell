/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：editable-text demo 内的可编辑基类（Widget 抽象基类）。
 * 主要功能：
 * - 通过隐藏的 input/textarea 捕获浏览器输入与快捷键
 * - 维护文本、选区、光标闪烁与拖拽选区等通用状态
 * - 提供坐标换算与自动滚动钩子，供子类实现具体渲染
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
import { type InkwellEvent, ScrollView, StatefulWidget, type WidgetProps } from '@/core';
import { invert, transformPoint } from '@/core/helper/transform';
import { getCurrentThemeMode, Themes } from '@/styles/theme';

/**
 * Editable 的基础 props（由具体输入组件扩展）。
 */
export interface EditableProps extends WidgetProps {
  value: string;
  onChange?: (value: string) => void;
  fontSize?: number;
  fontFamily?: string;
  selectionColor?: string;
  cursorColor?: string;
  autoFocus?: boolean;
}

/**
 * Editable 的基础 state（由具体输入组件扩展）。
 */
export interface EditableState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  focused: boolean;
  cursorVisible: boolean;
  caretAffinity?: 'start' | 'end';
  [key: string]: unknown;
}

type DragPointerTarget = {
  _worldMatrix?: [number, number, number, number, number, number];
};

/**
 * 可编辑基类：负责输入捕获、选区维护与拖拽交互；渲染由子类实现。
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

  /**
   * 初始化可编辑能力：创建测量上下文与隐藏输入框。
   */
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

  dispose() {
    this.stopCursorTimer();
    this.stopInputPositionLoop();
    this.cancelEnsureCursorVisible();
    this.detachGlobalDragListeners();
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

  protected getLocalPoint(e: InkwellEvent): { x: number; y: number } {
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

  /**
   * 创建不可见的 DOM 输入控件，用于接收输入法/快捷键/剪贴板等事件。
   */
  private createHiddenInput() {
    if (typeof document === 'undefined') {
      return;
    }

    this.input = this.createDomInput();
    this.input.style.position = 'fixed';
    this.input.style.opacity = '0';
    this.input.style.left = '-9999px';
    this.input.style.top = '0px';
    this.input.style.zIndex = '0';
    this.input.style.pointerEvents = 'none';
    this.input.style.whiteSpace = 'pre';
    this.input.style.caretColor = 'transparent';

    this.input.value = this.props.value;

    this.input.addEventListener('input', this._handleInputBound);
    this.input.addEventListener('keydown', this._handleKeyDownBound);
    this.input.addEventListener('blur', this._handleBlurBound);
    this.input.addEventListener('focus', this._handleFocusBound);

    document.body.appendChild(this.input);

    if (this.props.autoFocus) {
      setTimeout(() => this.input?.focus(), 0);
    }

    this.startInputPositionLoop();
  }

  /**
   * 输入框位置同步循环：跟随 caret 的 clientRect 更新隐藏输入框的位置与尺寸。
   */
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
    this.setState({
      text: target.value,
      selectionStart: target.selectionStart || 0,
      selectionEnd: target.selectionEnd || 0,
    });
    this.props.onChange?.(target.value);
    this.resetCursorBlink();
    this.scheduleEnsureCursorVisible();
  }

  protected handleKeyDown(_e: KeyboardEvent) {
    this.resetCursorBlink();
    setTimeout(() => {
      if (this.input) {
        this.setState({
          selectionStart: this.input.selectionStart || 0,
          selectionEnd: this.input.selectionEnd || 0,
        });
        this.scheduleEnsureCursorVisible();
      }
    }, 0);
  }

  protected handleFocus() {
    this.setState({ focused: true, cursorVisible: true });
    this.startCursorTimer();
    this.scheduleEnsureCursorVisible();
  }

  protected handleBlur() {
    this.setState({ focused: false, cursorVisible: false });
    this.stopCursorTimer();
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
  protected abstract getIndexAtLocalPoint(localX: number, localY: number): number;

  protected getSelectionAtLocalPoint(
    localX: number,
    localY: number,
  ): { index: number; caretAffinity?: 'start' | 'end' } {
    return { index: this.getIndexAtLocalPoint(localX, localY) };
  }

  protected handlePointerDown = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.input?.focus();
    this.setDragPointerTarget(e.currentTarget);

    const vp = this.getLocalPoint(e);
    this._dragLastViewportX = vp.x;
    this._dragLastViewportY = vp.y;

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
    const sel = this.getSelectionAtLocalPoint(pt.x, pt.y);
    const index = sel.index;

    if (this._clickCount === 2) {
      const range = this.getWordRangeAtIndex(index);
      if (range) {
        this._draggingHandle = null;
        this.isDragging = false;
        this.detachGlobalDragListeners();
        this.stopDragAutoScrollLoop();
        this.setState({
          selectionStart: range.start,
          selectionEnd: range.end,
          caretAffinity: undefined,
        });
        this.setDomSelectionRange(range.start, range.end, 'forward');
        this.scheduleEnsureCursorVisible();
        return;
      }
    }

    if (this._clickCount >= 3) {
      const range = this.getLineRangeAtIndex(index);
      if (range) {
        this._draggingHandle = null;
        this.isDragging = false;
        this.detachGlobalDragListeners();
        this.stopDragAutoScrollLoop();
        this.setState({
          selectionStart: range.start,
          selectionEnd: range.end,
          caretAffinity: undefined,
        });
        this.setDomSelectionRange(range.start, range.end, 'forward');
        this.scheduleEnsureCursorVisible();
        return;
      }
    }

    this._draggingHandle = null;
    this.isDragging = true;
    this.attachGlobalDragListeners();
    this.startDragAutoScrollLoop();

    this.setState({
      selectionStart: index,
      selectionEnd: index,
      caretAffinity: sel.caretAffinity,
    });

    this.setDomSelectionRange(index, index);
    this.scheduleEnsureCursorVisible();
  };

  protected handlePointerMove = (e: InkwellEvent) => {
    e.stopPropagation?.();
    if (this.shouldIgnoreLocalPointer(e)) {
      return;
    }
    if (!this.isDragging) {
      return;
    }
    const pt = this.getLocalPoint(e);
    this._dragLastViewportX = pt.x;
    this._dragLastViewportY = pt.y;
    this.updateSelectionByViewportPoint(pt.x, pt.y);
  };

  protected handlePointerUp = (e: InkwellEvent) => {
    e.stopPropagation?.();
    if (this.shouldIgnoreLocalPointer(e)) {
      return;
    }
    this.isDragging = false;
    this._draggingHandle = null;
    this.detachGlobalDragListeners();
    this.stopDragAutoScrollLoop();
    this.input?.focus();
    this.scheduleEnsureCursorVisible();
  };

  protected updateSelectionByLocalPoint(localX: number, localY: number) {
    this.updateSelectionByViewportPoint(localX, localY);
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
    this.isDragging = false;
    this._draggingHandle = null;
    this.detachGlobalDragListeners();
    this.stopDragAutoScrollLoop();
    this.input?.focus();
    this.scheduleEnsureCursorVisible();
  }

  protected shouldIgnoreLocalPointer(e: InkwellEvent): boolean {
    const ne = (e as unknown as { nativeEvent?: PointerEvent } | null)?.nativeEvent;
    return !!(
      this.isDragging &&
      this._hasGlobalDragListeners &&
      ne &&
      typeof ne.clientX === 'number'
    );
  }

  protected beginSelectionHandleDrag(which: 'start' | 'end', e: InkwellEvent) {
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
    if (!this.isDragging) {
      return;
    }
    this.isDragging = false;
    this._draggingHandle = null;
    this.detachGlobalDragListeners();
    this.stopDragAutoScrollLoop();
    this.input?.focus();
    this.scheduleEnsureCursorVisible();
  }

  private updateSelectionByViewportPoint(viewportX: number, viewportY: number) {
    if (!this.isDragging) {
      return;
    }
    const pt = this.toContentPoint(viewportX, viewportY);
    const sel = this.getSelectionAtLocalPoint(pt.x, pt.y);
    const index = sel.index;
    const st = this.state;

    let nextStart = st.selectionStart;
    let nextEnd = st.selectionEnd;
    if (this._draggingHandle === 'start') {
      nextStart = index;
    } else {
      nextEnd = index;
    }

    if (nextStart === st.selectionStart && nextEnd === st.selectionEnd) {
      return;
    }

    this.setState({
      selectionStart: nextStart,
      selectionEnd: nextEnd,
      caretAffinity: sel.caretAffinity,
    });
    if (this.input) {
      const start = Math.min(nextStart, nextEnd);
      const end = Math.max(nextStart, nextEnd);
      const dir = nextStart > nextEnd ? 'backward' : 'forward';
      this.setDomSelectionRange(start, end, dir);
    }
    this.scheduleEnsureCursorVisible();
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

  private getCanvasClientRect(): { left: number; top: number } | null {
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
    if (!this.input || !this.state.focused) {
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
}
