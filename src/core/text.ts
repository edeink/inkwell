import { Widget } from './base';

import type { BoxConstraints, BuildContext, Size, WidgetProps } from './base';

export enum TextAlign {
  Left = 'left',
  Center = 'center',
  Right = 'right',
}

export enum TextAlignVertical {
  Top = 'top',
  Center = 'center',
  Bottom = 'bottom',
}

export enum Overflow {
  Clip = 'clip',
  Ellipsis = 'ellipsis',
  Fade = 'fade',
}

export enum TextBaseline {
  Top = 'top',
  Middle = 'middle',
  Bottom = 'bottom',
  Alphabetic = 'alphabetic',
}

export interface TextProps extends WidgetProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  height?: number;
  lineHeight?: number;
  textAlign?: TextAlign;
  textAlignVertical?: TextAlignVertical;
  maxLines?: number;
  overflow?: Overflow;
}

const DefaultStyle: {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  textBaseline: TextBaseline;
  textAlign: TextAlign;
  textAlignVertical: TextAlignVertical;
} = {
  fontSize: 12,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal',
  color: '#000000',
  textBaseline: TextBaseline.Alphabetic,
  textAlign: TextAlign.Left,
  textAlignVertical: TextAlignVertical.Center,
};

export interface TextLineMetrics {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  baseline: number;
  startIndex: number;
  endIndex: number;
  letterSpacing: number;
}

export class Text extends Widget<TextProps> {
  text: string = '';
  fontSize: number = 16;
  fontFamily: string = DefaultStyle.fontFamily;
  fontWeight: string | number = DefaultStyle.fontWeight;
  color: string = DefaultStyle.color;
  height?: number;
  lineHeight?: number;
  textAlign: TextAlign = DefaultStyle.textAlign;
  textAlignVertical: TextAlignVertical = DefaultStyle.textAlignVertical;
  maxLines?: number;
  overflow?: Overflow;

  private static measureCanvas: HTMLCanvasElement = document.createElement('canvas');
  private static measureCtx: CanvasRenderingContext2D = Text.measureCanvas.getContext('2d')!;

  protected createChildWidget(_childData: WidgetProps): Widget | null {
    void _childData;
    console.warn('Text 组件不支持子组件');
    return null;
  }

  private textMetrics: {
    width: number;
    height: number;
    lines?: string[];
    lineWidths?: number[];
    lineIndices?: { start: number; end: number }[];
    ascent: number;
    descent: number;
  } = { width: 0, height: 0, lines: [], lineWidths: [], lineIndices: [], ascent: 0, descent: 0 };

  get lines(): TextLineMetrics[] {
    const {
      lines,
      lineWidths,
      lineIndices,
      ascent,
      descent,
      height: contentHeight,
    } = this.textMetrics;
    if (!lines || lines.length === 0) {
      return [];
    }

    const size = this.renderObject
      ? this.renderObject.size
      : { width: this.textMetrics.width, height: this.textMetrics.height };
    const fontSize = this.fontSize || DefaultStyle.fontSize;
    const rawLineHeight = this.lineHeight ?? this.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);

    const vertical = this.textAlignVertical || TextAlignVertical.Top;
    const outerTopOffset =
      vertical === TextAlignVertical.Top
        ? 0
        : vertical === TextAlignVertical.Bottom
          ? Math.max(0, size.height - contentHeight)
          : Math.max(0, (size.height - contentHeight) / 2);

    const leadingTop = Math.max(0, lineHeightPx - (ascent + descent)) / 2;
    // 第一行的基准 Y 坐标（行框顶部，非基线）
    const startY = outerTopOffset;

    const horiz = this.textAlign || DefaultStyle.textAlign;

