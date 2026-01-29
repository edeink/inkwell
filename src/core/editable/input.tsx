/** @jsxImportSource @/utils/compiler */
import { Container } from '../container';
import { Icon } from '../icon';
import { Positioned } from '../positioned';
import { WidgetRegistry } from '../registry';
import { AlignmentGeometry, Stack, StackFit } from '../stack';
import { Text } from '../text';
import { ScrollView } from '../viewport/scroll-view';

import { Editable, type EditableProps } from './base';

import { getCurrentThemeMode, Themes } from '@/styles/theme';

const PASSWORD_MASK_CHAR = '※';

const EYE_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">',
  '<path d="M2.5 12s3.6-7.5 9.5-7.5S21.5 12 21.5 12s-3.6 7.5-9.5 7.5S2.5 12 2.5 12Z"',
  ' stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  '<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"',
  ' fill="currentColor"/>',
  '</svg>',
].join('');

const EYE_OFF_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">',
  '<path d="M3.5 12s3.6-7.5 9.5-7.5c2.05 0 3.86.65 5.34 1.6"',
  ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  '<path d="M20.5 12s-3.6 7.5-9.5 7.5c-2.06 0-3.89-.66-5.38-1.62"',
  ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  '<path d="M9.2 9.2a3.2 3.2 0 0 0 4.48 4.48"',
  ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  '<path d="M4 20 20 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  '</svg>',
].join('');

const PASSWORD_ICON_PADDING_RIGHT: [number, number, number, number] = [0, 28, 0, 0];

/**
 * Input 组件属性
 *
 * 在 EditableProps 基础上补充文本颜色等展示相关参数。
 */
export interface InputProps extends EditableProps {
  type?: string;
  inputType?: 'text' | 'password';
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
    this.state = { ...this.state, passwordVisible: false };
    this.initEditable();
  }

  protected createDomInput(): HTMLInputElement {
    // 单行输入使用原生 input 捕获键盘与输入法事件
    const input = document.createElement('input');
    const t = this.getDomInputType();
    input.type = t;
    return input;
  }

  private resolveDomInputTypeFromProps(props: InputProps): string {
    const raw = props.inputType ?? props.type;
    if (typeof raw !== 'string' || !raw) {
      return 'text';
    }
    if (raw === this.type) {
      return 'text';
    }
    const dt = props.__inkwellType;
    if (typeof dt === 'string' && dt && raw === dt) {
      return 'text';
    }
    if (WidgetRegistry.hasRegisteredType(raw)) {
      return 'text';
    }
    const lower = raw.toLowerCase();
    if (lower === 'text' || lower === 'password') {
      return lower;
    }
    return raw;
  }

  private getDomInputType(): string {
    return this.resolveDomInputTypeFromProps(this.props);
  }

  private isPassword(): boolean {
    return this.getDomInputType() === 'password';
  }

  private getDisplayText(): string {
    const text = this.state.text;
    if (!this.isPassword()) {
      return text;
    }
    const passwordVisible = this.state['passwordVisible'] === true;
    if (passwordVisible) {
      return text;
    }
    return PASSWORD_MASK_CHAR.repeat(text.length);
  }

  private togglePasswordVisible = (e: { stopPropagation?: () => void } | null) => {
    e?.stopPropagation?.();
    if (this.props.disabled) {
      return;
    }
    this.input?.focus?.();
    const next = this.state['passwordVisible'] !== true;
    this.setState({ passwordVisible: next });
  };

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

    const text = this.getDisplayText();
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
    const text = this.getDisplayText();

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
      this.measureCtx.measureText(this.getDisplayText().substring(0, cursorIndex)).width || 0;
    const scrollX = sv ? sv.scrollX : 0;
    return { left: cursorX - scrollX, top: 2, width: 2, height: fontSize };
  }

  protected override didUpdateWidget(oldProps: InputProps) {
    const prevType = this.resolveDomInputTypeFromProps(oldProps);
    const nextType = this.resolveDomInputTypeFromProps(this.props);
    if (this.input && prevType !== nextType) {
      (this.input as HTMLInputElement).type = this.getDomInputType();
    }
    super.didUpdateWidget(oldProps);
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
    const displayText = this.getDisplayText();
    const resolvedSelectionColor = this.resolveSelectionColor();

    if (this.measureCtx) {
      this.measureCtx.font = `${fontSize}px ${fontFamily}`;
    }

    const textWidth = this.measureCtx?.measureText(displayText).width || 0;

    const cursorIndex = selectionEnd;
    const cursorX = this.measureCtx?.measureText(displayText.substring(0, cursorIndex)).width || 0;

    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    let selectionRect = null;

    if (start !== end && this.measureCtx) {
      const startX = this.measureCtx.measureText(displayText.substring(0, start)).width;
      const endX = this.measureCtx.measureText(displayText.substring(0, end)).width;
      selectionRect = {
        left: startX,
        width: endX - startX,
      };
    }

    const showPlaceholder =
      text.length === 0 && typeof placeholder === 'string' && placeholder.length > 0;
    const placeholderColor = theme.text.placeholder;

    const isPassword = this.isPassword();
    const iconColor = disabled ? theme.text.placeholder : theme.text.secondary;
    const passwordVisible = this.state['passwordVisible'] === true;
    const iconSvg = passwordVisible ? EYE_SVG : EYE_OFF_SVG;

    const content = (
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
                text={displayText}
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
                    this.measureCtx?.measureText(displayText.substring(0, selectionStart)).width ||
                    0
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
                  left={
                    this.measureCtx?.measureText(displayText.substring(0, selectionEnd)).width || 0
                  }
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
    );

    const paddedContent = isPassword ? (
      <Container padding={PASSWORD_ICON_PADDING_RIGHT}>{content}</Container>
    ) : (
      content
    );

    return (
      <Container
        onPointerDown={this.handlePointerDown}
        onPointerMove={this.handlePointerMove}
        onPointerUp={this.handlePointerUp}
        pointerEvent="auto"
        cursor={disabled ? 'not-allowed' : 'text'}
      >
        {isPassword ? (
          <Stack alignment={AlignmentGeometry.TopLeft} fit={StackFit.Loose}>
            {paddedContent}
            <Positioned right={0} top={0} width={28} height={fontSize * 1.5}>
              <Container
                alignment="center"
                pointerEvent={disabled ? 'none' : 'auto'}
                cursor={disabled ? 'not-allowed' : 'pointer'}
                onPointerDown={this.togglePasswordVisible}
              >
                <Icon svg={iconSvg} size={16} color={iconColor} />
              </Container>
            </Positioned>
          </Stack>
        ) : (
          paddedContent
        )}
      </Container>
    );
  }
}
