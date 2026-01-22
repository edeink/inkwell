/**
 * 文本组件与排版实现。
 *
 * 主要职责：
 * - 提供 `Text` 组件：在 Canvas2D 渲染器中完成文本的测量、布局与绘制。
 * - 统一文本样式模型：通过 `TextProps` 描述字体、颜色、对齐方式与截断策略等。
 * - 提供多行断行能力：在给定宽度约束下对文本进行折行，并支持省略号。
 *
 * 核心模块：
 * - 样式与度量：`DefaultStyle`、`TextProps`、`TextLineMetrics`
 * - 布局与断行：`Text.calculateTextMetrics` / `Text.calculateTextMetricsEstimate`
 * - 绘制：`Text.paintSelf`（委托给 renderer.drawText）
 *
 * 对外接口：
 * - `Text`：文本组件
 * - `TextProps`：组件属性
 * - `TextLineMetrics`：按行的布局结果
 * - `TextAlign` / `TextAlignVertical` / `Overflow` / `TextBaseline`：文本相关枚举
 *
 * @example
 * ```ts
 * // JSX 场景（由工程内 JSX 编译器处理）
 * const node = <Text text="你好，世界" fontSize={14} maxLines={2} overflow={Overflow.Ellipsis} />;
 *
 * // 直接实例化
 * const widget = new Text({ text: '你好，世界', fontSize: 14 });
 * ```
 */
import { Widget } from './base';

import type { BoxConstraints, BuildContext, Size, WidgetProps } from './base';

/**
 * 文本的水平对齐方式。
 *
 * @example
 * ```ts
 * new Text({ text: 'Hello', textAlign: TextAlign.Center });
 * ```
 */
export enum TextAlign {
  Left = 'left',
  Center = 'center',
  Right = 'right',
}

/**
 * 文本在盒子内的垂直对齐方式。
 *
 * 注意：垂直对齐会影响文本绘制的起始基线位置（`paintSelf`）。
 *
 * @example
 * ```ts
 * new Text({ text: 'Hello', height: 48, textAlignVertical: TextAlignVertical.Center });
 * ```
 */
export enum TextAlignVertical {
  Top = 'top',
  Center = 'center',
  Bottom = 'bottom',
}

/**
 * 文本溢出处理策略。
 *
 * - `Clip`：直接裁切（由渲染器按容器裁剪策略处理）
 * - `Ellipsis`：在最后一行末尾添加 `...`
 * - `Fade`：渐隐（由渲染器实现，Text 侧仅透传）
 *
 * @example
 * ```ts
 * new Text({ text: '...', maxLines: 1, overflow: Overflow.Ellipsis });
 * ```
 */
export enum Overflow {
  Clip = 'clip',
  Ellipsis = 'ellipsis',
  Fade = 'fade',
}

/**
 * 文本基线类型。
 *
 * 当前 `Text` 默认使用 `Alphabetic` 作为绘制基线（见 `DefaultStyle.textBaseline`）。
 */
export enum TextBaseline {
  Top = 'top',
  Middle = 'middle',
  Bottom = 'bottom',
  Alphabetic = 'alphabetic',
}

/**
 * 字体样式。
 *
 * @example
 * ```ts
 * new Text({ text: 'Italic', fontStyle: 'italic' });
 * ```
 */
export type FontStyle = 'normal' | 'italic' | 'oblique';

/**
 * 文本装饰线类型。
 *
 * @example
 * ```ts
 * new Text({ text: 'Underline', textDecoration: 'underline' });
 * new Text({ text: 'Mix', textDecoration: ['underline', 'line-through'] });
 * ```
 */
export type TextDecoration = 'underline' | 'line-through';

/**
 * `Text` 组件属性。
 *
 * 说明：
 * - 该组件是框架内的声明式 Widget；属性变化会触发重新布局/重绘。
 * - 未显式传入的属性，通常会保持旧值（参见 `initTextProperties` 的兼容逻辑）。
 *
 * @example
 * ```ts
 * const widget = new Text({
 *   text: '多行文本示例，支持省略号…',
 *   fontSize: 14,
 *   lineHeight: 20,
 *   maxLines: 2,
 *   overflow: Overflow.Ellipsis,
 * });
 * ```
 */
