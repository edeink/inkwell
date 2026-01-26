/** @jsxImportSource @/utils/compiler */

/**
 * 文件用途：RichTextEditor 富文本编辑器（Widget）。
 * 主要功能：
 * - 基于 Editable 基类复用输入捕获、选区与光标逻辑
 * - 用 RichText/Text 进行按字符渲染，支持粗体/斜体/颜色/字号/字体
 * - 对外提供 caret/selection 的 clientRect，用于浮动工具栏定位
 */
import type { Widget } from '@/core/base';
import type { AnyElement } from '@/utils/compiler/jsx-compiler';

import {
  Column,
  Container,
  CrossAxisAlignment,
  Positioned,
  RichText,
  ScrollView,
  Stack,
  Text,
  type InkwellEvent,
} from '@/core';
import { Editable, type EditableProps } from '@/core/editable/base';
import { Themes } from '@/styles/theme';

export interface RichSelectionInfo {
  selectionStart: number;
  selectionEnd: number;
  focused: boolean;
  caretClientRect: { left: number; top: number; width: number; height: number } | null;
  selectionClientRect: { left: number; top: number; width: number; height: number } | null;
}

/**
 * 富文本 span 的样式描述（按区间应用）。
 */
export type RichTextSpanStyle = {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
};

/**
 * 富文本样式区间：以 [start, end) 表示作用范围。
 */
export type RichTextSpan = {
  start: number;
  end: number;
  style: RichTextSpanStyle;
};

/**
 * 富文本文档模型：text 为纯文本，spans 为可选样式区间。
 */
export type RichTextDoc = {
  text: string;
  spans?: ReadonlyArray<RichTextSpan>;
};

type RichStyle = {
  bold: boolean;
  italic: boolean;
  color: string;
  fontSize: number;
  fontFamily: string;
};

type RichCharRect = { x: number; y: number; width: number; height: number };

type RichLineItem = { gi: number; rect: RichCharRect };

type RichVisualLine = { y: number; height: number; items: RichLineItem[] };

type RichDocSnapshot = {
  text: string;
  styles: RichStyle[];
  typingBold: boolean;
  typingItalic: boolean;
  typingColor: string;
  typingFontSize: number;
  typingFontFamily: string;
  selectionStart: number;
  selectionEnd: number;
  caretAffinity?: 'start' | 'end';
};

export interface RichTextEditorProps extends EditableProps {
  color?: string;
  onSelectionDragEnd?: () => void;
}

/**
 * RichTextEditor：富文本编辑器核心（Widget）。
 *
 * 设计目标：
 * - 输入/选区/光标/快捷键复用 Editable 基类（隐藏 textarea 捕获输入）
 * - 渲染侧使用 RichText + Text（按字符拆分）实现最小可用的样式（粗体/斜体/颜色）
 * - 支持选区工具栏所需的 caret/selection clientRect 计算
 *
 * 性能约束：
 * - build/render 阶段尽量避免额外分配；字符级 Text 用缓存数组承接 ref
 */
export class RichTextEditor extends Editable<RichTextEditorProps> {
  private charWidgets: Array<Text | null> = [];
  private visibleGlobalIndices: number[] = [];
  private globalToVisible: number[] = [];
  private styles: RichStyle[] = [];
  private undoStack: RichDocSnapshot[] = [];
  private redoStack: RichDocSnapshot[] = [];
  private preferredCursorX: number | null = null;
  private emptyLineWidgets: Array<Text | null> = [];
  private emptyLineStartIndices: number[] = [];
  private didDragSelection: boolean = false;

  constructor(props: RichTextEditorProps) {
    super(props);
    this.state = {
      ...this.state,
      formatVersion: 0,
      typingBold: false,
      typingItalic: false,
      typingColor: props.color ?? '#000000',
      typingFontSize: props.fontSize ?? 14,
      typingFontFamily: props.fontFamily ?? 'Arial, sans-serif',
    };
    this.syncStylesForNewText(
      props.value,
      props.color ?? '#000000',
      props.fontSize ?? 14,
      props.fontFamily ?? 'Arial, sans-serif',
    );
    this.initEditable();
  }

