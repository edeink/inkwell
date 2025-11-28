import React from 'react';

import { Widget } from './base';
import { ComponentType } from './type';

import type {
  BoxConstraints,
  BuildContext,
  JSXComponentProps,
  Offset,
  Size,
  WidgetData,
} from './base';

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

export interface TextData extends Omit<WidgetData, 'children'> {
  type: string;
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

export class Text extends Widget<TextData> {
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

  static {
    Widget.registerType(ComponentType.Text, Text);
  }

  protected createChildWidget(_childData: WidgetData): Widget | null {
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

  constructor(data: TextData) {
    super(data);
    this.initTextProperties(data);
  }

  private initTextProperties(data: TextData): void {
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

  createElement(data: TextData): Widget<TextData> {
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
    const ctx = Text.measureCtx;
    if (!ctx) {
      this.calculateTextMetricsEstimate(constraints);
      return;
    }
    const fontFamily = this.fontFamily || DefaultStyle.fontFamily;
    const fontWeight = this.fontWeight || DefaultStyle.fontWeight;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const m = ctx.measureText(this.text) as any;
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

export type TextProps = Omit<TextData, 'type' | 'children'> & JSXComponentProps;
export const TextElement: React.FC<TextProps> = () => null;