export interface TextProps extends WidgetProps {
  /** 文本内容。 */
  text: string;
  /** 字号（px）。 */
  fontSize?: number;
  /** 字体族，CSS font-family 语义。 */
  fontFamily?: string;
  /** 字重，CSS font-weight 语义。 */
  fontWeight?: string | number;
  /** 字体样式。 */
  fontStyle?: FontStyle;
  /** 文本颜色（CSS 颜色字符串）。 */
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  /** 文本装饰线。 */
  textDecoration?: TextDecoration | TextDecoration[] | 'none';
  /** 组件高度（用于布局约束）。 */
  height?: number;
  /** 行高（px）。未设置时回退到 `height` 或 `fontSize`。 */
  lineHeight?: number;
  /** 水平对齐方式。 */
  textAlign?: TextAlign;
  /** 垂直对齐方式。 */
  textAlignVertical?: TextAlignVertical;
  /** 最大显示行数。 */
  maxLines?: number;
  /** 溢出策略。 */
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
 * 单行文本的测量与排版结果。
 *
 * 注意：
 * - `x/y` 是相对于组件自身坐标系的左上角定位；
 * - `baseline` 用于渲染器按基线绘制；
 * - `startIndex/endIndex` 用于文本定位（例如可编辑文本的坐标映射）。
 */
export interface TextLineMetrics {
  /** 该行文本内容。 */
  text: string;
  /** 该行文本绘制起点 X（左上角）。 */
  x: number;
  /** 该行文本绘制起点 Y（左上角）。 */
  y: number;
  /** 该行文本宽度。 */
  width: number;
  /** 该行文本高度（行高）。 */
  height: number;
  /** 该行文本基线 Y（用于按基线绘制）。 */
  baseline: number;
  /** 该行在原始字符串中的起始索引（UTF-16 索引）。 */
  startIndex: number;
  /** 该行在原始字符串中的结束索引（UTF-16 索引，不含 end）。 */
  endIndex: number;
  /** 字符间距（当前固定为 0，保留扩展位）。 */
  letterSpacing: number;
}

/**
 * Canvas2D 文本组件。
 *
 * 功能概览：
 * - 布局：在 `performLayout` 中根据约束计算文本尺寸与分行信息
 * - 绘制：在 `paintSelf` 中将行信息透传给 renderer.drawText
 * - 断行：`calculateTextMetrics` 在多行场景下使用“全局最优”的折行策略
 *
 * 性能注意：
 * - 通过 `getLayoutHash` + `lastLayoutConstraints` 做简单缓存，避免重复测量
 * - 断行算法对每个段落使用 O(n²) 动态规划；文本通常较短可接受
 *
 * @example
 * ```ts
 * new Text({
 *   text: '这是一段较长的文本，用于展示多行断行与标点处理。',
 *   fontSize: 14,
 *   maxLines: 3,
 *   overflow: Overflow.Ellipsis,
 * });
 * ```
 */
export class Text extends Widget<TextProps> {
  text: string = '';
  fontSize: number = DefaultStyle.fontSize;
  fontFamily: string = DefaultStyle.fontFamily;
  fontWeight: string | number = DefaultStyle.fontWeight;
  fontStyle: FontStyle = 'normal';
  color: string = DefaultStyle.color;
  strokeColor?: string;
  strokeWidth?: number;
  textDecoration: TextDecoration[] = [];
  height?: number;
  lineHeight?: number;
  textAlign: TextAlign = DefaultStyle.textAlign;
  textAlignVertical: TextAlignVertical = DefaultStyle.textAlignVertical;
  maxLines?: number;
  overflow?: Overflow;

  /**
   * 用于测量的离屏 Canvas 上下文。
   *
   * 说明：
   * - 在浏览器环境中创建一份共享的测量上下文，避免频繁创建对象
   * - 在 SSR/无 DOM 环境下为 null，并会退化到估算策略
   */
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

  /**
   * 获取按行拆分后的布局结果。
   *
   * 说明：
   * - 该 getter 会基于 `textMetrics` 计算每一行的 `x/y/baseline` 等信息；
   * - 主要用于绘制与文本坐标映射（例如可编辑文本选择区域的计算）。
   *
   * @returns 按行的布局结果列表
   *
   * @example
   * ```ts
   * const widget = new Text({ text: 'Hello\\nWorld' });
   * // layout 后可读取 widget.lines
   * const lines = widget.lines;
   * ```
   */
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

  /**
   * 规范化 `textDecoration` 的输入，统一为数组形式。
   *
   * @param val 可能为字符串、数组或 'none'
   * @returns 归一化后的装饰线数组
   */
  private normalizeTextDecoration(val: TextProps['textDecoration']): TextDecoration[] {
    if (!val || val === 'none') {
      return [];
    }
    if (Array.isArray(val)) {
      return val.filter((v): v is TextDecoration => v === 'underline' || v === 'line-through');
    }
    if (val === 'underline' || val === 'line-through') {
      return [val];
    }
    return [];
  }

