import { Overflow, type TextProps } from '../text';

import type { BoxConstraints } from '../type';

// 复制 DefaultStyle 的默认值，避免导出问题与循环依赖
const DefaultTextStyle = {
  fontSize: 14,
  fontFamily: 'Noto Sans SC, Noto Sans, -apple-system, BlinkMacSystemFont, Arial, sans-serif',
  fontWeight: 'normal',
  lineHeight: undefined,
};

/**
 * 单行文本的排版结果。
 *
 * - text：该行文本内容（可能包含换行符）
 * - width：该行渲染宽度（px）
 * - startIndex/endIndex：在原始字符串中的索引范围
 */
export interface TextLine {
  text: string;
  width: number;
  startIndex: number;
  endIndex: number;
}

/**
 * 文本排版结果。
 *
 * width/height 为最终占位尺寸；lines 为分行结果；ascent/descent 用于基线计算。
 */
export interface TextLayoutResult {
  width: number;
  height: number;
  lines: TextLine[];
  ascent: number;
  descent: number;
  lineHeight: number;
}

/**
 * 文本排版工具。
 *
 * 目前主要服务于 TextInput/TextArea 的测量、换行与光标定位。
 */
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

  /**
   * 计算文本在给定样式与约束下的排版结果。
   *
   * - 若运行环境不可用 Canvas（如 SSR），会退化为估算策略
   */
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

    // 优化：单行可容纳时直接返回
    if (!text.includes('\n') && (maxWidth === Infinity || textWidth <= maxWidth)) {
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

    // 基于字符的换行（接近 break-word / pre-wrap），用于保留空格与输入行为一致
    // 这是 TextInput 场景下的简化实现
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
        // 换行
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

    // 省略号处理
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

  /**
   * 在无法使用 Canvas 测量的环境中，基于平均字符宽度进行估算。
   */
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

  /**
   * 根据偏移（dx, dy）反推光标在字符串中的索引。
   */
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

  /**
   * 根据字符串索引反推光标的偏移（dx, dy）与光标高度。
   */
  static getOffsetForIndex(
    layout: TextLayoutResult,
    index: number,
  ): { dx: number; dy: number; height: number } {
    let lineIndex = 0;
    let line: TextLine | undefined;

    for (let i = 0; i < layout.lines.length; i++) {
      // 使用 <= 捕获“行尾光标”场景
      if (index >= layout.lines[i].startIndex && index <= layout.lines[i].endIndex) {
        lineIndex = i;
        line = layout.lines[i];
        // 当 index 恰好等于 endIndex 时，需要决定光标归属行：
        // - 换行导致 line N 的 endIndex == line N+1 的 startIndex
        // - 通常行为：若是换行点，光标更符合落到下一行行首
        // - 但若 index 是文本整体末尾，则应归属最后一行行尾
        if (index === line.endIndex && i < layout.lines.length - 1) {
          // 若下一行从该索引开始，则继续检查下一行
          if (layout.lines[i + 1].startIndex === index) {
            continue;
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
