/** @jsxImportSource @/utils/compiler */
import { Container } from '../container';
import { Positioned } from '../positioned';
import { Stack } from '../stack';
import { Text, type TextLineMetrics } from '../text';
import { ScrollView } from '../viewport/scroll-view';

import { Editable, type EditableProps } from './base';

import { getCurrentThemeMode, Themes } from '@/styles/theme';
import { type AnyElement } from '@/utils/compiler/jsx-compiler';

/**
 * TextArea 组件属性
 *
 * 在 EditableProps 基础上补充文本颜色等展示相关参数。
 */
export interface TextAreaProps extends EditableProps {
  /** 文本颜色 */
  color?: string;
}

type LinePrefixWidthCache = {
  text: string;
  fontKey: string;
  prefix: Float32Array;
};

/**
 * 多行输入框组件
 *
 * - 使用隐藏的原生 textarea 负责输入与输入法事件
 * - 支持上下方向键的“列对齐”移动与纵向滚动，确保光标可见
 */
export class TextArea extends Editable<TextAreaProps> {
  private textWidgetRef: Text | null = null;
  // 竖向移动光标（上下键）时，记录“偏好 x”，以实现与常见编辑器一致的列对齐体验
  private preferredCursorX: number | null = null;
  private linePrefixWidths: Map<number, LinePrefixWidthCache> = new Map();

  constructor(props: TextAreaProps) {
    super(props);
    this.initEditable();
  }

  protected createDomInput(): HTMLTextAreaElement {
    // 多行输入使用原生 textarea 捕获键盘与输入法事件
    return document.createElement('textarea');
  }