    return lines.map((text, i) => {
      const w = lineWidths?.[i] ?? 0;
      const indices = lineIndices?.[i] ?? { start: 0, end: 0 };

      let x = 0;
      if (horiz === TextAlign.Left) {
        x = 0;
      } else if (horiz === TextAlign.Center) {
        x = (size.width - w) / 2;
      } else if (horiz === TextAlign.Right) {
        x = size.width - w;
      }

      const lineTop = startY + i * lineHeightPx;
      const baseline = lineTop + leadingTop + ascent;

      return {
        text,
        x,
        y: lineTop,
        width: w,
        height: lineHeightPx,
        baseline,
        startIndex: indices.start,
        endIndex: indices.end,
        letterSpacing: 0,
      };
    });
  }

  constructor(data: TextProps) {
    super(data);
    this.initTextProperties(data);
  }

  private initTextProperties(data: TextProps): void {
    if (!data.text && data.text !== '') {
      console.warn('Text 组件必须提供 text 属性');
      this.text = '[缺少文本]';
    } else {
      this.text = data.text;
    }
    this.fontSize = (data.fontSize ?? this.fontSize) as number;
    this.fontFamily = (data.fontFamily ?? this.fontFamily) as string;
    this.fontWeight = (data.fontWeight ?? this.fontWeight) as string | number;
    this.color = (data.color ?? this.color) as string;
    this.height = (data.height ?? this.height) as number | undefined;
    this.lineHeight = (data.lineHeight ?? this.lineHeight) as number | undefined;
    this.textAlign = (data.textAlign ?? this.textAlign) as typeof this.textAlign;
    this.textAlignVertical = (data.textAlignVertical ??
      this.textAlignVertical) as typeof this.textAlignVertical;
    this.maxLines = (data.maxLines ?? this.maxLines) as number | undefined;
    this.overflow = (data.overflow ?? this.overflow) as typeof this.overflow;
  }

  createElement(data: TextProps): Widget<TextProps> {
    super.createElement(data);
    this.initTextProperties(data);
    return this;
  }

  private lastLayoutConstraints: BoxConstraints | null = null;
  private lastLayoutHash: string = '';

  private getLayoutHash(constraints: BoxConstraints): string {
    return (
      `${this.text}-${this.fontSize}-${this.fontFamily}-${this.fontWeight}-` +
      `${this.lineHeight}-${this.textAlign}-${this.textAlignVertical}-${this.maxLines}-` +
      `${this.overflow}-${constraints.minWidth}-${constraints.maxWidth}-` +
      `${constraints.minHeight}-${constraints.maxHeight}`
    );
  }

  private calculateTextMetrics(constraints: BoxConstraints): void {
    const hash = this.getLayoutHash(constraints);
    if (this.lastLayoutConstraints && this.lastLayoutHash === hash) {
      return;
    }
    this.lastLayoutHash = hash;
    this.lastLayoutConstraints = constraints;

    const fontSize = this.fontSize || DefaultStyle.fontSize;
    const rawLineHeight = this.lineHeight ?? this.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);
    const lines: string[] = [];
    const lineWidths: number[] = [];
    const lineIndices: { start: number; end: number }[] = [];
    const maxWidth = constraints.maxWidth;
    const ctx = Text.measureCtx;
    if (!ctx) {
      this.calculateTextMetricsEstimate(constraints);
      return;
    }
    const fontFamily = this.fontFamily || DefaultStyle.fontFamily;
    const fontWeight = this.fontWeight || DefaultStyle.fontWeight;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const m = ctx.measureText(this.text);
    const ascent = m.actualBoundingBoxAscent ?? fontSize * 0.8;
    const descent = m.actualBoundingBoxDescent ?? fontSize * 0.2;
    const textWidth = m.width;

    if (maxWidth === Infinity || textWidth <= maxWidth) {
      lines.push(this.text);
      lineWidths.push(textWidth);
      lineIndices.push({ start: 0, end: this.text.length });
      this.textMetrics = {
        width: Math.max(
          constraints.minWidth,
          Math.min(textWidth, maxWidth === Infinity ? textWidth : maxWidth),
        ),
        height: Math.max(constraints.minHeight, lineHeightPx),
        lines,
        lineWidths,
        lineIndices,
        ascent,
        descent,
      };
    } else {
      // 实现类似 word-wrap: break-word 的逻辑
      // 1. 按空格分割单词
      // 2. 尝试将单词放入当前行
      // 3. 如果单词过长（超过 maxWidth），则强制拆分单词
      const words = this.text.split(' ');
      let currentLine = '';
      let currentLineStart = 0;
      let charCursor = 0; // 记录原始文本中的位置

      const maxLines = this.maxLines || Infinity;

      for (let i = 0; i < words.length && lines.length < maxLines; i++) {
        const word = words[i];
        // 如果不是第一个单词，我们需要跳过一个空格
        if (i > 0) {
          charCursor++;
        }

        const wordStart = charCursor;
        charCursor += word.length;

        const spacing = currentLine ? ' ' : '';
        const testLine = currentLine + spacing + word;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          // 当前行已有内容，先换行
          if (currentLine) {
            lines.push(currentLine);
            lineWidths.push(ctx.measureText(currentLine).width);
            lineIndices.push({
              start: currentLineStart,
              end: currentLineStart + currentLine.length,
            });

            currentLine = '';
            // 新行从当前单词开始
            currentLineStart = wordStart;

            // 如果达到最大行数，停止
            if (lines.length >= maxLines) {
              break;
            }
          }

          // 检查单词本身是否超过 maxWidth
          const wordWidth = ctx.measureText(word).width;
          if (wordWidth <= maxWidth) {
            currentLine = word;
            currentLineStart = wordStart;
          } else {
            // 单词过长，需要强制拆分 (break-word)
            const chars = Array.from(word);
            let subLine = '';
            let subLineStart = wordStart;

            for (let j = 0; j < chars.length; j++) {
              const char = chars[j];
              const testSubLine = subLine + char;
              if (ctx.measureText(testSubLine).width <= maxWidth) {
                subLine = testSubLine;
              } else {
                lines.push(subLine);
                lineWidths.push(ctx.measureText(subLine).width);
                lineIndices.push({ start: subLineStart, end: subLineStart + subLine.length });

                subLine = char;
                // subLine 现在是单个字符，所以起始位置增加前一个 subLine 的长度
                // 更新 subLineStart 位置，加上前一个片段的长度
                subLineStart = subLineStart + (testSubLine.length - 1);

                if (lines.length >= maxLines) {
                  break;
                }
              }
            }
            if (lines.length < maxLines) {
              currentLine = subLine;
              currentLineStart = subLineStart;
            } else {
              // 已经达到最大行数，最后一部分被丢弃或用于 overflow 处理
              currentLine = subLine; // 暂存
            }
          }
        }
      }

      if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
        lineWidths.push(ctx.measureText(currentLine).width);
        lineIndices.push({ start: currentLineStart, end: currentLineStart + currentLine.length });
      }

      if (lines.length >= maxLines && this.overflow === 'ellipsis') {
        const lastLineIndex = maxLines - 1;
        // 简单处理：重新取最后一行内容并尝试截断
        let lastLine = lines[lastLineIndex];
        // 需要重新测量宽度并更新指标
        while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 0) {
          lastLine = lastLine.slice(0, -1);
        }
        lines[lastLineIndex] = lastLine + '...';
        lineWidths[lastLineIndex] = ctx.measureText(lines[lastLineIndex]).width;
        // 省略号截断时，简单更新结束索引，虽然无法精确映射到原始文本，但保持区间连续性
        // 我们不严格更新索引，因为这是视觉上的截断
        const originalEnd = lineIndices[lastLineIndex].end;
        // 尝试缩短范围
        lineIndices[lastLineIndex].end = lineIndices[lastLineIndex].start + lastLine.length;
      }

      this.textMetrics = {
        width: maxWidth,
        height: Math.max(constraints.minHeight, lines.length * lineHeightPx),
        lines,
        lineWidths,
        lineIndices,
        ascent,
        descent,
      };
    }
  }

  // 当不存在 canvsa 2d 上下文时，计算文本指标（估计值）
  private calculateTextMetricsEstimate(constraints: BoxConstraints): void {
    const fontSize = this.fontSize || DefaultStyle.fontSize;
    const rawLineHeight = this.lineHeight ?? this.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);
    const avgCharWidth = fontSize * 0.6;
    const lines: string[] = [];
    const maxWidth = constraints.maxWidth;
    const ascent = fontSize * 0.8;
    const descent = fontSize * 0.2;
    if (maxWidth === Infinity || this.text.length * avgCharWidth <= maxWidth) {
      lines.push(this.text);
      this.textMetrics = {
        width: Math.max(constraints.minWidth, Math.min(this.text.length * avgCharWidth, maxWidth)),
        height: Math.max(constraints.minHeight, lineHeightPx),
        lines,
        ascent,
        descent,
      };
    } else {
      // 计算每行字符数，确保至少为1，防止非法数组长度错误
      const charsPerLine = Math.max(1, Math.floor(maxWidth / avgCharWidth));
      let remainingText = this.text;
      const maxLines = this.maxLines || Infinity;
      while (remainingText.length > 0 && lines.length < maxLines) {
        let line = remainingText.substring(0, charsPerLine);
        if (
          lines.length === maxLines - 1 &&
          remainingText.length > charsPerLine &&
          this.overflow === Overflow.Ellipsis
        ) {
          line = line.substring(0, line.length - 3) + '...';
        }
        lines.push(line);
        remainingText = remainingText.substring(charsPerLine);
        if (lines.length >= maxLines) {
          break;
        }
      }
      this.textMetrics = {
        width: maxWidth,
        height: Math.max(constraints.minHeight, lines.length * lineHeightPx),
        lines,
        ascent,
        descent,
      };
    }
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.calculateTextMetrics(constraints);
    const size: Size = {
      width: this.textMetrics.width,
      height: this.textMetrics.height,
    };
    if (childrenSizes.length > 0) {
      console.warn('Text 组件不支持子组件，忽略所有子组件布局');
    }
    return {
      width: Math.max(constraints.minWidth, Math.min(size.width, constraints.maxWidth)),
      height: Math.max(constraints.minHeight, Math.min(size.height, constraints.maxHeight)),
    };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    void constraints;
    void childIndex;
    console.warn('Text 组件不支持子组件，不应调用 getConstraintsForChild');
    return { minWidth: 0, maxWidth: 0, minHeight: 0, maxHeight: 0 };
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const { size } = this.renderObject;
    const fontSize = this.fontSize || DefaultStyle.fontSize;
    const rawLineHeight = this.lineHeight ?? this.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);
    const contentHeight = this.textMetrics.height;
    const vertical = this.textAlignVertical || TextAlignVertical.Top;
    const outerTopOffset =
      vertical === TextAlignVertical.Top
        ? 0
        : vertical === TextAlignVertical.Bottom
          ? Math.max(0, size.height - contentHeight)
          : Math.max(0, (size.height - contentHeight) / 2);
    const ascent = this.textMetrics.ascent || fontSize * 0.8;
    const descent = this.textMetrics.descent || fontSize * 0.2;
    const leadingTop = Math.max(0, lineHeightPx - (ascent + descent)) / 2;
    const startBaselineY = outerTopOffset + leadingTop + ascent;
    const horiz = this.textAlign || DefaultStyle.textAlign;
    const startX =
      horiz === TextAlign.Left ? 0 : horiz === TextAlign.Center ? size.width / 2 : size.width;
    renderer.drawText({
      text: this.text,
      x: startX,
      y: startBaselineY,
      width: size.width,
      height: this.textMetrics.height,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      color: this.color,
      lineHeight: lineHeightPx,
      textAlign: horiz,
      textBaseline: DefaultStyle.textBaseline,
      lines: this.textMetrics.lines,
    });
  }
}
