import { Overflow, type TextProps } from '../text';

import type { BoxConstraints } from '../type';

// Duplicate DefaultStyle values to avoid export issues and circular deps
const DefaultTextStyle = {
  fontSize: 12,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal',
  lineHeight: undefined,
};

export interface TextLine {
  text: string;
  width: number;
  startIndex: number;
  endIndex: number;
}

export interface TextLayoutResult {
  width: number;
  height: number;
  lines: TextLine[];
  ascent: number;
  descent: number;
  lineHeight: number;
}

export class TextLayout {
  private static measureCanvas: HTMLCanvasElement | null = null;
  private static get measureCtx(): CanvasRenderingContext2D | null {
    if (typeof document === 'undefined') {
      return null;
    }
    if (!TextLayout.measureCanvas) {
      TextLayout.measureCanvas = document.createElement('canvas');
    }
    return TextLayout.measureCanvas.getContext('2d');
  }

  static layout(text: string, style: TextProps, constraints: BoxConstraints): TextLayoutResult {
    const fontSize = style.fontSize || DefaultTextStyle.fontSize;
    const rawLineHeight = style.lineHeight ?? style.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);
    const fontFamily = style.fontFamily || DefaultTextStyle.fontFamily;
    const fontWeight = style.fontWeight || DefaultTextStyle.fontWeight;
    const maxWidth = constraints.maxWidth;
    const maxLines = style.maxLines || Infinity;

    const ctx = TextLayout.measureCtx;

    if (!ctx) {
      return TextLayout.layoutEstimate(text, style, constraints);
    }

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const m = ctx.measureText(text);
    const ascent = m.actualBoundingBoxAscent ?? fontSize * 0.8;
    const descent = m.actualBoundingBoxDescent ?? fontSize * 0.2;
    const textWidth = m.width;

    const lines: TextLine[] = [];

    // Optimization: Single line fits
    if (maxWidth === Infinity || textWidth <= maxWidth) {
      lines.push({
        text,
        width: textWidth,
        startIndex: 0,
        endIndex: text.length,
      });
      return {
        width: Math.max(
          constraints.minWidth,
          Math.min(textWidth, maxWidth === Infinity ? textWidth : maxWidth),
        ),
        height: Math.max(constraints.minHeight, lineHeightPx),
        lines,
        ascent,
        descent,
        lineHeight: lineHeightPx,
      };
    }

    // Character-based wrapping (like break-word / pre-wrap) to preserve spaces
    // This is a simplified implementation for TextInput
    let currentLine = '';
    let currentLineStartIndex = 0;
    let currentWidth = 0;
    let i = 0;

    while (i < text.length && lines.length < maxLines) {
      const char = text[i];

      if (char === '\n') {
        lines.push({
          text: currentLine + char,
          width: currentWidth,
          startIndex: currentLineStartIndex,
          endIndex: currentLineStartIndex + currentLine.length + 1,
        });
        currentLineStartIndex += currentLine.length + 1;
        currentLine = '';
        currentWidth = 0;
        i++;
        continue;
      }

      const charWidth = ctx.measureText(char).width;

      if (currentWidth + charWidth <= maxWidth) {
        currentLine += char;
        currentWidth += charWidth;
        i++;
      } else {
        // Wrap
        lines.push({
          text: currentLine,
          width: currentWidth,
          startIndex: currentLineStartIndex,
          endIndex: currentLineStartIndex + currentLine.length,
        });
        currentLineStartIndex += currentLine.length;
        currentLine = char;
        currentWidth = charWidth;
        i++;
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push({
        text: currentLine,
        width: currentWidth,
        startIndex: currentLineStartIndex,
        endIndex: currentLineStartIndex + currentLine.length,
      });
    }

    // Ellipsis handling
    if (lines.length >= maxLines && style.overflow === Overflow.Ellipsis) {
      const lastIndex = lines.length - 1;
      let lastLine = lines[lastIndex].text;
      while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 0) {
        lastLine = lastLine.slice(0, -1);
      }
      lines[lastIndex].text = lastLine + '...';
      lines[lastIndex].width = ctx.measureText(lines[lastIndex].text).width;
    }

