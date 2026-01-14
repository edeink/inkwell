/** @jsxImportSource @/utils/compiler */
import {
  Container,
  type InkwellEvent,
  ScrollView,
  Stack,
  StatefulWidget,
  Text,
  type WidgetProps,
} from '@/core';
import { invert, transformPoint } from '@/core/helper/transform';
import { Positioned } from '@/core/positioned';
import { getCurrentThemeMode, Themes } from '@/styles/theme';

export interface InputProps extends WidgetProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  selectionColor?: string;
  cursorColor?: string;
  autoFocus?: boolean;
}

interface InputState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  focused: boolean;
  cursorVisible: boolean;
  [key: string]: unknown;
}

export class Input extends StatefulWidget<InputProps, InputState> {
  private input: HTMLInputElement | null = null;
  private measureCanvas: HTMLCanvasElement | null = null;
  private measureCtx: CanvasRenderingContext2D | null = null;
  private cursorTimer: number | null = null;
  private _rafId: number | null = null;
  private _ensureCursorRafId: number | null = null;
  private isDragging: boolean = false;
  private scrollViewRef: ScrollView | null = null;
  private _dragPointerTarget: {
    _worldMatrix?: [number, number, number, number, number, number];
  } | null = null;
  private _hasGlobalDragListeners = false;
  private _handleWindowMoveBound: (e: PointerEvent) => void;
  private _handleWindowUpBound: (e: PointerEvent) => void;

  constructor(props: InputProps) {
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
    this.initMeasureContext();
    this.createHiddenInput();
  }

  createElement(data: InputProps) {
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

  private initMeasureContext() {
    if (typeof document !== 'undefined') {
      this.measureCanvas = document.createElement('canvas');
      this.measureCtx = this.measureCanvas.getContext('2d');
    }
  }

  private createHiddenInput() {
    if (typeof document === 'undefined') {
      return;
    }

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.style.position = 'fixed';
    this.input.style.opacity = '0';
    this.input.style.left = '-9999px';
    this.input.style.top = '0px';
    this.input.style.zIndex = '-1';

    this.input.value = this.props.value;

    this.input.addEventListener('input', this.handleInput);
    this.input.addEventListener('keydown', this.handleKeyDown);
    this.input.addEventListener('blur', this.handleBlur);
    this.input.addEventListener('focus', this.handleFocus);

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
      // Sync logic can be added here if needed for IME popup positioning
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

  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.setState({
      text: target.value,
      selectionStart: target.selectionStart || 0,
      selectionEnd: target.selectionEnd || 0,
    });
    this.props.onChange?.(target.value);
    this.resetCursorBlink();
    this.scheduleEnsureCursorVisible();
  };

  private handleKeyDown = (_: KeyboardEvent) => {
    // Forward selection state
    setTimeout(() => {
      if (this.input) {
        this.setState({
          selectionStart: this.input.selectionStart || 0,
          selectionEnd: this.input.selectionEnd || 0,
        });
        this.scheduleEnsureCursorVisible();
      }
    }, 0);
    this.resetCursorBlink();
  };

  private handleFocus = () => {
    this.setState({ focused: true, cursorVisible: true });
    this.startCursorTimer();
    this.scheduleEnsureCursorVisible();
  };

  private handleBlur = () => {
    this.setState({ focused: false, cursorVisible: false });
    this.stopCursorTimer();
  };

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
    this.setState({ cursorVisible: true });
    this.stopCursorTimer();
    if (this.state.focused) {
      this.startCursorTimer();
    }
  }

  private cancelEnsureCursorVisible() {
    if (this._ensureCursorRafId !== null && typeof window !== 'undefined') {
      try {
        window.cancelAnimationFrame(this._ensureCursorRafId);
      } catch {}
    }
    this._ensureCursorRafId = null;
  }