  createElement(data: RichTextEditorProps) {
    if (data.value !== this.state.text) {
      this.syncStylesForNewText(
        data.value,
        data.color ?? '#000000',
        (this.state.typingFontSize as number) ?? data.fontSize ?? 14,
        (this.state.typingFontFamily as string) ?? data.fontFamily ?? 'Arial, sans-serif',
      );
      this.state = {
        ...this.state,
        text: data.value,
        selectionStart: Math.min(this.state.selectionStart, data.value.length),
        selectionEnd: Math.min(this.state.selectionEnd, data.value.length),
      };
    }
    const nextTypingColor = (data.color ?? '#000000') as string;
    if (this.state.typingColor !== nextTypingColor) {
      this.state = { ...this.state, typingColor: nextTypingColor };
    }
    super.createElement(data);
    return this;
  }

  protected createDomInput(): HTMLTextAreaElement {
    return document.createElement('textarea');
  }

  focusDomInput() {
    this.input?.focus();
  }

  restoreSelectionRange(selectionStart: number, selectionEnd: number) {
    const textLen = this.state.text.length;
    const a = Math.max(0, Math.min(selectionStart, textLen));
    const b = Math.max(0, Math.min(selectionEnd, textLen));
    this.setState({ selectionStart: a, selectionEnd: b, caretAffinity: undefined });
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    const dir = a > b ? 'backward' : 'forward';
    this.setDomSelectionRange(start, end, dir);
    this.props.onSelectionChange?.(a, b);
  }

  toggleBoldForTyping() {
    this.setState({ typingBold: !this.state.typingBold });
  }

  toggleItalicForTyping() {
    this.setState({ typingItalic: !this.state.typingItalic });
  }

  setColorForTyping(color: string) {
    this.setState({ typingColor: color });
  }

  setFontSizeForTyping(fontSize: number) {
    this.setState({ typingFontSize: fontSize });
  }

  setFontFamilyForTyping(fontFamily: string) {
    this.setState({ typingFontFamily: fontFamily });
  }

  getTypingFontSize(): number {
    return (this.state.typingFontSize as number) || this.props.fontSize || 14;
  }

  getTypingFontFamily(): string {
    return (this.state.typingFontFamily as string) || this.props.fontFamily || 'Arial, sans-serif';
  }

  getTypingBold(): boolean {
    return Boolean(this.state.typingBold);
  }

  getTypingItalic(): boolean {
    return Boolean(this.state.typingItalic);
  }

  getTypingColor(): string {
    return String(this.state.typingColor || this.props.color || '#000000');
  }

