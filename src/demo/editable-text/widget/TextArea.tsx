/** @jsxImportSource @/utils/compiler */
import { Editable, type EditableProps } from './editable';

import { Container, ScrollView, Stack, Text } from '@/core';
import { Positioned } from '@/core/positioned';
import { type TextLineMetrics } from '@/core/text';
import { type AnyElement } from '@/utils/compiler/jsx-compiler';

export interface TextAreaProps extends EditableProps {
  placeholder?: string;
  color?: string;
}

export class TextArea extends Editable<TextAreaProps> {
  private textWidgetRef: Text | null = null;
  private preferredCursorX: number | null = null;

  constructor(props: TextAreaProps) {
    super(props);
    this.initEditable();
  }

  protected createDomInput(): HTMLTextAreaElement {
    return document.createElement('textarea');
  }

  protected override handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') {
      this.resetCursorBlink();
      this.handleVerticalCursorMove('up', e);
      return;
    }
    if (e.key === 'ArrowDown') {
      this.resetCursorBlink();
      this.handleVerticalCursorMove('down', e);
      return;
    }
    this.preferredCursorX = null;
    super.handleKeyDown(e);
  }

  protected override handleInput(e: Event) {
    this.preferredCursorX = null;
    super.handleInput(e);
  }

  private handleVerticalCursorMove(direction: 'up' | 'down', e: KeyboardEvent) {
    if (!this.textWidgetRef || !this.textWidgetRef.lines || this.textWidgetRef.lines.length === 0) {
      return;
    }

    e.preventDefault();

    const lines = this.textWidgetRef.lines;
    const currentCursor = this.state.selectionEnd;
    const lineIndex = this.getLineIndexAtCursor(currentCursor, this.state.caretAffinity);

    let newIndex = currentCursor;
    let nextAffinity: 'start' | 'end' | undefined = this.state.caretAffinity;

    if (direction === 'up') {
      if (lineIndex > 0) {
        const prevLine = lines[lineIndex - 1];
        const currInfo = this.getCursorInfoAtIndex(currentCursor, this.state.caretAffinity);
        if (this.preferredCursorX === null) {
          this.preferredCursorX = currInfo.x;
        }
        const targetY = prevLine.y + prevLine.height / 2;
        const sel = this.getSelectionAtPoint(this.preferredCursorX, targetY);
        newIndex = sel.index;
        nextAffinity = sel.caretAffinity;
      } else {
        newIndex = 0;
        nextAffinity = undefined;
      }
    } else {
      if (lineIndex < lines.length - 1) {
        const nextLine = lines[lineIndex + 1];
        const currInfo = this.getCursorInfoAtIndex(currentCursor, this.state.caretAffinity);
        if (this.preferredCursorX === null) {
          this.preferredCursorX = currInfo.x;
        }
        const targetY = nextLine.y + nextLine.height / 2;
        const sel = this.getSelectionAtPoint(this.preferredCursorX, targetY);
        newIndex = sel.index;
        nextAffinity = sel.caretAffinity;
      } else {
        newIndex = this.state.text.length;
        nextAffinity = undefined;
      }
    }

    if (e.shiftKey) {
      this.setState({
        selectionEnd: newIndex,
        caretAffinity: nextAffinity,
      });
      if (this.input) {
        const start = Math.min(this.state.selectionStart, newIndex);
        const end = Math.max(this.state.selectionStart, newIndex);
        const dir = this.state.selectionStart > newIndex ? 'backward' : 'forward';
        this.setDomSelectionRange(start, end, dir);
      }
    } else {
      this.setState({
        selectionStart: newIndex,
        selectionEnd: newIndex,
        caretAffinity: nextAffinity,
      });

      this.setDomSelectionRange(newIndex, newIndex);
    }
    this.scheduleEnsureCursorVisible();
  }

  protected ensureCursorVisible() {
    const sv = this.scrollViewRef;
    if (!sv) {
      return;
    }

    const viewportW = sv.width;
    const viewportH = sv.height;
    if (viewportW <= 0 || viewportH <= 0) {
      return;
    }

    const cursor = this.getCursorInfoAtIndex(this.state.selectionEnd);
    const caretW = 2;
    const padding = 8;

    const lines = this.textWidgetRef?.lines || [];
    let contentW = 0;
    let contentH = 0;
    for (const line of lines) {
      contentW = Math.max(contentW, (line.x || 0) + (line.width || 0));
      contentH = Math.max(contentH, (line.y || 0) + (line.height || 0));
    }
    if (lines.length === 0) {
      const fontSize = this.props.fontSize || 14;
      const fontFamily = this.props.fontFamily || 'Arial, sans-serif';
      if (this.measureCtx) {
        this.measureCtx.font = `${fontSize}px ${fontFamily}`;
        contentW = this.measureCtx.measureText(this.state.text).width || 0;
      }
      contentH = fontSize * 1.5;
    }

    const maxScrollX = Math.max(0, contentW - viewportW);
    const maxScrollY = Math.max(0, contentH - viewportH);

    const caretLeft = cursor.x;
    const caretRight = cursor.x + caretW;
    const caretTop = cursor.y;
    const caretBottom = cursor.y + cursor.height;

    const curScrollX = sv.scrollX;
    const curScrollY = sv.scrollY;

    const visibleLeft = curScrollX + padding;
    const visibleRight = curScrollX + viewportW - padding;
    const visibleTop = curScrollY + padding;
    const visibleBottom = curScrollY + viewportH - padding;

    let nextScrollX = curScrollX;
    let nextScrollY = curScrollY;

    if (caretLeft < visibleLeft) {
      nextScrollX = caretLeft - padding;
    } else if (caretRight > visibleRight) {
      nextScrollX = caretRight - (viewportW - padding);
    }

    if (caretTop < visibleTop) {
      nextScrollY = caretTop - padding;
    } else if (caretBottom > visibleBottom) {
      nextScrollY = caretBottom - (viewportH - padding);
    }

    nextScrollX = Math.max(0, Math.min(maxScrollX, nextScrollX));
    nextScrollY = Math.max(0, Math.min(maxScrollY, nextScrollY));

    if (nextScrollX === curScrollX && nextScrollY === curScrollY) {
      return;
    }
    sv.scrollTo(nextScrollX, nextScrollY);
  }

  private measureTextWidth(text: string): number {
    if (!this.measureCtx) {
      return 0;
    }
    const fontSize = this.props.fontSize || 14;
    const fontFamily = this.props.fontFamily || 'Arial, sans-serif';
    this.measureCtx.font = `${fontSize}px ${fontFamily}`;
    return this.measureCtx.measureText(text).width;
  }

  private getCursorInfoAtIndex(
    index: number,
    affinity?: 'start' | 'end',
  ): { x: number; y: number; height: number } {
    const defaultInfo = { x: 0, y: 0, height: this.props.fontSize || 14 };

    if (!this.textWidgetRef || !this.textWidgetRef.lines || this.textWidgetRef.lines.length === 0) {
      const x = this.measureTextWidth(this.state.text.substring(0, index));
      return { ...defaultInfo, x };
    }

    const lines = this.textWidgetRef.lines;
    const idx = this.getLineIndexAtCursor(index, affinity);
    const targetLine = lines[idx] || lines[0];

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

  private getLineIndexAtCursor(index: number, affinity?: 'start' | 'end'): number {
    const lines = this.textWidgetRef?.lines || [];
    if (lines.length === 0) {
      return 0;
    }

    const hits: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (index >= line.startIndex && index <= line.endIndex) {
        hits.push(i);
      }
    }

    if (hits.length > 1) {
      return affinity === 'start' ? hits[hits.length - 1] : hits[0];
    }

    if (hits.length === 1) {
      return hits[0];
    }

    if (index >= lines[lines.length - 1].endIndex) {
      return lines.length - 1;
    }
    return 0;
  }

  private getSelectionAtPoint(
    x: number,
    y: number,
  ): { index: number; caretAffinity?: 'start' | 'end' } {
    if (!this.textWidgetRef || !this.textWidgetRef.lines) {
      return { index: 0 };
    }
    const lines = this.textWidgetRef.lines;
    let targetLine: TextLineMetrics | null = null;
    let targetLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (y >= line.y && y < line.y + line.height) {
        targetLine = line;
        targetLineIndex = i;
        break;
      }
    }

    if (!targetLine) {
      if (y < lines[0].y) {
        targetLine = lines[0];
        targetLineIndex = 0;
      } else if (lines.length > 0) {
        targetLine = lines[lines.length - 1];
        targetLineIndex = lines.length - 1;
      }
    }

    if (!targetLine) {
      return { index: 0 };
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

    const index = startIndex + bestOffset;
    let caretAffinity: 'start' | 'end' | undefined;
    if (bestOffset === 0 && targetLineIndex > 0) {
      const prev = lines[targetLineIndex - 1];
      if (prev.endIndex === index) {
        caretAffinity = 'start';
      }
    } else if (bestOffset === lineText.length && targetLineIndex < lines.length - 1) {
      const next = lines[targetLineIndex + 1];
      if (next.startIndex === index) {
        caretAffinity = 'end';
      }
    }

    return { index, caretAffinity };
  }

  protected getIndexAtLocalPoint(localX: number, localY: number): number {
    return this.getSelectionAtPoint(localX, localY).index;
  }

  protected override getSelectionAtLocalPoint(
    localX: number,
    localY: number,
  ): { index: number; caretAffinity?: 'start' | 'end' } {
    this.preferredCursorX = null;
    return this.getSelectionAtPoint(localX, localY);
  }

  render() {
    const {
      fontSize = 14,
      fontFamily = 'Arial, sans-serif',
      color = '#000000',
      cursorColor = '#000000',
    } = this.props;

    const { text, selectionStart, selectionEnd, focused, cursorVisible } = this.state;
    const resolvedSelectionColor = this.resolveSelectionColor();

    const cursorInfo = this.getCursorInfoAtIndex(selectionEnd, this.state.caretAffinity);

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
              <Container width={selWidth} height={line.height} color={resolvedSelectionColor} />
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
          ref={(r) => (this.scrollViewRef = r as ScrollView)}
          enableBounceVertical={true}
          enableBounceHorizontal={false}
          alwaysShowScrollbarY={false}
          scrollBarVisibilityMode="auto"
        >
          <Stack>
            {selectionWidgets}

            <Text
              ref={(r) => (this.textWidgetRef = r as Text)}
              text={text}
              fontSize={fontSize}
              fontFamily={fontFamily}
              color={color}
            />

            {focused && cursorVisible && selectionStart === selectionEnd && (
              <Positioned left={cursorInfo.x} top={cursorInfo.y}>
                <Container width={1} height={cursorInfo.height} color={cursorColor} />
              </Positioned>
            )}
          </Stack>
        </ScrollView>
      </Container>
    );
  }
}
