/** @jsxImportSource @/utils/compiler */
import { Container } from '../container';
import { Positioned } from '../positioned';
import { Stack } from '../stack';
import { Text } from '../text';
import { ScrollView } from '../viewport/scroll-view';

import { Editable, type EditableProps } from './base';

import { getCurrentThemeMode, Themes } from '@/styles/theme';

/**
 * Input 组件属性
 *
 * 在 EditableProps 基础上补充文本颜色等展示相关参数。
 */
export interface InputProps extends EditableProps {
  /** 文本颜色 */
  color?: string;
}

/**
 * 单行输入框组件
 *
 * - 使用隐藏的原生 input 负责输入与输入法事件
 * - 使用 ScrollView 支持横向滚动，确保光标始终可见
 */
export class Input extends Editable<InputProps> {
  constructor(props: InputProps) {
    super(props);
    this.initEditable();
  }

  protected createDomInput(): HTMLInputElement {
    // 单行输入使用原生 input 捕获键盘与输入法事件
    const input = document.createElement('input');
    input.type = 'text';
    return input;
  }

  protected ensureCursorVisible() {
    const sv = this.scrollViewRef;
    if (!sv || !this.measureCtx) {
      return;
    }

    // 以视口宽度为基准，计算光标是否落在“可视区域 + 内边距”之外，必要时调整 scrollX
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

  protected getIndexAtContentPoint(contentX: number, _contentY: number): number {
    return this.getIndexAtX(contentX);
  }

  private getIndexAtX(x: number) {
    if (!this.measureCtx) {
      return 0;
    }

    // 单行文本长度通常较短，这里使用线性扫描找到最接近 x 的字符索引
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

  protected override getCaretViewportRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    if (!this.measureCtx) {
      return null;
    }
    const sv = this.scrollViewRef;
    const fontSize = this.props.fontSize || 14;
    const fontFamily = this.props.fontFamily || 'Arial, sans-serif';
    this.measureCtx.font = `${fontSize}px ${fontFamily}`;
    const cursorIndex = this.state.selectionEnd;
    const cursorX =
      this.measureCtx.measureText(this.state.text.substring(0, cursorIndex)).width || 0;
    const scrollX = sv ? sv.scrollX : 0;
    return { left: cursorX - scrollX, top: 2, width: 2, height: fontSize };
  }

  render() {
    const theme = Themes[getCurrentThemeMode()];
    const {
      fontSize = 14,
      fontFamily = 'Arial, sans-serif',
      color = '#000000',
      cursorColor = '#000000',
      placeholder,
      disabled,
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

    const showPlaceholder =
      text.length === 0 && typeof placeholder === 'string' && placeholder.length > 0;
    const placeholderColor = theme.text.placeholder;

    return (
      <Container
        onPointerDown={this.handlePointerDown}
        onPointerMove={this.handlePointerMove}
        onPointerUp={this.handlePointerUp}
        pointerEvent="auto"
        cursor={disabled ? 'not-allowed' : 'text'}
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

              {showPlaceholder ? (
                <Text
                  text={placeholder}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  color={placeholderColor}
                  lineHeight={fontSize * 1.5}
                />
              ) : (
                <Text
                  text={text}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  color={color}
                  lineHeight={fontSize * 1.5}
                />
              )}

              {focused && selectionStart !== selectionEnd && (
                <>
                  <Positioned
                    left={
                      this.measureCtx?.measureText(text.substring(0, selectionStart)).width || 0
                    }
                    top={fontSize * 1.2}
                  >
                    <Container
                      width={8}
                      height={8}
                      borderRadius={4}
                      color={cursorColor}
                      pointerEvent="auto"
                      onPointerDown={(e) => this.beginSelectionHandleDrag('start', e)}
                      onPointerUp={(_e) => this.endSelectionHandleDrag()}
                    />
                  </Positioned>
                  <Positioned
                    left={this.measureCtx?.measureText(text.substring(0, selectionEnd)).width || 0}
                    top={fontSize * 1.2}
                  >
                    <Container
                      width={8}
                      height={8}
                      borderRadius={4}
                      color={cursorColor}
                      pointerEvent="auto"
                      onPointerDown={(e) => this.beginSelectionHandleDrag('end', e)}
                      onPointerUp={(_e) => this.endSelectionHandleDrag()}
                    />
                  </Positioned>
                </>
              )}

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