  getBoldForSelection(): boolean | null {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return null;
    }
    let hasTrue = false;
    let hasFalse = false;
    for (let i = start; i < end; i++) {
      const v = !!this.styles[i]?.bold;
      if (v) {
        hasTrue = true;
      } else {
        hasFalse = true;
      }
      if (hasTrue && hasFalse) {
        return null;
      }
    }
    return hasTrue;
  }

  getItalicForSelection(): boolean | null {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return null;
    }
    let hasTrue = false;
    let hasFalse = false;
    for (let i = start; i < end; i++) {
      const v = !!this.styles[i]?.italic;
      if (v) {
        hasTrue = true;
      } else {
        hasFalse = true;
      }
      if (hasTrue && hasFalse) {
        return null;
      }
    }
    return hasTrue;
  }

  getColorForSelection(): string | null {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return null;
    }
    const v = this.styles[start]?.color;
    if (typeof v !== 'string') {
      return null;
    }
    for (let i = start + 1; i < end; i++) {
      if (this.styles[i]?.color !== v) {
        return null;
      }
    }
    return v;
  }

  toggleBoldForSelection() {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return;
    }
    this.pushUndoSnapshot();
    const next = !this.isRangeAllBold(start, end);
    for (let i = start; i < end; i++) {
      const s = this.styles[i];
      if (s) {
        s.bold = next;
      }
    }
    this.bumpFormatVersion();
  }

  toggleItalicForSelection() {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return;
    }
    this.pushUndoSnapshot();
    const next = !this.isRangeAllItalic(start, end);
    for (let i = start; i < end; i++) {
      const s = this.styles[i];
      if (s) {
        s.italic = next;
      }
    }
    this.bumpFormatVersion();
  }

  setColorForSelection(color: string) {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return;
    }
    this.pushUndoSnapshot();
    for (let i = start; i < end; i++) {
      const s = this.styles[i];
      if (s) {
        s.color = color;
      }
    }
    this.bumpFormatVersion();
  }

  setFontSizeForSelection(fontSize: number) {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return;
    }
    this.pushUndoSnapshot();
    for (let i = start; i < end; i++) {
      const s = this.styles[i];
      if (s) {
        s.fontSize = fontSize;
      }
    }
    this.bumpFormatVersion();
  }

  setFontFamilyForSelection(fontFamily: string) {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return;
    }
    this.pushUndoSnapshot();
    for (let i = start; i < end; i++) {
      const s = this.styles[i];
      if (s) {
        s.fontFamily = fontFamily;
      }
    }
    this.bumpFormatVersion();
  }

  applyInitialSpans(spans: ReadonlyArray<RichTextSpan> | null | undefined) {
    if (!spans || spans.length === 0) {
      return;
    }
    const textLen = this.state.text.length;
    if (textLen <= 0) {
      return;
    }

    for (let si = 0; si < spans.length; si++) {
      const span = spans[si];
      if (!span || !span.style) {
        continue;
      }

      let start = span.start | 0;
      let end = span.end | 0;
      if (start > end) {
        const t = start;
        start = end;
        end = t;
      }
      if (end <= 0 || start >= textLen) {
        continue;
      }
      if (start < 0) {
        start = 0;
      }
      if (end > textLen) {
        end = textLen;
      }
      if (start === end) {
        continue;
      }

      const style = span.style;
      const hasBold = typeof style.bold === 'boolean';
      const hasItalic = typeof style.italic === 'boolean';
      const hasColor = typeof style.color === 'string';
      const hasFontSize = typeof style.fontSize === 'number';
      const hasFontFamily = typeof style.fontFamily === 'string';
      if (!hasBold && !hasItalic && !hasColor && !hasFontSize && !hasFontFamily) {
        continue;
      }

      for (let i = start; i < end; i++) {
        const s = this.styles[i];
        if (!s) {
          continue;
        }
        if (hasBold) {
          s.bold = style.bold as boolean;
        }
        if (hasItalic) {
          s.italic = style.italic as boolean;
        }
        if (hasColor) {
          s.color = style.color as string;
        }
        if (hasFontSize) {
          s.fontSize = style.fontSize as number;
        }
        if (hasFontFamily) {
          s.fontFamily = style.fontFamily as string;
        }
      }
    }

    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.bumpFormatVersion();
  }

  getFontSizeForSelection(): number | null {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return null;
    }
    const v = this.styles[start]?.fontSize;
    if (typeof v !== 'number') {
      return null;
    }
    for (let i = start + 1; i < end; i++) {
      if (this.styles[i]?.fontSize !== v) {
        return null;
      }
    }
    return v;
  }

  getFontFamilyForSelection(): string | null {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return null;
    }
    const v = this.styles[start]?.fontFamily;
    if (typeof v !== 'string') {
      return null;
    }
    for (let i = start + 1; i < end; i++) {
      if (this.styles[i]?.fontFamily !== v) {
        return null;
      }
    }
    return v;
  }

  getCaretClientRect(): { left: number; top: number; width: number; height: number } | null {
    const vr = this.getCaretViewportRect();
    if (!vr) {
      return null;
    }
    const canvasRect = this.getCanvasClientRect();
    if (!canvasRect) {
      return null;
    }
    const abs = this.getAbsolutePosition();
    return {
      left: canvasRect.left + abs.dx + vr.left,
      top: canvasRect.top + abs.dy + vr.top,
      width: vr.width,
      height: vr.height,
    };
  }

  getSelectionClientRect(): { left: number; top: number; width: number; height: number } | null {
    const vr = this.getSelectionViewportRect();
    if (!vr) {
      return null;
    }
    const canvasRect = this.getCanvasClientRect();
    if (!canvasRect) {
      return null;
    }
    const abs = this.getAbsolutePosition();
    return {
      left: canvasRect.left + abs.dx + vr.left,
      top: canvasRect.top + abs.dy + vr.top,
      width: vr.width,
      height: vr.height,
    };
  }

  getRichSelectionInfo(): RichSelectionInfo {
    return {
      selectionStart: this.state.selectionStart,
      selectionEnd: this.state.selectionEnd,
      focused: this.state.focused,
      caretClientRect: this.getCaretClientRect(),
      selectionClientRect: this.getSelectionClientRect(),
    };
  }

  protected override handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    const prev = this.state.text;
    const next = target.value;
    if (prev !== next) {
      this.pushUndoSnapshot();
      this.applyTextDiff(prev, next);
      this.redoStack.length = 0;
    }
    super.handleInput(e);
  }

  protected override handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      this.redo();
      return;
    }

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

    const caret = this.getCaretInfoAtIndex(this.state.selectionEnd);
    const caretW = 2;
    const padding = 8;

    const { contentW, contentH } = this.getContentExtent();
    const maxScrollX = Math.max(0, contentW - viewportW);
    const maxScrollY = Math.max(0, contentH - viewportH);

    const caretLeft = caret.x;
    const caretRight = caret.x + caretW;
    const caretTop = caret.y;
    const caretBottom = caret.y + caret.height;

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

  protected getIndexAtContentPoint(contentX: number, contentY: number): number {
    const text = this.state.text;
    if (text.length === 0) {
      return 0;
    }
    const lines = this.buildVisualLines();
    if (lines.length === 0) {
      return 0;
    }

    const lineIndex = this.getClosestLineIndexByY(lines, contentY);
    const line = lines[lineIndex];
    const idx = this.getInsertionIndexAtXInLine(line, contentX);
    return Math.max(0, Math.min(text.length, idx));
  }

  protected override getCaretViewportRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    const sv = this.scrollViewRef;
    const cursor = this.getCaretInfoAtIndex(this.state.selectionEnd);
    const scrollX = sv ? sv.scrollX : 0;
    const scrollY = sv ? sv.scrollY : 0;
    return { left: cursor.x - scrollX, top: cursor.y - scrollY, width: 2, height: cursor.height };
  }

  getSelectionViewportRectForOverlay(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    return this.getSelectionViewportRect();
  }

  private getSelectionViewportRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    const { start, end } = this.getNormalizedSelection();
    if (start === end) {
      return null;
    }
    const sv = this.scrollViewRef;
    const scrollX = sv ? sv.scrollX : 0;
    const scrollY = sv ? sv.scrollY : 0;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = 0;
    let maxY = 0;

    for (let i = start; i < end; i++) {
      if (this.state.text[i] === '\n') {
        continue;
      }
      const rect = this.getCharRectByGlobalIndex(i);
      if (!rect) {
        continue;
      }
      minX = Math.min(minX, rect.x);
      minY = Math.min(minY, rect.y);
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }

    if (!isFinite(minX) || !isFinite(minY)) {
      return null;
    }

    return {
      left: minX - scrollX,
      top: minY - scrollY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private getContentExtent(): { contentW: number; contentH: number } {
    const text = this.state.text;
    const defaultFontSize = (this.state.typingFontSize as number) || this.props.fontSize || 14;
    const lineHeight = this.props.lineHeight ?? Math.round(defaultFontSize * 1.6);
    if (text.length === 0) {
      return { contentW: 0, contentH: lineHeight };
    }
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        continue;
      }
      const rect = this.getCharRectByGlobalIndex(i);
      if (!rect) {
        continue;
      }
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }
    return { contentW: maxX, contentH: Math.max(lineHeight, maxY) };
  }

  private getCaretInfoAtIndex(index: number): { x: number; y: number; height: number } {
    const defaultFontSize = (this.state.typingFontSize as number) || this.props.fontSize || 14;
    const lineHeight = this.props.lineHeight ?? Math.round(defaultFontSize * 1.6);
    const text = this.state.text;
    const i = Math.max(0, Math.min(index, text.length));
    if (text.length === 0) {
      return { x: 0, y: 0, height: lineHeight };
    }

    const emptyRect = this.getEmptyLineRectAtIndex(i);
    if (emptyRect) {
      return { x: 0, y: emptyRect.y, height: emptyRect.height };
    }

    if (i >= text.length) {
      for (let p = text.length - 1; p >= 0; p--) {
        if (text[p] === '\n') {
          continue;
        }
        const rect = this.getCharRectByGlobalIndex(p);
        if (rect) {
          return { x: rect.x + rect.width, y: rect.y, height: rect.height };
        }
      }
      return { x: 0, y: 0, height: lineHeight };
    }

    if (text[i] === '\n') {
      const rectAtNewline = this.getEmptyLineRectAtIndex(i);
      if (rectAtNewline) {
        return { x: 0, y: rectAtNewline.y, height: rectAtNewline.height };
      }
      for (let p = i - 1; p >= 0; p--) {
        if (text[p] === '\n') {
          break;
        }
        const rect = this.getCharRectByGlobalIndex(p);
        if (rect) {
          return { x: rect.x + rect.width, y: rect.y, height: rect.height };
        }
      }
      const next = this.findNextVisibleCharRect(i + 1);
      if (next) {
        return { x: 0, y: next.y, height: next.height };
      }
      return { x: 0, y: 0, height: lineHeight };
    }

    const rect = this.getCharRectByGlobalIndex(i);
    if (rect) {
      return { x: rect.x, y: rect.y, height: rect.height };
    }
    return { x: 0, y: 0, height: lineHeight };
  }

  private findNextVisibleCharRect(fromGlobalIndex: number) {
    for (let i = fromGlobalIndex; i < this.state.text.length; i++) {
      if (this.state.text[i] === '\n') {
        continue;
      }
      const rect = this.getCharRectByGlobalIndex(i);
      if (rect) {
        return rect;
      }
    }
    return null;
  }

  private getCharRectByGlobalIndex(globalIndex: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    const vi = this.globalToVisible[globalIndex] ?? -1;
    if (vi < 0) {
      return null;
    }
    const w = this.charWidgets[vi];
    if (!w || !w.renderObject) {
      return null;
    }
    const off = this.getOffsetToSelf(w as unknown as Widget);
    if (!off) {
      return null;
    }
    const size = w.renderObject.size;
    return { x: off.dx, y: off.dy, width: size.width, height: size.height };
  }

  private getOffsetToSelf(w: Widget | null): { dx: number; dy: number } | null {
    if (!w || !w.renderObject) {
      return null;
    }
    let dx = 0;
    let dy = 0;
    let cur: Widget | null = w;
    while (cur && cur !== (this as unknown as Widget)) {
      if (!cur.renderObject) {
        return null;
      }
      dx += cur.renderObject.offset.dx;
      dy += cur.renderObject.offset.dy;
      cur = cur.parent as Widget | null;
    }
    if (cur !== (this as unknown as Widget)) {
      return null;
    }
    return { dx, dy };
  }

  private cloneStyles(styles: RichStyle[]): RichStyle[] {
    const next: RichStyle[] = new Array(styles.length);
    for (let i = 0; i < styles.length; i++) {
      const s = styles[i];
      next[i] = {
        bold: s.bold,
        italic: s.italic,
        color: s.color,
        fontSize: s.fontSize,
        fontFamily: s.fontFamily,
      };
    }
    return next;
  }

  private takeSnapshot(): RichDocSnapshot {
    return {
      text: this.state.text,
      styles: this.cloneStyles(this.styles),
      typingBold: Boolean(this.state.typingBold),
      typingItalic: Boolean(this.state.typingItalic),
      typingColor: String(this.state.typingColor || '#000000'),
      typingFontSize: Number(this.state.typingFontSize || this.props.fontSize || 14),
      typingFontFamily: String(
        this.state.typingFontFamily || this.props.fontFamily || 'Arial, sans-serif',
      ),
      selectionStart: this.state.selectionStart,
      selectionEnd: this.state.selectionEnd,
      caretAffinity: this.state.caretAffinity as 'start' | 'end' | undefined,
    };
  }

  private pushUndoSnapshot() {
    this.undoStack.push(this.takeSnapshot());
    if (this.undoStack.length > 100) {
      this.undoStack.shift();
    }
  }

  private applySnapshot(s: RichDocSnapshot) {
    this.styles = this.cloneStyles(s.styles);
    const nextFormatVersion = (this.state.formatVersion as number) + 1;
    this.setState({
      text: s.text,
      selectionStart: Math.max(0, Math.min(s.selectionStart, s.text.length)),
      selectionEnd: Math.max(0, Math.min(s.selectionEnd, s.text.length)),
      caretAffinity: s.caretAffinity,
      typingBold: s.typingBold,
      typingItalic: s.typingItalic,
      typingColor: s.typingColor,
      typingFontSize: s.typingFontSize,
      typingFontFamily: s.typingFontFamily,
      formatVersion: nextFormatVersion,
    });
    if (this.input) {
      this.input.value = s.text;
      const start = Math.min(s.selectionStart, s.selectionEnd);
      const end = Math.max(s.selectionStart, s.selectionEnd);
      const dir = s.selectionStart > s.selectionEnd ? 'backward' : 'forward';
      this.setDomSelectionRange(start, end, dir);
    }
    this.props.onChange?.(s.text);
    this.props.onSelectionChange?.(s.selectionStart, s.selectionEnd);
    this.scheduleEnsureCursorVisible();
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) {
      return false;
    }
    this.redoStack.push(this.takeSnapshot());
    this.applySnapshot(prev);
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) {
      return false;
    }
    this.undoStack.push(this.takeSnapshot());
    this.applySnapshot(next);
    return true;
  }

  private getEmptyLineRectAtIndex(
    index: number,
  ): { x: number; y: number; width: number; height: number } | null {
    const start = index;
    for (let i = 0; i < this.emptyLineStartIndices.length; i++) {
      if (this.emptyLineStartIndices[i] !== start) {
        continue;
      }
      const w = this.emptyLineWidgets[i];
      if (!w || !w.renderObject) {
        return null;
      }
      const off = this.getOffsetToSelf(w as unknown as Widget);
      if (!off) {
        return null;
      }
      const size = w.renderObject.size;
      return { x: off.dx, y: off.dy, width: size.width, height: size.height };
    }
    return null;
  }

  private buildVisualLines(): RichVisualLine[] {
    const items: RichLineItem[] = [];

    for (let vi = 0; vi < this.visibleGlobalIndices.length; vi++) {
      const gi = this.visibleGlobalIndices[vi] ?? -1;
      if (gi < 0) {
        continue;
      }
      const rect = this.getCharRectByGlobalIndex(gi);
      if (!rect) {
        continue;
      }
      items.push({ gi, rect });
    }

    for (let i = 0; i < this.emptyLineStartIndices.length; i++) {
      const start = this.emptyLineStartIndices[i] ?? -1;
      if (start < 0) {
        continue;
      }
      const w = this.emptyLineWidgets[i];
      if (!w || !w.renderObject) {
        continue;
      }
      const off = this.getOffsetToSelf(w as unknown as Widget);
      if (!off) {
        continue;
      }
      const size = w.renderObject.size;
      items.push({
        gi: start,
        rect: { x: off.dx, y: off.dy, width: size.width, height: size.height },
      });
    }

    items.sort((a, b) => (a.rect.y === b.rect.y ? a.rect.x - b.rect.x : a.rect.y - b.rect.y));

    const lines: RichVisualLine[] = [];
    const yThreshold = 1;
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (!last) {
        lines.push({ y: it.rect.y, height: it.rect.height, items: [it] });
        continue;
      }
      if (Math.abs(it.rect.y - last.y) > Math.max(yThreshold, it.rect.height * 0.5)) {
        lines.push({ y: it.rect.y, height: it.rect.height, items: [it] });
        continue;
      }
      last.items.push(it);
      last.height = Math.max(last.height, it.rect.height);
      last.y = Math.min(last.y, it.rect.y);
    }
    for (const l of lines) {
      l.items.sort((a, b) => a.rect.x - b.rect.x);
    }
    return lines;
  }

  private getClosestLineIndexByY(lines: Array<{ y: number; height: number }>, y: number): number {
    let best = 0;
    let bestDy = Number.POSITIVE_INFINITY;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const cy = l.y + l.height / 2;
      const dy = Math.abs(cy - y);
      if (dy < bestDy) {
        bestDy = dy;
        best = i;
      }
    }
    return best;
  }

  private getInsertionIndexAtXInLine(line: { items: RichLineItem[] }, x: number): number {
    if (line.items.length === 0) {
      return 0;
    }
    let last = line.items[0].gi;
    for (let i = 0; i < line.items.length; i++) {
      const it = line.items[i];
      const rect = it.rect;
      const midX = rect.x + rect.width / 2;
      if (x < midX) {
        return it.gi;
      }
      last = it.gi + 1;
    }
    return last;
  }

  private handleVerticalCursorMove(direction: 'up' | 'down', e: KeyboardEvent) {
    const caret = this.getCaretInfoAtIndex(this.state.selectionEnd);
    if (this.preferredCursorX === null) {
      this.preferredCursorX = caret.x;
    }
    const lines = this.buildVisualLines();
    if (lines.length === 0) {
      return;
    }
    const currentLineIndex = this.getClosestLineIndexByY(lines, caret.y + caret.height / 2);
    const targetLineIndex =
      direction === 'up'
        ? Math.max(0, currentLineIndex - 1)
        : Math.min(lines.length - 1, currentLineIndex + 1);
    if (targetLineIndex === currentLineIndex) {
      return;
    }
    const targetLine = lines[targetLineIndex];
    const newIndex = Math.max(
      0,
      Math.min(
        this.state.text.length,
        this.getInsertionIndexAtXInLine(targetLine, this.preferredCursorX),
      ),
    );

    if (e.shiftKey) {
      this.setState({
        selectionEnd: newIndex,
        caretAffinity: undefined,
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
        caretAffinity: undefined,
      });
      this.setDomSelectionRange(newIndex, newIndex);
    }
    this.scheduleEnsureCursorVisible();
  }

  private getNormalizedSelection(): { start: number; end: number } {
    const start = Math.max(0, Math.min(this.state.selectionStart, this.state.text.length));
    const end = Math.max(0, Math.min(this.state.selectionEnd, this.state.text.length));
    return start <= end ? { start, end } : { start: end, end: start };
  }

  private isRangeAllBold(start: number, end: number): boolean {
    for (let i = start; i < end; i++) {
      if (!this.styles[i]?.bold) {
        return false;
      }
    }
    return true;
  }

  private isRangeAllItalic(start: number, end: number): boolean {
    for (let i = start; i < end; i++) {
      if (!this.styles[i]?.italic) {
        return false;
      }
    }
    return true;
  }

  private bumpFormatVersion() {
    this.setState({ formatVersion: (this.state.formatVersion as number) + 1 });
  }

  private syncStylesForNewText(text: string, color: string, fontSize: number, fontFamily: string) {
    this.styles = new Array(text.length);
    for (let i = 0; i < text.length; i++) {
      this.styles[i] = { bold: false, italic: false, color, fontSize, fontFamily };
    }
  }

  private applyTextDiff(prev: string, next: string) {
    let prefix = 0;
    const minLen = Math.min(prev.length, next.length);
    while (prefix < minLen && prev[prefix] === next[prefix]) {
      prefix++;
    }

    let suffix = 0;
    while (
      suffix < minLen - prefix &&
      prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]
    ) {
      suffix++;
    }

    const removedCount = prev.length - prefix - suffix;
    const insertedCount = next.length - prefix - suffix;

    const typing: RichStyle = {
      bold: Boolean(this.state.typingBold),
      italic: Boolean(this.state.typingItalic),
      color: String(this.state.typingColor || '#000000'),
      fontSize: Number(this.state.typingFontSize || this.props.fontSize || 14),
      fontFamily: String(
        this.state.typingFontFamily || this.props.fontFamily || 'Arial, sans-serif',
      ),
    };

    const insertedStyles: RichStyle[] = [];
    for (let i = 0; i < insertedCount; i++) {
      insertedStyles.push({ ...typing });
    }

    this.styles.splice(prefix, removedCount, ...insertedStyles);
    if (this.styles.length < next.length) {
      const pad = (next.length - this.styles.length) as number;
      for (let i = 0; i < pad; i++) {
        this.styles.push({ ...typing });
      }
    } else if (this.styles.length > next.length) {
      this.styles.length = next.length;
    }

    this.bumpFormatVersion();
  }

  private handlePointerDownWithDragEnd = (e: InkwellEvent) => {
    this.didDragSelection = true;
    this.handlePointerDown(e);
  };

  private handlePointerUpWithDragEnd = (e: InkwellEvent) => {
    this.handlePointerUp(e);
    if (this.didDragSelection) {
      this.didDragSelection = false;
      this.props.onSelectionDragEnd?.();
    }
  };

  protected override beginSelectionHandleDrag(which: 'start' | 'end', e: InkwellEvent) {
    this.didDragSelection = true;
    super.beginSelectionHandleDrag(which, e);
  }

  protected override endSelectionHandleDrag() {
    super.endSelectionHandleDrag();
    if (this.didDragSelection) {
      this.didDragSelection = false;
      this.props.onSelectionDragEnd?.();
    }
  }

  render() {
    const theme = Themes.light;
    const {
      fontSize = 14,
      fontFamily = 'Arial, sans-serif',
      lineHeight = Math.round(fontSize * 1.6),
      color = '#000000',
      cursorColor = '#000000',
      placeholder,
      disabled,
    } = this.props;

    const { text, selectionStart, selectionEnd, focused, cursorVisible } = this.state;
    const resolvedSelectionColor = this.resolveSelectionColor();

    const nextVisibleGlobalIndices: number[] = [];
    const nextGlobalToVisible = new Array(text.length).fill(-1);
    const nextEmptyLineStartIndices: number[] = [];

    const showPlaceholder =
      text.length === 0 && typeof placeholder === 'string' && placeholder.length > 0;
    const placeholderColor = theme.text.placeholder;

    const paras: Array<{ start: number; text: string }> = [];
    let st = 0;
    for (let i = 0; i <= text.length; i++) {
      if (i === text.length || text[i] === '\n') {
        paras.push({ start: st, text: text.slice(st, i) });
        st = i + 1;
      }
    }

    const content = showPlaceholder ? (
      <Text
        text={placeholder}
        fontSize={fontSize}
        lineHeight={lineHeight}
        fontFamily={fontFamily}
        color={placeholderColor}
      />
    ) : (
      <Column spacing={0} crossAxisAlignment={CrossAxisAlignment.Start}>
        {paras.map((p, pi) => (
          <RichText key={`p-${pi}`} spacing={0} runSpacing={0} alignBaseline={true}>
            {p.text.length === 0 ? (
              <Text
                text={''}
                fontSize={fontSize}
                lineHeight={lineHeight}
                fontFamily={fontFamily}
                ref={(r) => {
                  const li = nextEmptyLineStartIndices.length;
                  if (nextEmptyLineStartIndices[li] !== p.start) {
                    nextEmptyLineStartIndices[li] = p.start;
                  }
                  this.emptyLineWidgets[li] = r as Text;
                }}
              />
            ) : (
              p.text.split('').map((ch, ci) => {
                const gi = p.start + ci;
                const s = this.styles[gi] ?? {
                  bold: false,
                  italic: false,
                  color,
                  fontSize,
                  fontFamily,
                };
                const charFontSize = s.fontSize ?? fontSize;
                const charFontFamily = s.fontFamily ?? fontFamily;
                const charLineHeight = Math.round(charFontSize * 1.6);
                const vi = nextVisibleGlobalIndices.length;
                nextVisibleGlobalIndices.push(gi);
                nextGlobalToVisible[gi] = vi;
                return (
                  <Text
                    key={`c-${gi}`}
                    ref={(r) => {
                      this.charWidgets[vi] = r as Text;
                    }}
                    text={ch}
                    fontSize={charFontSize}
                    lineHeight={charLineHeight}
                    fontFamily={charFontFamily}
                    fontWeight={s.bold ? 'bold' : 'normal'}
                    fontStyle={s.italic ? 'italic' : 'normal'}
                    color={s.color}
                  />
                );
              })
            )}
          </RichText>
        ))}
      </Column>
    );

    this.visibleGlobalIndices = nextVisibleGlobalIndices;
    this.globalToVisible = nextGlobalToVisible;
    this.emptyLineStartIndices = nextEmptyLineStartIndices;
    this.charWidgets.length = nextVisibleGlobalIndices.length;
    this.emptyLineWidgets.length = nextEmptyLineStartIndices.length;

    const selectionWidgets: AnyElement[] = [];
    if (selectionStart !== selectionEnd) {
      const { start, end } = this.getNormalizedSelection();
      const rects: { x: number; y: number; width: number; height: number }[] = [];
      for (let i = start; i < end; i++) {
        if (text[i] === '\n') {
          continue;
        }
        const rect = this.getCharRectByGlobalIndex(i);
        if (rect && rect.width > 0) {
          rects.push(rect);
        }
      }
      rects.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
      const merged: typeof rects = [];
      for (const r of rects) {
        const last = merged[merged.length - 1];
        if (
          last &&
          Math.abs(last.y - r.y) <= 0.5 &&
          Math.abs(last.height - r.height) <= 0.5 &&
          r.x <= last.x + last.width + 0.5
        ) {
          last.width = Math.max(last.width, r.x + r.width - last.x);
        } else {
          merged.push({ ...r });
        }
      }
      for (let i = 0; i < merged.length; i++) {
        const r = merged[i];
        selectionWidgets.push(
          <Positioned key={`sel-${i}`} left={r.x} top={r.y}>
            <Container width={r.width} height={r.height} color={resolvedSelectionColor} />
          </Positioned>,
        );
      }
    }

    const cursorInfo = this.getCaretInfoAtIndex(selectionEnd);
    const selectionStartCaret = this.getCaretInfoAtIndex(selectionStart);
    const selectionEndCaret = this.getCaretInfoAtIndex(selectionEnd);

    return (
      <Container
        onPointerDown={this.handlePointerDownWithDragEnd}
        onPointerMove={this.handlePointerMove}
        onPointerUp={this.handlePointerUpWithDragEnd}
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

            {content}

            {focused && selectionStart !== selectionEnd && !disabled && (
              <>
                <Positioned
                  left={selectionStartCaret.x}
                  top={selectionStartCaret.y + selectionStartCaret.height}
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
                  left={selectionEndCaret.x}
                  top={selectionEndCaret.y + selectionEndCaret.height}
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

            {focused && cursorVisible && selectionStart === selectionEnd && !disabled && (
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
