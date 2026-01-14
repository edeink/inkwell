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
  private isDragging: boolean = false;

  constructor(props: InputProps) {
    super(props);
    this.state = {
      text: props.value,
      selectionStart: props.value.length,
      selectionEnd: props.value.length,
      focused: false,
      cursorVisible: false,
    };

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
  };

  private handleKeyDown = (_: KeyboardEvent) => {
    // Forward selection state
    setTimeout(() => {
      if (this.input) {
        this.setState({
          selectionStart: this.input.selectionStart || 0,
          selectionEnd: this.input.selectionEnd || 0,
        });
      }
    }, 0);
    this.resetCursorBlink();
  };

  private handleFocus = () => {
    this.setState({ focused: true, cursorVisible: true });
    this.startCursorTimer();
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

  private getLocalPoint(e: InkwellEvent): { x: number; y: number } {
    const target = e.target as unknown as {
      _worldMatrix?: [number, number, number, number, number, number];
    } | null;
    if (target?._worldMatrix) {
      try {
        const inv = invert(target._worldMatrix);
        return transformPoint(inv, { x: e.x, y: e.y });
      } catch (err) {
        // Fallback
      }
    }
    return { x: e.x, y: e.y };
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

    const pt = this.getLocalPoint(e);
    const bestIndex = this.getIndexAtX(pt.x);

    this.setState({
      selectionStart: bestIndex,
      selectionEnd: bestIndex,
    });

    if (this.input) {
      this.input.setSelectionRange(bestIndex, bestIndex);
    }
  };

  private handlePointerMove = (e: InkwellEvent) => {
    e.stopPropagation?.();
    if (!this.isDragging) {
      return;
    }

    const pt = this.getLocalPoint(e);
    const index = this.getIndexAtX(pt.x);
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
  };

  private handlePointerUp = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.isDragging = false;
    this.input?.focus();
  };

  render() {
    const {
      fontSize = 14,
      fontFamily = 'Arial, sans-serif',
      color = '#000000',
      selectionColor = 'rgba(0, 150, 255, 0.3)',
      cursorColor = '#000000',
    } = this.props;

    const { text, selectionStart, selectionEnd, focused, cursorVisible } = this.state;

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
          enableBounceHorizontal={true}
          enableBounceVertical={false}
          alwaysShowScrollbarX={false}
          alwaysShowScrollbarY={false}
        >
          <Container width={Math.max(textWidth + 20, 100)} height={fontSize * 1.5}>
            <Stack>
              {/* Selection */}
              {selectionRect && (
                <Positioned left={selectionRect.left} top={0}>
                  <Container
                    width={selectionRect.width}
                    height={fontSize * 1.2} // Approximate height
                    color={selectionColor}
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