  protected override handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      this.resetCursorBlink();
      this.handleVerticalCursorMove('up', e);
      return;
    }
    if (e.key === 'ArrowDown' && !e.metaKey && !e.ctrlKey && !e.altKey) {
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

    // 由组件自行计算“上一行/下一行”的落点，并阻止浏览器默认的 textarea 行为
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
          // 第一次按下上下键时锁定当前列，后续连续按键沿用该列
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
      const lineHeight = this.props.lineHeight ?? fontSize * 1.5;
      const fontFamily = this.props.fontFamily || 'Arial, sans-serif';
      if (this.measureCtx) {
        this.measureCtx.font = `${fontSize}px ${fontFamily}`;
        contentW = this.measureCtx.measureText(this.state.text).width || 0;
      }
      contentH = lineHeight;
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

  protected override getLineRangeAtIndex(index: number): { start: number; end: number } | null {
    const lines = this.textWidgetRef?.lines || [];
    if (lines.length === 0) {
      return { start: 0, end: this.state.text.length };
    }
    const idx = this.getLineIndexAtCursor(index, this.state.caretAffinity);
    const line = lines[idx] || lines[0];
    if (!line) {
      return { start: 0, end: this.state.text.length };
    }
    return { start: line.startIndex, end: line.endIndex };
  }

  protected override getCaretViewportRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    const sv = this.scrollViewRef;
    const cursor = this.getCursorInfoAtIndex(this.state.selectionEnd, this.state.caretAffinity);
    const scrollX = sv ? sv.scrollX : 0;
    const scrollY = sv ? sv.scrollY : 0;
    return { left: cursor.x - scrollX, top: cursor.y - scrollY, width: 2, height: cursor.height };
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

  private getLinePrefixWidths(lineIndex: number, line: TextLineMetrics): Float32Array {
    const fontSize = this.props.fontSize || 14;
    const fontFamily = this.props.fontFamily || 'Arial, sans-serif';
    const fontKey = `${fontSize}px ${fontFamily}`;

    const cached = this.linePrefixWidths.get(lineIndex);
    if (cached && cached.text === line.text && cached.fontKey === fontKey) {
      return cached.prefix;
    }

    if (!this.measureCtx) {
      const prefix = new Float32Array(line.text.length + 1);
      this.linePrefixWidths.set(lineIndex, { text: line.text, fontKey, prefix });
      return prefix;
    }

    this.measureCtx.font = fontKey;
    const prefix = new Float32Array(line.text.length + 1);
    // 为每行构建“累计宽度表”，后续命中测试可二分定位字符索引
    for (let i = 0; i < line.text.length; i++) {
      const w = this.measureCtx.measureText(line.text[i] ?? '').width;
      prefix[i + 1] = prefix[i] + w;
    }
    this.linePrefixWidths.set(lineIndex, { text: line.text, fontKey, prefix });
    return prefix;
  }

  private getCursorInfoAtIndex(
    index: number,
    affinity?: 'start' | 'end',
  ): { x: number; y: number; height: number } {
    const defaultInfo = { x: 0, y: 0, height: this.props.lineHeight ?? this.props.fontSize ?? 14 };

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
      // 光标正好落在换行边界时，可能同时命中前后两行；用 affinity 决定归属
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
    const prefix = this.getLinePrefixWidths(targetLineIndex, targetLine);
    const totalW = prefix[prefix.length - 1] ?? 0;

    if (relX <= 0) {
      bestOffset = 0;
    } else if (relX >= totalW) {
      bestOffset = lineText.length;
    } else {
      // 通过累计宽度表二分搜索字符边界，找到最接近点击位置的字符索引
      let lo = 0;
      let hi = lineText.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const left = prefix[mid] ?? 0;
        const charW = (prefix[mid + 1] ?? left) - left;
        if (left + charW / 2 > relX) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      }
      bestOffset = Math.max(0, Math.min(lineText.length, lo));
    }

    const index = startIndex + bestOffset;
    let caretAffinity: 'start' | 'end' | undefined;
    if (bestOffset === 0 && targetLineIndex > 0) {
      const prev = lines[targetLineIndex - 1];
      if (prev.endIndex === index) {
        // 命中前一行末尾与当前行行首的边界时，将光标归属到“行首侧”
        caretAffinity = 'start';
      }
    } else if (bestOffset === lineText.length && targetLineIndex < lines.length - 1) {
      const next = lines[targetLineIndex + 1];
      if (next.startIndex === index) {
        // 命中当前行末尾与下一行行首的边界时，将光标归属到“行尾侧”
        caretAffinity = 'end';
      }
    }

    return { index, caretAffinity };
  }

  protected getIndexAtContentPoint(contentX: number, contentY: number): number {
    return this.getSelectionAtPoint(contentX, contentY).index;
  }

  protected override getSelectionAtContentPoint(
    contentX: number,
    contentY: number,
  ): { index: number; caretAffinity?: 'start' | 'end' } {
    this.preferredCursorX = null;
    return this.getSelectionAtPoint(contentX, contentY);
  }

  render() {
    const theme = Themes[getCurrentThemeMode()];
    const {
      fontSize = 14,
      fontFamily = 'Arial, sans-serif',
      lineHeight = Math.round(fontSize * 1.5),
      color = '#000000',
      cursorColor = '#000000',
      placeholder,
      disabled,
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

    const showPlaceholder =
      text.length === 0 && typeof placeholder === 'string' && placeholder.length > 0;
    const placeholderColor = theme.text.placeholder;

    return (
      <Container
        onPointerDown={this.handlePointerDown}
        onPointerMove={this.handlePointerMove}
        onPointerUp={this.handlePointerUp}
        pointerEvent="auto"
        alignment="topLeft"
        cursor={disabled ? 'not-allowed' : 'text'}
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

            {showPlaceholder ? (
              <Text
                ref={(r) => (this.textWidgetRef = r as Text)}
                text={''}
                fontSize={fontSize}
                lineHeight={lineHeight}
                fontFamily={fontFamily}
                color={color}
              />
            ) : (
              <Text
                ref={(r) => (this.textWidgetRef = r as Text)}
                text={text}
                fontSize={fontSize}
                lineHeight={lineHeight}
                fontFamily={fontFamily}
                color={color}
              />
            )}

            {showPlaceholder && (
              <Text
                text={placeholder}
                fontSize={fontSize}
                lineHeight={lineHeight}
                fontFamily={fontFamily}
                color={placeholderColor}
              />
            )}

            {focused && selectionStart !== selectionEnd && (
              <>
                <Positioned
                  left={this.getCursorInfoAtIndex(selectionStart, this.state.caretAffinity).x}
                  top={
                    this.getCursorInfoAtIndex(selectionStart, this.state.caretAffinity).y +
                    this.getCursorInfoAtIndex(selectionStart, this.state.caretAffinity).height
                  }
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
                  left={this.getCursorInfoAtIndex(selectionEnd, this.state.caretAffinity).x}
                  top={
                    this.getCursorInfoAtIndex(selectionEnd, this.state.caretAffinity).y +
                    this.getCursorInfoAtIndex(selectionEnd, this.state.caretAffinity).height
                  }
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