    return {
      width: maxWidth,
      height: Math.max(constraints.minHeight, lines.length * lineHeightPx),
      lines,
      ascent,
      descent,
      lineHeight: lineHeightPx,
    };
  }

  static layoutEstimate(
    text: string,
    style: TextProps,
    constraints: BoxConstraints,
  ): TextLayoutResult {
    const fontSize = style.fontSize || DefaultTextStyle.fontSize;
    const lineHeight = Math.max(fontSize, style.lineHeight ?? style.height ?? fontSize);
    const avgCharWidth = fontSize * 0.6;
    const maxWidth = constraints.maxWidth;
    const lines: TextLine[] = [];

    if (maxWidth === Infinity || text.length * avgCharWidth <= maxWidth) {
      lines.push({ text, width: text.length * avgCharWidth, startIndex: 0, endIndex: text.length });
    } else {
      const charsPerLine = Math.max(1, Math.floor(maxWidth / avgCharWidth));
      for (let i = 0; i < text.length; i += charsPerLine) {
        const sub = text.substr(i, charsPerLine);
        lines.push({
          text: sub,
          width: sub.length * avgCharWidth,
          startIndex: i,
          endIndex: i + sub.length,
        });
      }
    }

    return {
      width: maxWidth === Infinity ? text.length * avgCharWidth : maxWidth,
      height: lines.length * lineHeight,
      lines,
      ascent: fontSize * 0.8,
      descent: fontSize * 0.2,
      lineHeight,
    };
  }

  static getIndexForOffset(layout: TextLayoutResult, offset: { dx: number; dy: number }): number {
    const lineIndex = Math.min(
      layout.lines.length - 1,
      Math.max(0, Math.floor(offset.dy / layout.lineHeight)),
    );
    const line = layout.lines[lineIndex];
    if (!line) {
      return 0;
    }

    const ctx = TextLayout.measureCtx;
    if (!ctx) {
      return line.startIndex;
    }

    let currentWidth = 0;
    for (let i = 0; i < line.text.length; i++) {
      const charWidth = ctx.measureText(line.text[i]).width;
      if (currentWidth + charWidth / 2 > offset.dx) {
        return line.startIndex + i;
      }
      currentWidth += charWidth;
    }
    return line.endIndex;
  }

  static getOffsetForIndex(
    layout: TextLayoutResult,
    index: number,
  ): { dx: number; dy: number; height: number } {
    let lineIndex = 0;
    let line: TextLine | undefined;

    for (let i = 0; i < layout.lines.length; i++) {
      // Use loose comparison to catch end of line cursor
      if (index >= layout.lines[i].startIndex && index <= layout.lines[i].endIndex) {
        lineIndex = i;
        line = layout.lines[i];
        // If index is exactly endIndex, prefer this line unless it's wrapped?
        // Standard behavior: if wrap happened, endIndex of line N is startIndex of line N+1.
        // We need to decide where cursor goes. Usually it stays on line N if it's after the last char,
        // but if it's before first char of next line, it's line N+1.
        // Since we store startIndex inclusive, endIndex exclusive (or inclusive?), let's check.
        // Code: endIndex = startIndex + length. So endIndex is exclusive.
        // So if index == endIndex, it technically belongs to next line start.
        // BUT if it is the very end of text, it belongs to last line.
        if (index === line.endIndex && i < layout.lines.length - 1) {
          // check if next line starts at index
          if (layout.lines[i + 1].startIndex === index) {
            continue; // check next line
          }
        }
        break;
      }
    }

    if (!line) {
      lineIndex = layout.lines.length - 1;
      line = layout.lines[lineIndex];
    }

    if (!line) {
      return { dx: 0, dy: 0, height: layout.lineHeight };
    }

    const ctx = TextLayout.measureCtx;
    const sub = line.text.substring(0, Math.max(0, index - line.startIndex));
    const dx = ctx ? ctx.measureText(sub).width : 0;

    return {
      dx,
      dy: lineIndex * layout.lineHeight,
      height: layout.lineHeight,
    };
  }
}
