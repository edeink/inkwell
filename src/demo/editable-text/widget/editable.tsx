/** @jsxImportSource @/utils/compiler */
import { type InkwellEvent, ScrollView, StatefulWidget, type WidgetProps } from '@/core';
import { invert, transformPoint } from '@/core/helper/transform';
import { getCurrentThemeMode, Themes } from '@/styles/theme';

export interface EditableProps extends WidgetProps {
  value: string;
  onChange?: (value: string) => void;
  fontSize?: number;
  fontFamily?: string;
  selectionColor?: string;
  cursorColor?: string;
  autoFocus?: boolean;
}

export interface EditableState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  focused: boolean;
  cursorVisible: boolean;
  [key: string]: unknown;
}

type DragPointerTarget = {
  _worldMatrix?: [number, number, number, number, number, number];
};

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
    const target = e.target as unknown as DragPointerTarget | null;
    if (target?._worldMatrix) {
      const inv = invert(target._worldMatrix);
      return transformPoint(inv, { x: e.x, y: e.y });
    }
    return { x: e.x, y: e.y };
  }

  protected getLocalPointFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const target = this._dragPointerTarget;
    if (target?._worldMatrix) {
      const inv = invert(target._worldMatrix);
      return transformPoint(inv, { x: clientX, y: clientY });
    }
    return { x: clientX, y: clientY };
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
    this.input.style.position = 'fixed';
    this.input.style.opacity = '0';
    this.input.style.left = '-9999px';
    this.input.style.top = '0px';
    this.input.style.zIndex = '-1';

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

  private startInputPositionLoop() {
    if (typeof window === 'undefined') {
      return;
    }
    const loop = () => {
      this._rafId = window.requestAnimationFrame(loop);
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

  protected handlePointerDown = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.input?.focus();
    this.isDragging = true;
    this.setDragPointerTarget(e.target);
    this.attachGlobalDragListeners();

    const pt = this.getLocalPoint(e);
    const index = this.getIndexAtLocalPoint(pt.x, pt.y);

    this.setState({
      selectionStart: index,
      selectionEnd: index,
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
    this.updateSelectionByLocalPoint(pt.x, pt.y);
  };

  protected handlePointerUp = (e: InkwellEvent) => {
    e.stopPropagation?.();
    if (this.shouldIgnoreLocalPointer(e)) {
      return;
    }
    this.isDragging = false;
    this.detachGlobalDragListeners();
    this.input?.focus();
    this.scheduleEnsureCursorVisible();
  };

  protected updateSelectionByLocalPoint(localX: number, localY: number) {
    if (!this.isDragging) {
      return;
    }
    const index = this.getIndexAtLocalPoint(localX, localY);
    const st = this.state;
    if (index !== st.selectionEnd) {
      this.setState({ selectionEnd: index });
      if (this.input) {
        const start = Math.min(st.selectionStart, index);
        const end = Math.max(st.selectionStart, index);
        const dir = st.selectionStart > index ? 'backward' : 'forward';
        this.setDomSelectionRange(start, end, dir);
      }
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
    this.updateSelectionByLocalPoint(pt.x, pt.y);
  }

  private handleWindowPointerUp(_e: PointerEvent) {
    if (!this.isDragging) {
      return;
    }
    this.isDragging = false;
    this.detachGlobalDragListeners();
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
}
