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

  private static measureCanvas: HTMLCanvasElement | null =
    typeof document === 'undefined' ? null : document.createElement('canvas');
  private static measureCtx: CanvasRenderingContext2D | null =
    Text.measureCanvas?.getContext('2d') ?? null;

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
    let needsLayout = false;
    let needsPaint = false;

    if (data.text === undefined && this.text !== '') {
      // 只有在明确需要重置时才警告，这里保持原有逻辑，如果不传且当前为空才警告？
      // 原逻辑：if (!data.text && data.text !== '') ...
      // 这里简化判断，主要关注变化
    }

    // Text content
    const newText = data.text ?? '';
    if (this.text !== newText) {
      if (!newText && newText !== '') {
        console.warn('Text 组件必须提供 text 属性');
        this.text = '[缺少文本]';
      } else {
        this.text = newText;
      }
      needsLayout = true;
    }

    // FontSize
    // 注意：原有逻辑是 data.fontSize ?? this.fontSize，这意味着如果不传，保持旧值。
    // 这可能不符合声明式预期（移除属性应恢复默认），但为了兼容现有逻辑，我们保持一致。
    const newFontSize = (data.fontSize ?? this.fontSize) as number;
    if (this.fontSize !== newFontSize) {
      this.fontSize = newFontSize;
      needsLayout = true;
    }

    // FontFamily
    const newFontFamily = (data.fontFamily ?? this.fontFamily) as string;
    if (this.fontFamily !== newFontFamily) {
      this.fontFamily = newFontFamily;
      needsLayout = true;
    }

    // FontWeight
    const newFontWeight = (data.fontWeight ?? this.fontWeight) as string | number;
    if (this.fontWeight !== newFontWeight) {
      this.fontWeight = newFontWeight;
      needsLayout = true;
    }

    // Color
    const newColor = (data.color ?? this.color) as string;
    if (this.color !== newColor) {
      this.color = newColor;
      needsPaint = true;
    }

    // Height
    const newHeight = (data.height ?? this.height) as number | undefined;
    if (this.height !== newHeight) {
      this.height = newHeight;
      needsLayout = true;
    }

    // LineHeight
    const newLineHeight = (data.lineHeight ?? this.lineHeight) as number | undefined;
    if (this.lineHeight !== newLineHeight) {
      this.lineHeight = newLineHeight;
      needsLayout = true;
    }

    // TextAlign
    const newTextAlign = (data.textAlign ?? this.textAlign) as typeof this.textAlign;
    if (this.textAlign !== newTextAlign) {
      this.textAlign = newTextAlign;
      needsLayout = true;
    }

    // TextAlignVertical
    const newTextAlignVertical = (data.textAlignVertical ??
      this.textAlignVertical) as typeof this.textAlignVertical;
    if (this.textAlignVertical !== newTextAlignVertical) {
      this.textAlignVertical = newTextAlignVertical;
      needsLayout = true;
    }

    // MaxLines
    const newMaxLines = (data.maxLines ?? this.maxLines) as number | undefined;
    if (this.maxLines !== newMaxLines) {
      this.maxLines = newMaxLines;
      needsLayout = true;
    }

    // Overflow
    const newOverflow = (data.overflow ?? this.overflow) as typeof this.overflow;
    if (this.overflow !== newOverflow) {
      this.overflow = newOverflow;
      needsLayout = true;
    }

    if (needsLayout) {
      if (this.isMounted) {
        this.markNeedsLayout();
      }
    } else if (needsPaint) {
      if (this.isMounted) {
        this.markNeedsPaint();
      }
    }
  }

  protected didUpdateWidget(_oldProps: TextProps): void {
    this.initTextProperties(this.props as unknown as TextProps);
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
    const maxLines = this.maxLines || Infinity;
    const text = this.text;

    let didWrap = false;
    let overflowed = false;

    let currentLine = '';
    let currentLineStart = 0;
    let currentWidth = 0;

    if (text.length === 0) {
      lines.push('');
      lineWidths.push(0);
      lineIndices.push({ start: 0, end: 0 });
    } else {
      let i = 0;
      while (i < text.length) {
        const codePoint = text.codePointAt(i);
        if (codePoint === undefined) {
          break;
        }
        const char = String.fromCodePoint(codePoint);
        const charLen = char.length;

        if (char === '\n') {
          lines.push(currentLine);
          lineWidths.push(currentWidth);
          lineIndices.push({ start: currentLineStart, end: currentLineStart + currentLine.length });

          currentLine = '';
          currentWidth = 0;
          i += 1;
          currentLineStart = i;

          if (lines.length >= maxLines) {
            if (i < text.length) {
              overflowed = true;
            }
            break;
          }
          continue;
        }

        const charWidth = ctx.measureText(char).width;

        if (
          maxWidth !== Infinity &&
          currentLine.length > 0 &&
          currentWidth + charWidth > maxWidth
        ) {
          didWrap = true;

          lines.push(currentLine);
          lineWidths.push(currentWidth);
          lineIndices.push({ start: currentLineStart, end: currentLineStart + currentLine.length });

          currentLine = '';
          currentWidth = 0;
          currentLineStart = i;

          if (lines.length >= maxLines) {
            overflowed = true;
            break;
          }
          continue;
        }

        currentLine += char;
        currentWidth += charWidth;
        i += charLen;
      }

      if (!overflowed && lines.length < maxLines) {
        if (currentLine.length > 0 || lines.length === 0 || text.endsWith('\n')) {
          lines.push(currentLine);
          lineWidths.push(currentWidth);
          lineIndices.push({ start: currentLineStart, end: currentLineStart + currentLine.length });
        }
      }

      if (lines.length > maxLines) {
        lines.length = maxLines;
        lineWidths.length = maxLines;
        lineIndices.length = maxLines;
        overflowed = true;
      }

      if (
        lines.length >= maxLines &&
        overflowed &&
        this.overflow === Overflow.Ellipsis &&
        maxWidth !== Infinity
      ) {
        const lastLineIndex = maxLines - 1;
        let lastLine = lines[lastLineIndex] ?? '';
        while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 0) {
          lastLine = lastLine.slice(0, -1);
        }
        lines[lastLineIndex] = lastLine + '...';
        lineWidths[lastLineIndex] = ctx.measureText(lines[lastLineIndex]).width;
        lineIndices[lastLineIndex].end = lineIndices[lastLineIndex].start + lastLine.length;
      }
    }

    const maxLineWidth = lineWidths.reduce((acc, w) => Math.max(acc, w), 0);
    const contentWidth =
      maxWidth === Infinity ? maxLineWidth : didWrap ? maxWidth : Math.min(maxWidth, maxLineWidth);

    this.textMetrics = {
      width: Math.max(constraints.minWidth, contentWidth),
      height: Math.max(constraints.minHeight, lines.length * lineHeightPx),
      lines,
      lineWidths,
      lineIndices,
      ascent,
      descent,
    };
  }

  // 当不存在 canvsa 2d 上下文时，计算文本指标（估计值）
  private calculateTextMetricsEstimate(constraints: BoxConstraints): void {
    const fontSize = this.fontSize || DefaultStyle.fontSize;
    const rawLineHeight = this.lineHeight ?? this.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);
    const avgCharWidth = fontSize * 0.6;
    const lines: string[] = [];
    const lineWidths: number[] = [];
    const lineIndices: { start: number; end: number }[] = [];
    const maxWidth = constraints.maxWidth;
    const ascent = fontSize * 0.8;
    const descent = fontSize * 0.2;
    const text = this.text;
    if (text.length === 0) {
      lines.push('');
      lineWidths.push(0);
      lineIndices.push({ start: 0, end: 0 });
      this.textMetrics = {
        width: Math.max(constraints.minWidth, Math.min(0, maxWidth)),
        height: Math.max(constraints.minHeight, lineHeightPx),
        lines,
        lineWidths,
        lineIndices,
        ascent,
        descent,
      };
      return;
    }

    const maxLines = this.maxLines || Infinity;
    const charsPerLine =
      maxWidth === Infinity ? Infinity : Math.max(1, Math.floor(maxWidth / avgCharWidth));

    let i = 0;
    let currentLine = '';
    let currentLineStart = 0;

    while (i < text.length) {
      const char = text[i];
      if (char === '\n') {
        lines.push(currentLine);
        lineWidths.push(currentLine.length * avgCharWidth);
        lineIndices.push({ start: currentLineStart, end: currentLineStart + currentLine.length });

        currentLine = '';
        i += 1;
        currentLineStart = i;

        if (lines.length >= maxLines) {
          break;
        }
        continue;
      }

      if (currentLine.length >= charsPerLine) {
        lines.push(currentLine);
        lineWidths.push(currentLine.length * avgCharWidth);
        lineIndices.push({ start: currentLineStart, end: currentLineStart + currentLine.length });

        currentLine = '';
        currentLineStart = i;

        if (lines.length >= maxLines) {
          break;
        }
        continue;
      }

      currentLine += char;
      i += 1;
    }

    if (lines.length < maxLines) {
      if (currentLine.length > 0 || lines.length === 0 || text.endsWith('\n')) {
        lines.push(currentLine);
        lineWidths.push(currentLine.length * avgCharWidth);
        lineIndices.push({ start: currentLineStart, end: currentLineStart + currentLine.length });
      }
    }

    const maxLineWidth = lineWidths.reduce((acc, w) => Math.max(acc, w), 0);
    const contentWidth = maxWidth === Infinity ? maxLineWidth : Math.min(maxWidth, maxLineWidth);

    this.textMetrics = {
      width: Math.max(constraints.minWidth, contentWidth),
      height: Math.max(constraints.minHeight, lines.length * lineHeightPx),
      lines,
      lineWidths,
      lineIndices,
      ascent,
      descent,
    };
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