  private scheduleEnsureCursorVisible() {
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

  private ensureCursorVisible() {
    const sv = this.scrollViewRef;
    if (!sv || !this.measureCtx) {
      return;
    }

    const viewportW = sv.width;
    if (viewportW <= 0) {
      return;
    }

    const fontSize = this.props.fontSize || 14;
    const fontFamily = this.props.fontFamily || 'Arial, sans-serif';
    this.measureCtx.font = `${fontSize}px ${fontFamily}`;

    const text = this.state.text;
    const cursorIndex = this.state.selectionEnd;
    const cursorX = this.measureCtx.measureText(text.substring(0, cursorIndex)).width || 0;
    const caretW = 2;
    const padding = 8;

    const contentW = Math.max((this.measureCtx.measureText(text).width || 0) + 20, 100);
    const maxScrollX = Math.max(0, contentW - viewportW);

    const curScrollX = sv.scrollX;
    const visibleLeft = curScrollX + padding;
    const visibleRight = curScrollX + viewportW - padding;
    const caretLeft = cursorX;
    const caretRight = cursorX + caretW;

    let nextScrollX = curScrollX;
    if (caretLeft < visibleLeft) {
      nextScrollX = caretLeft - padding;
    } else if (caretRight > visibleRight) {
      nextScrollX = caretRight - (viewportW - padding);
    } else {
      return;
    }

    nextScrollX = Math.max(0, Math.min(maxScrollX, nextScrollX));
    sv.scrollTo(nextScrollX, sv.scrollY);
  }

  private getLocalPoint(e: InkwellEvent): { x: number; y: number } {
    const target = e.target as unknown as {
      _worldMatrix?: [number, number, number, number, number, number];
    } | null;
    if (target?._worldMatrix) {
      try {
        const inv = invert(target._worldMatrix);
        return transformPoint(inv, { x: e.x, y: e.y });
      } catch (err) {
        // 降级处理
      }
    }
    return { x: e.x, y: e.y };
  }

  private getLocalPointFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const target = this._dragPointerTarget;
    if (target?._worldMatrix) {
      try {
        const inv = invert(target._worldMatrix);
        return transformPoint(inv, { x: clientX, y: clientY });
      } catch (err) {
        // 降级处理
      }
    }
    return { x: clientX, y: clientY };
  }

