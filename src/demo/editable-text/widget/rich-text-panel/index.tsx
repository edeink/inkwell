/** @jsxImportSource @/utils/compiler */

/**
 * 文件用途：富文本示例面板（RichTextEditor + 选区浮动工具栏）。
 * 主要功能：
 * - 组合 RichTextEditor 与 RichTextToolbar，演示选区样式应用
 * - 根据选区矩形计算浮动工具栏位置，并做边界约束
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
import {
  RichTextEditor,
  type RichSelectionInfo,
  type RichTextDoc,
  type RichTextSpan,
} from '../rich-text-editor';
import { RichTextToolbar } from '../rich-text-toolbar';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  Padding,
  Positioned,
  Stack,
  StatefulWidget,
  Text,
  type WidgetProps,
} from '@/core';

export interface RichTextPanelProps extends WidgetProps {
  theme: ThemePalette;
  value: string | RichTextDoc;
  onChange: (value: string | RichTextDoc) => void;
  onSelectionInfo?: (info: RichSelectionInfo) => void;
}

interface RichTextPanelState {
  focused: boolean;
  selectionStart: number;
  selectionEnd: number;
  draggingSelection: boolean;
  selectionFromDrag: boolean;
  [key: string]: unknown;
}

export class RichTextPanel extends StatefulWidget<RichTextPanelProps, RichTextPanelState> {
  private editorRef: RichTextEditor | null = null;
  private _appliedInitKey: string | null = null;
  private _applyInitTimer: ReturnType<typeof setTimeout> | null = null;

  state: RichTextPanelState = {
    focused: false,
    selectionStart: 0,
    selectionEnd: 0,
    draggingSelection: false,
    selectionFromDrag: false,
  };

  private emitSelectionInfo() {
    if (!this.editorRef) {
      return;
    }
    this.props.onSelectionInfo?.(this.editorRef.getRichSelectionInfo());
  }

  private scheduleApplyInitialSpans(text: string, spans: ReadonlyArray<RichTextSpan> | null) {
    if (!this.editorRef || !spans || spans.length === 0) {
      return;
    }

    let key = text;
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i];
      if (!s) {
        continue;
      }
      const st = s.style;
      key += `|${s.start},${s.end},${st.bold ?? '_'},${st.italic ?? '_'},${st.color ?? '_'},`;
      key += `${st.fontSize ?? '_'},${st.fontFamily ?? '_'}`;
    }

    if (this._appliedInitKey === key) {
      return;
    }
    this._appliedInitKey = key;

    if (this._applyInitTimer !== null) {
      clearTimeout(this._applyInitTimer);
      this._applyInitTimer = null;
    }

    this._applyInitTimer = setTimeout(() => {
      this._applyInitTimer = null;
      this.editorRef?.applyInitialSpans(spans);
    }, 0);
  }

  protected render() {
    const { theme, value, onChange } = this.props;
    const borderColor = theme.border.base;
    const textValue = typeof value === 'string' ? value : value.text;
    const initSpans = typeof value === 'string' ? null : (value.spans ?? null);
    this.scheduleApplyInitialSpans(textValue, initSpans);

    const colorPresets = [
      { label: '墨黑', value: '#1F2328' },
      { label: '岩灰', value: '#4B5563' },
      { label: '靛蓝', value: '#2F54EB' },
      { label: '纸红', value: '#B23A48' },
      { label: '松绿', value: '#2E7D32' },
      { label: '赭黄', value: '#B45309' },
      { label: '莓紫', value: '#6D28D9' },
      { label: '湖蓝', value: '#0EA5E9' },
    ] as const;

    const showFloating =
      this.state.focused &&
      this.state.selectionStart !== this.state.selectionEnd &&
      !this.state.draggingSelection &&
      this.state.selectionFromDrag;
    const selectionViewportRect = showFloating
      ? (this.editorRef?.getSelectionViewportRectForOverlay() ?? null)
      : null;

    const floatingToolbar = (() => {
      if (!showFloating || !selectionViewportRect) {
        return null;
      }

      const buttonSize = 28;
      const spacing = 8;
      const paddingX = 8;
      const paddingY = 8;
      const fontSizeW = 56;
      const fontFamilyW = 96;
      const itemCount = 2 + 2 + 1;
      const toolbarW =
        buttonSize * 2 +
        fontSizeW +
        fontFamilyW +
        buttonSize +
        Math.max(0, itemCount - 1) * spacing +
        paddingX * 2;
      const toolbarH = buttonSize + paddingY * 2;
      const editorPadding = 12;
      const areaW = 300 - editorPadding * 2;
      const areaH = 150 - editorPadding * 2;

      let left = selectionViewportRect.left;
      let top = selectionViewportRect.top - toolbarH - 8;
      if (top < 0) {
        top = selectionViewportRect.top + selectionViewportRect.height + 8;
      }
      left = Math.max(0, Math.min(areaW - toolbarW, left));
      top = Math.max(0, Math.min(areaH - toolbarH, top));

      return (
        <Positioned left={left} top={top} zIndex={10}>
          <RichTextToolbar
            theme={theme}
            editor={this.editorRef}
            variant="selection"
            colorPresets={colorPresets}
          />
        </Positioned>
      );
    })();

    return (
      <Column spacing={10} crossAxisAlignment={CrossAxisAlignment.Start}>
        <Text text="富文本编辑器 (RichText)" fontSize={16} color={theme.text.secondary} />
        <Container
          width={300}
          height={150}
          border={{ color: borderColor, width: 1 }}
          borderRadius={4}
          color={theme.background.container}
        >
          <Padding padding={12}>
            <Stack>
              <RichTextEditor
                key="rich-editor"
                ref={(r) => (this.editorRef = r as RichTextEditor)}
                value={textValue}
                onChange={(nextText) => {
                  if (typeof value === 'string') {
                    onChange(nextText);
                    return;
                  }
                  onChange({ ...value, text: nextText, spans: undefined });
                }}
                onSelectionChange={(a, b) => {
                  const dragging =
                    (this.editorRef as unknown as { isDragging?: boolean } | null)?.isDragging ===
                    true;
                  const selectionChanged =
                    a !== this.state.selectionStart || b !== this.state.selectionEnd;
                  this.setState({
                    selectionStart: a,
                    selectionEnd: b,
                    draggingSelection: dragging && a !== b,
                    selectionFromDrag:
                      a === b
                        ? false
                        : dragging
                          ? false
                          : selectionChanged
                            ? false
                            : this.state.selectionFromDrag,
                  });
                  this.emitSelectionInfo();
                }}
                onSelectionDragEnd={() => {
                  const a = this.state.selectionStart;
                  const b = this.state.selectionEnd;
                  this.setState({
                    draggingSelection: false,
                    selectionFromDrag: a !== b,
                  });
                  this.emitSelectionInfo();
                }}
                onFocus={() => {
                  this.setState({ focused: true, draggingSelection: false });
                  this.emitSelectionInfo();
                }}
                onBlur={() => {
                  this.setState({
                    focused: false,
                    draggingSelection: false,
                    selectionFromDrag: false,
                  });
                  this.emitSelectionInfo();
                }}
                color={theme.text.primary}
                fontSize={14}
                lineHeight={24}
                selectionColor={theme.state.focus}
                cursorColor={theme.text.primary}
                placeholder="请输入富文本内容"
              />
              {floatingToolbar}
            </Stack>
          </Padding>
        </Container>
        <Container width={300}>
          <Text text={`字符数: ${textValue.length}`} fontSize={12} color={theme.text.placeholder} />
        </Container>
      </Column>
    );
  }
}
