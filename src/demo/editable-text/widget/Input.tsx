/** @jsxImportSource @/utils/compiler */
import { Editable, type EditableProps } from './editable';

import { Container, ScrollView, Stack, Text } from '@/core';
import { Positioned } from '@/core/positioned';

export interface InputProps extends EditableProps {
  placeholder?: string;
  color?: string;
}

export class Input extends Editable<InputProps> {
  constructor(props: InputProps) {
    super(props);
    this.initEditable();
  }

  protected createDomInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    return input;
  }

  protected ensureCursorVisible() {
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

  protected getIndexAtLocalPoint(localX: number, _localY: number): number {
    return this.getIndexAtX(localX);
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

  render() {
    const {
      fontSize = 14,
      fontFamily = 'Arial, sans-serif',
      color = '#000000',
      cursorColor = '#000000',
    } = this.props;

    const { text, selectionStart, selectionEnd, focused, cursorVisible } = this.state;
    const resolvedSelectionColor = this.resolveSelectionColor();

    if (this.measureCtx) {
      this.measureCtx.font = `${fontSize}px ${fontFamily}`;
    }

    const textWidth = this.measureCtx?.measureText(text).width || 0;

    const cursorIndex = selectionEnd;
    const cursorX = this.measureCtx?.measureText(text.substring(0, cursorIndex)).width || 0;

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
              {selectionRect && (
                <Positioned left={selectionRect.left} top={0}>
                  <Container
                    width={selectionRect.width}
                    height={fontSize * 1.2}
                    color={resolvedSelectionColor}
                  />
                </Positioned>
              )}

              <Text
                text={text}
                fontSize={fontSize}
                fontFamily={fontFamily}
                color={color}
                lineHeight={fontSize * 1.5}
              />

              {focused && cursorVisible && selectionStart === selectionEnd && (
                <Positioned left={cursorX} top={2}>
                  <Container width={1} height={fontSize} color={cursorColor} />
                </Positioned>
              )}
            </Stack>
          </Container>
        </ScrollView>
      </Container>
    );
  }
}