  private attachGlobalDragListeners() {
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

  private detachGlobalDragListeners() {
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

  private updateSelectionByLocalX(localX: number) {
    if (!this.isDragging) {
      return;
    }

    const index = this.getIndexAtX(localX);
    const st = this.state;

    if (index !== st.selectionEnd) {
      this.setState({ selectionEnd: index });
      if (this.input) {
        const start = Math.min(st.selectionStart, index);
        const end = Math.max(st.selectionStart, index);
        const dir = st.selectionStart > index ? 'backward' : 'forward';
        this.input.setSelectionRange(start, end, dir);
      }
    }
    this.scheduleEnsureCursorVisible();
  }

  private handleWindowPointerMove(e: PointerEvent) {
    if (!this.isDragging) {
      return;
    }
    const pt = this.getLocalPointFromClient(e.clientX, e.clientY);
    this.updateSelectionByLocalX(pt.x);
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

  private getIndexAtX(x: number) {
    if (!this.measureCtx) {
      return 0;
    }

    let bestIndex = 0;
    let minDiff = Infinity;
    const text = this.state.text;

    this.measureCtx.font = `${this.props.fontSize || 14}px ${this.props.fontFamily || 'Arial'}`;

    for (let i = 0; i <= text.length; i++) {
      const w = this.measureCtx.measureText(text.substring(0, i)).width;
      const diff = Math.abs(w - x);
      if (diff < minDiff) {
        minDiff = diff;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private handlePointerDown = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.input?.focus();
    this.isDragging = true;
    this._dragPointerTarget = e.target as unknown as {
      _worldMatrix?: [number, number, number, number, number, number];
    } | null;
    this.attachGlobalDragListeners();

    const pt = this.getLocalPoint(e);
    const bestIndex = this.getIndexAtX(pt.x);

    this.setState({
      selectionStart: bestIndex,
      selectionEnd: bestIndex,
    });

    if (this.input) {
      this.input.setSelectionRange(bestIndex, bestIndex);
    }
    this.scheduleEnsureCursorVisible();
  };

  private handlePointerMove = (e: InkwellEvent) => {
    e.stopPropagation?.();
    const ne = (e as unknown as { nativeEvent?: PointerEvent } | null)?.nativeEvent;
    if (this.isDragging && this._hasGlobalDragListeners && ne && typeof ne.clientX === 'number') {
      return;
    }
    if (!this.isDragging) {
      return;
    }

    const pt = this.getLocalPoint(e);
    this.updateSelectionByLocalX(pt.x);
  };

  private handlePointerUp = (e: InkwellEvent) => {
    e.stopPropagation?.();
    const ne = (e as unknown as { nativeEvent?: PointerEvent } | null)?.nativeEvent;
    if (this.isDragging && this._hasGlobalDragListeners && ne && typeof ne.clientX === 'number') {
      return;
    }
    this.isDragging = false;
    this.detachGlobalDragListeners();
    this.input?.focus();
    this.scheduleEnsureCursorVisible();
  };

  render() {
    const {
      fontSize = 14,
      fontFamily = 'Arial, sans-serif',
      color = '#000000',
      cursorColor = '#000000',
    } = this.props;

    const { text, selectionStart, selectionEnd, focused, cursorVisible } = this.state;
    const theme = Themes[getCurrentThemeMode()];
    const resolvedSelectionColor = focused
      ? (this.props.selectionColor ?? theme.state.focus)
      : theme.state.selected;

    // Measurement
    if (this.measureCtx) {
      this.measureCtx.font = `${fontSize}px ${fontFamily}`;
    }

    const textWidth = this.measureCtx?.measureText(text).width || 0;

    // Calculate cursor position
    const cursorIndex = selectionEnd;
    const cursorX = this.measureCtx?.measureText(text.substring(0, cursorIndex)).width || 0;

    // Calculate selection rects
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    let selectionRect = null;

    if (start !== end && this.measureCtx) {
      const startX = this.measureCtx.measureText(text.substring(0, start)).width;
      const endX = this.measureCtx.measureText(text.substring(0, end)).width;
      selectionRect = {
        left: startX,
        width: endX - startX,
      };
    }

    return (
      <Container
        onPointerDown={this.handlePointerDown}
        onPointerMove={this.handlePointerMove}
        onPointerUp={this.handlePointerUp}
        pointerEvent="auto"
        cursor="text"
      >
        <ScrollView
          ref={(r) => (this.scrollViewRef = r as ScrollView)}
          enableBounceHorizontal={true}
          enableBounceVertical={false}
          alwaysShowScrollbarX={false}
          alwaysShowScrollbarY={false}
          scrollBarVisibilityMode="auto"
        >
          <Container width={Math.max(textWidth + 20, 100)} height={fontSize * 1.5}>
            <Stack>
              {/* Selection */}
              {selectionRect && (
                <Positioned left={selectionRect.left} top={0}>
                  <Container
                    width={selectionRect.width}
                    height={fontSize * 1.2} // Approximate height
                    color={resolvedSelectionColor}
                  />
                </Positioned>
              )}

              {/* Text */}
              <Text
                text={text}
                fontSize={fontSize}
                fontFamily={fontFamily}
                color={color}
                lineHeight={fontSize * 1.5}
              />

              {/* Cursor */}
              {focused && cursorVisible && (
                <Positioned left={cursorX} top={2}>
                  <Container width={2} height={fontSize} color={cursorColor} />
                </Positioned>
              )}
            </Stack>
          </Container>
        </ScrollView>
      </Container>
    );
  }
}
