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
import { type TextLineMetrics } from '@/core/text';
import { type AnyElement } from '@/utils/compiler/jsx-compiler';

export interface TextAreaProps extends WidgetProps {
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

interface TextAreaState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  focused: boolean;
  cursorVisible: boolean;
  [key: string]: unknown;
}

export class TextArea extends StatefulWidget<TextAreaProps, TextAreaState> {
  private input: HTMLTextAreaElement | null = null;
  private measureCanvas: HTMLCanvasElement | null = null;
  private measureCtx: CanvasRenderingContext2D | null = null;
  private cursorTimer: number | null = null;
  private _rafId: number | null = null;
  private textWidgetRef: Text | null = null;
  private isDragging: boolean = false;

  constructor(props: TextAreaProps) {
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

  createElement(data: TextAreaProps) {
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

    this.input = document.createElement('textarea');
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
    const target = e.target as HTMLTextAreaElement;
    this.setState({
      text: target.value,
      selectionStart: target.selectionStart || 0,
      selectionEnd: target.selectionEnd || 0,
    });
    this.props.onChange?.(target.value);
    this.resetCursorBlink();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.resetCursorBlink();
    if (e.key === 'ArrowUp') {
      this.handleVerticalCursorMove('up', e);
      return;
    }
    if (e.key === 'ArrowDown') {
      this.handleVerticalCursorMove('down', e);
      return;
    }

    setTimeout(() => {
      if (this.input) {
        this.setState({
          selectionStart: this.input.selectionStart || 0,
          selectionEnd: this.input.selectionEnd || 0,
        });
      }
    }, 0);
  };

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
  }

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

  private measureTextWidth(text: string): number {
    if (!this.measureCtx) {
      return 0;
    }
    this.measureCtx.font = `${this.props.fontSize || 14}px ${this.props.fontFamily || 'Arial, sans-serif'}`;
    return this.measureCtx.measureText(text).width;
  }

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

    // Handle end of text case (after last char)
    if (index === this.state.text.length && lines.length > 0) {
      // If last char is newline, it should be on next line?
      // TextLayout handles wrapping.
      // If we are at the end, use the last line's logic
      targetLine = lines[lines.length - 1];
      // Check if last line ends with newline?
      // TextLayout lines usually include newline char if present
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

  private getIndexAtPoint(x: number, y: number): number {
    if (!this.textWidgetRef || !this.textWidgetRef.lines) {
      return 0;
    }
    const lines = this.textWidgetRef.lines;
    let targetLine: TextLineMetrics | null = null;

    for (const line of lines) {
      if (y >= line.y && y < line.y + line.height) {
        targetLine = line;
        break;
      }
    }

    if (!targetLine) {
      if (y < lines[0].y) {
        targetLine = lines[0];
      } else if (lines.length > 0) {
        targetLine = lines[lines.length - 1];
      }
    }

    if (!targetLine) {
      return 0;
    }

    const relX = x - targetLine.x;
    const lineText = targetLine.text;
    const startIndex = targetLine.startIndex;
    let bestOffset = 0;
    let minDiff = Infinity;

    for (let i = 0; i <= lineText.length; i++) {
      const sub = lineText.substring(0, i);
      const w = this.measureTextWidth(sub);
      const diff = Math.abs(relX - w);
      if (diff < minDiff) {
        minDiff = diff;
        bestOffset = i;
      }
    }

    return startIndex + bestOffset;
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

  private handlePointerDown = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.isDragging = true;
    this.input?.focus();

    const pt = this.getLocalPoint(e);
    const index = this.getIndexAtPoint(pt.x, pt.y);

    this.setState({
      selectionStart: index,
      selectionEnd: index,
    });

    if (this.input) {
      this.input.setSelectionRange(index, index);
    }
  };

  private handlePointerMove = (e: InkwellEvent) => {
    e.stopPropagation?.();
    if (!this.isDragging) {
      return;
    }

    const pt = this.getLocalPoint(e);
    const index = this.getIndexAtPoint(pt.x, pt.y);

    this.setState({
      selectionEnd: index,
    });

    if (this.input) {
      const start = Math.min(this.state.selectionStart, index);
      const end = Math.max(this.state.selectionStart, index);
      const dir = this.state.selectionStart > index ? 'backward' : 'forward';
      this.input.setSelectionRange(start, end, dir);
    }
  };

  private handlePointerUp = (_: InkwellEvent) => {
    _.stopPropagation?.();
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

    // Calculate cursor
    const cursorInfo = this.getCursorInfoAtIndex(selectionEnd);

    // Calculate selection rects
    // Simplified selection: iterate lines and add rects
    const selectionWidgets: AnyElement[] = [];
    if (selectionStart !== selectionEnd && this.textWidgetRef && this.textWidgetRef.lines) {
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);

      for (const line of this.textWidgetRef.lines) {
        const lineStart = line.startIndex;
        const lineEnd = line.endIndex;
        const intersectStart = Math.max(start, lineStart);
        const intersectEnd = Math.min(end, lineEnd);

        if (intersectStart < intersectEnd) {
          const preText = text.substring(lineStart, intersectStart);
          const selText = text.substring(intersectStart, intersectEnd);
          const preWidth = this.measureTextWidth(preText);
          const selWidth = this.measureTextWidth(selText);

          selectionWidgets.push(
            <Positioned key={`sel-${lineStart}`} left={line.x + preWidth} top={line.y}>
              <Container width={selWidth} height={line.height} color={selectionColor} />
            </Positioned>,
          );
        }
      }
    }

    return (
      <Container
        onPointerDown={this.handlePointerDown}
        onPointerMove={this.handlePointerMove}
        onPointerUp={this.handlePointerUp}
        pointerEvent="auto"
        alignment="topLeft"
        cursor="text"
      >
        <ScrollView
          enableBounceVertical={true}
          enableBounceHorizontal={false}
          alwaysShowScrollbarY={false}
        >
          <Stack>
            {/* Selection */}
            {selectionWidgets}

            {/* Text */}
            <Text
              ref={(r) => (this.textWidgetRef = r as Text)}
              text={text}
              fontSize={fontSize}
              fontFamily={fontFamily}
              color={color}
              // TextArea usually wraps
            />

            {/* Cursor */}
            {focused && cursorVisible && (
              <Positioned left={cursorInfo.x} top={cursorInfo.y}>
                <Container width={2} height={cursorInfo.height} color={cursorColor} />
              </Positioned>
            )}
          </Stack>
        </ScrollView>
      </Container>
    );
  }
}