  private initTextProperties(data: TextProps): void {
    let needsLayout = false;
    let needsPaint = false;

    if (data.text === undefined && this.text !== '') {
      // 兼容逻辑：历史实现允许不传某些属性而“保持旧值”。
      // 该行为不完全符合严格的声明式语义，但当前为兼容既有调用方式暂不改动。
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
    // 注意：这里使用 data.fontSize ?? this.fontSize，意味着未传入时保持旧值。
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

    // FontStyle
    const newFontStyle = (data.fontStyle ?? this.fontStyle) as FontStyle;
    if (this.fontStyle !== newFontStyle) {
      this.fontStyle = newFontStyle;
      needsLayout = true;
    }

    // Color
    const newColor = (data.color ?? this.color) as string;
    if (this.color !== newColor) {
      this.color = newColor;
      needsPaint = true;
    }

    const newStrokeColor = (data.strokeColor ?? this.strokeColor) as string | undefined;
    if (this.strokeColor !== newStrokeColor) {
      this.strokeColor = newStrokeColor;
      needsPaint = true;
    }

    const newStrokeWidth = (data.strokeWidth ?? this.strokeWidth) as number | undefined;
    if (this.strokeWidth !== newStrokeWidth) {
      this.strokeWidth = newStrokeWidth;
      needsPaint = true;
    }

    // TextDecoration
    if (data.textDecoration !== undefined) {
      const normalized = this.normalizeTextDecoration(data.textDecoration);
      const prev = this.textDecoration;
      const same = prev.length === normalized.length && prev.every((v, i) => v === normalized[i]);
      if (!same) {
        this.textDecoration = normalized;
        needsPaint = true;
      }
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

  /**
   * 生成布局缓存 Key。
   *
   * 说明：
   * - 该缓存用于避免同一帧/同一约束下重复测量；
   * - 以字符串拼接实现，简单但足够稳定。
   *
   * @param constraints 当前布局约束
   * @returns 用于比对的 hash 字符串
   */
  private getLayoutHash(constraints: BoxConstraints): string {
    return (
      `${this.text}-${this.fontSize}-${this.fontFamily}-${this.fontWeight}-${this.fontStyle}-` +
      `${this.lineHeight}-${this.textAlign}-${this.textAlignVertical}-${this.maxLines}-` +
      `${this.overflow}-${constraints.minWidth}-${constraints.maxWidth}-` +
      `${constraints.minHeight}-${constraints.maxHeight}`
    );
  }

  /**
   * 计算文本度量信息（真实测量版本）。
   *
   * 输出：
   * - `lines`：每一行的字符串内容
   * - `lineWidths`：每行宽度（Canvas measureText）
   * - `lineIndices`：每行对应的原始字符串索引范围（UTF-16）
   *
   * 算法说明（多行）：
   * - 先按 `\\n` 分段，每段独立排版；
   * - 对每个段落做“按 token”的断行动态规划：
   *   - 英文/数字等连续串会合并为一个 token，避免错误拆分导致的误换行
   *   - 代价函数：非最后一行使用 `slack²`（slack = maxWidth - lineWidth）
   *   - 规则惩罚：尽可能避免标点出现在行首、避免英文/数字串中间断开等
   * - 若 DP 无法给出有效路径，则回退到贪心折行
   *
   * @param constraints 布局约束（主要使用 maxWidth/maxLines）
   * @returns void（结果写入 `this.textMetrics`）
   */
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
    const fontStyle = this.fontStyle || 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
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

  /**
   * 当不存在 Canvas2D 上下文时，计算文本指标（估计值版本）。
   *
   * 说明：
   * - 该分支主要用于 SSR 或测试环境缺失 DOM 的场景；
   * - 使用平均字符宽度估算换行与宽度，结果仅用于避免布局崩溃。
   *
   * @param constraints 布局约束
   * @returns void（结果写入 `this.textMetrics`）
   */
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

  /**
   * Text 不支持子组件布局约束。
   *
   * @param constraints 父级约束（忽略）
   * @param childIndex 子索引（忽略）
   * @returns 恒返回 0 大小的约束
   */
  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    void constraints;
    void childIndex;
    console.warn('Text 组件不支持子组件，不应调用 getConstraintsForChild');
    return { minWidth: 0, maxWidth: 0, minHeight: 0, maxHeight: 0 };
  }

  /**
   * 绘制文本自身（不含子组件）。
   *
   * 说明：
   * - 基于 `textAlign`/`textAlignVertical` 计算绘制起点；
   * - 将行信息透传给渲染器，由渲染器实现实际的文本绘制与装饰线。
   *
   * @param context 构建上下文（包含 renderer 等）
   * @returns void
   */
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
      fontStyle: this.fontStyle,
      color: this.color,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      textDecoration: this.textDecoration,
      lineHeight: lineHeightPx,
      textAlign: horiz,
      textBaseline: DefaultStyle.textBaseline,
      lines: this.textMetrics.lines,
    });
  }
}
