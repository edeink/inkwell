import { Widget } from './base';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from './base';

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

export interface NextTextProps extends WidgetProps {
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
  fontSize: 14,
  fontFamily: 'Noto Sans SC, Noto Sans, -apple-system, BlinkMacSystemFont, Arial, sans-serif',
  fontWeight: 'normal',
  color: '#000000',
  textBaseline: TextBaseline.Alphabetic,
  textAlign: TextAlign.Left,
  textAlignVertical: TextAlignVertical.Center,
};

/**
 * 这是预留用来做文字性能对比的测试文件
 * 当需要进行文字的实验性能测试，会将 Text 的内容复制一份到此，进行优化，跑 benchmark
 * 除此之外，不保证功能可用性，请勿在线上环境使用
 * */
export class NextText extends Widget<NextTextProps> {
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
    NextText.measureCanvas?.getContext('2d') ?? null;

  protected createChildWidget(_childData: WidgetProps): Widget | null {
    void _childData;
    console.warn('Text 组件不支持子组件');
    return null;
  }

  private textMetrics: {
    width: number;
    height: number;
    lines?: string[];
    ascent: number;
    descent: number;
  } = { width: 0, height: 0, lines: [], ascent: 0, descent: 0 };

  constructor(data: NextTextProps) {
    super(data);
    this.initTextProperties(data);
  }

  private initTextProperties(data: NextTextProps): void {
    let needsLayout = false;
    let needsPaint = false;

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
      this.markNeedsLayout();
    } else if (needsPaint) {
      this.markNeedsPaint();
    }
  }

  createElement(data: NextTextProps): Widget<NextTextProps> {
    super.createElement(data);
    this.initTextProperties(data);
    return this;
  }

  private calculateTextMetrics(constraints: BoxConstraints): void {
    const fontSize = this.fontSize || DefaultStyle.fontSize;
    const rawLineHeight = this.lineHeight ?? this.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);
    const lines: string[] = [];
    const maxWidth = constraints.maxWidth;
    const ctx = NextText.measureCtx;
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
      this.textMetrics = {
        width: Math.max(
          constraints.minWidth,
          Math.min(textWidth, maxWidth === Infinity ? textWidth : maxWidth),
        ),
        height: Math.max(constraints.minHeight, lineHeightPx),
        lines,
        ascent,
        descent,
      };
    } else {
      const words = this.text.split(' ');
      let currentLine = '';
      const maxLines = this.maxLines || Infinity;
      for (let i = 0; i < words.length && lines.length < maxLines; i++) {
        const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            lines.push(words[i]);
          }
        }
      }
      if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
      }
      if (lines.length >= maxLines && this.overflow === 'ellipsis') {
        const lastLineIndex = maxLines - 1;
        let lastLine = lines[lastLineIndex];
        while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 0) {
          lastLine = lastLine.slice(0, -1);
        }
        lines[lastLineIndex] = lastLine + '...';
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
      const charsPerLine = Math.floor(maxWidth / avgCharWidth);
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

  protected positionChild(childIndex: number, childSize: Size): Offset {
    void childIndex;
    void childSize;
    console.warn('Text 组件不支持子组件，不应调用 positionChild');
    return { dx: 0, dy: 0 };
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
