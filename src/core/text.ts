import React from "react";
import { Widget } from "./base";

import type {
  BoxConstraints,
  BuildContext,
  JSXComponentProps,
  Offset,
  Size,
  WidgetData,
} from "./base";

/**
 * 文本组件特有的数据接口
 * 明确不支持子组件
 */
export interface TextData extends Omit<WidgetData, "children"> {
  type: "text";
  text: string;
  // 一级样式属性（优先级高于 style 内同名属性）
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  height?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right";
  textAlignVertical?: "top" | "center" | "bottom";
  maxLines?: number;
  overflow?: "clip" | "ellipsis" | "fade";
}

/**
 * 文本样式接口
 */
export interface TextStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  height?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right";
  textAlignVertical?: "top" | "center" | "bottom";
  maxLines?: number;
  overflow?: "clip" | "ellipsis" | "fade";
}

/**
 * 文本组件类，继承自基础组件
 * 类似于 Flutter 的 Text widget
 */
export class Text extends Widget<TextData> {
  // 文本内容
  text: string = "";
  fontSize: number = 16;
  fontFamily: string = "Arial, sans-serif";
  fontWeight: string | number = "normal";
  color: string = "#000000";
  height?: number;
  lineHeight?: number;
  textAlign: "left" | "center" | "right" = "left";
  textAlignVertical: "top" | "center" | "bottom" = "top";
  maxLines?: number;
  overflow?: "clip" | "ellipsis" | "fade";

  // 注册 Text 组件类型
  static {
    Widget.registerType("Text", Text);
  }

  /**
   * 创建子组件
   * Text 组件不支持子组件，始终返回 null 并给出警告
   */
  protected createChildWidget(childData: WidgetData): Widget | null {
    console.warn("Text 组件不支持子组件");
    return null;
  }

  // 计算后的文本度量
  private textMetrics: {
    width: number;
    height: number;
    lines: string[];
    ascent: number;
    descent: number;
  } = { width: 0, height: 0, lines: [], ascent: 0, descent: 0 };

  constructor(data: TextData) {
    super(data);
    this.initTextProperties(data);
  }

  /**
   * 初始化文本特有属性
   */
  private initTextProperties(data: TextData): void {
    // 确保 data.text 存在，否则给出警告
    if (!data.text && data.text !== "") {
      console.warn("Text 组件必须提供 text 属性");
      this.text = "[缺少文本]";
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
    this.textAlignVertical = (data.textAlignVertical ?? this.textAlignVertical) as typeof this.textAlignVertical;
    this.maxLines = (data.maxLines ?? this.maxLines) as number | undefined;
    this.overflow = (data.overflow ?? this.overflow) as typeof this.overflow;
  }

  /**
   * 创建组件
   * 类似于 Flutter 的 createElement 方法
   */
  createElement(data: TextData): Widget<TextData> {
    super.createElement(data);
    this.initTextProperties(data);
    return this;
  }

  /**
   * 计算文本的度量信息（宽度、高度、行数等）
   */
  private calculateTextMetrics(constraints: BoxConstraints): void {
    const fontSize = this.fontSize || 16;
    const rawLineHeight = this.lineHeight ?? this.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);
    const lines: string[] = [];

    const maxWidth = constraints.maxWidth;

    // 使用 Canvas 进行精确的文字度量
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      // 如果无法获取 Canvas 上下文，回退到估算方法
      this.calculateTextMetricsEstimate(constraints);
      return;
    }

    // 设置字体样式
    const fontFamily = this.fontFamily || "Arial, sans-serif";
    const fontWeight = this.fontWeight || "normal";
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    const metricSample = this.text && this.text.length > 0 ? this.text : "M";
    const m = ctx.measureText(metricSample);
    const ascent = (m as any).actualBoundingBoxAscent ?? fontSize * 0.8;
    const descent = (m as any).actualBoundingBoxDescent ?? fontSize * 0.2;

    // 测量单行文本宽度
    const textWidth = ctx.measureText(this.text).width;

    if (maxWidth === Infinity || textWidth <= maxWidth) {
      // 单行文本
      lines.push(this.text);
      this.textMetrics = {
        width: Math.max(
          constraints.minWidth,
          Math.min(textWidth, maxWidth === Infinity ? textWidth : maxWidth)
        ),
        height: Math.max(constraints.minHeight, lineHeightPx),
        lines: lines,
        ascent,
        descent,
      };
    } else {
      // 多行文本 - 使用精确的文字分割
      const words = this.text.split(" ");
      let currentLine = "";
      const maxLines = this.maxLines || Infinity;

      for (let i = 0; i < words.length && lines.length < maxLines; i++) {
        const testLine = currentLine + (currentLine ? " " : "") + words[i];
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            // 单个词太长，强制分割
            lines.push(words[i]);
          }
        }
      }

      // 添加最后一行
      if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
      }

      // 处理省略号
      if (lines.length >= maxLines && this.overflow === "ellipsis") {
        const lastLineIndex = maxLines - 1;
        let lastLine = lines[lastLineIndex];

        while (
          ctx.measureText(lastLine + "...").width > maxWidth &&
          lastLine.length > 0
        ) {
          lastLine = lastLine.slice(0, -1);
        }
        lines[lastLineIndex] = lastLine + "...";
      }

      this.textMetrics = {
        width: maxWidth,
        height: Math.max(
          constraints.minHeight,
          lines.length * lineHeightPx
        ),
        lines: lines,
        ascent,
        descent,
      };
    }
  }

  /**
   * 估算方法的文字度量计算（备用方法）
   */
  private calculateTextMetricsEstimate(constraints: BoxConstraints): void {
    const fontSize = this.fontSize || 16;
    const rawLineHeight = this.lineHeight ?? this.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);
    const avgCharWidth = fontSize * 0.6;
    const lines: string[] = [];
    const maxWidth = constraints.maxWidth;
    const ascent = fontSize * 0.8;
    const descent = fontSize * 0.2;

    if (maxWidth === Infinity || this.text.length * avgCharWidth <= maxWidth) {
      // 单行文本
      lines.push(this.text);
      this.textMetrics = {
        width: Math.max(
          constraints.minWidth,
          Math.min(this.text.length * avgCharWidth, maxWidth)
        ),
        height: Math.max(constraints.minHeight, lineHeightPx),
        lines: lines,
        ascent,
        descent,
      };
    } else {
      // 多行文本
      const charsPerLine = Math.floor(maxWidth / avgCharWidth);
      let remainingText = this.text;
      const maxLines = this.maxLines || Infinity;

      while (remainingText.length > 0 && lines.length < maxLines) {
        let line = remainingText.substring(0, charsPerLine);

        if (
          lines.length === maxLines - 1 &&
          remainingText.length > charsPerLine &&
          this.overflow === "ellipsis"
        ) {
          line = line.substring(0, line.length - 3) + "...";
        }

        lines.push(line);
        remainingText = remainingText.substring(charsPerLine);

        if (lines.length >= maxLines) {
          break;
        }
      }

      this.textMetrics = {
        width: maxWidth,
        height: Math.max(
          constraints.minHeight,
          lines.length * lineHeightPx
        ),
        lines: lines,
        ascent,
        descent,
      };
    }
  }

  /**
   * 执行布局计算
   * 类似于 Flutter 的 performLayout 方法
   */
  protected performLayout(
    constraints: BoxConstraints,
    childrenSizes: Size[]
  ): Size {
    // 计算文本度量
    this.calculateTextMetrics(constraints);

    // 基本布局结果
    const size: Size = {
      width: this.textMetrics.width,
      height: this.textMetrics.height,
    };

    // Text 组件不支持子组件，如果有子组件尝试布局，发出警告
    if (childrenSizes.length > 0) {
      console.warn("Text 组件不支持子组件，忽略所有子组件布局");
    }

    // 确保满足约束条件
    return {
      width: Math.max(
        constraints.minWidth,
        Math.min(size.width, constraints.maxWidth)
      ),
      height: Math.max(
        constraints.minHeight,
        Math.min(size.height, constraints.maxHeight)
      ),
    };
  }

  /**
   * 获取子组件的约束
   * Text 组件不支持子组件，但需要实现抽象方法
   */
  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number
  ): BoxConstraints {
    console.warn("Text 组件不支持子组件，不应调用 getConstraintsForChild");
    // 返回空约束
    return {
      minWidth: 0,
      maxWidth: 0,
      minHeight: 0,
      maxHeight: 0,
    };
  }

  /**
   * 定位子组件
   * Text 组件不支持子组件，但需要实现抽象方法
   */
  protected positionChild(childIndex: number, childSize: Size): Offset {
    console.warn("Text 组件不支持子组件，不应调用 positionChild");
    // 返回零偏移
    return { dx: 0, dy: 0 };
  }

  /**
   * 绘制文本组件
   */
  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const { size } = this.renderObject;
    const fontSize = this.fontSize || 16;
    const rawLineHeight = this.lineHeight ?? this.height ?? fontSize;
    const lineHeightPx = Math.max(fontSize, rawLineHeight);
    const contentHeight = this.textMetrics.height;
    const vertical = this.textAlignVertical || "top";
    const outerTopOffset = vertical === "top"
      ? 0
      : vertical === "bottom"
        ? Math.max(0, size.height - contentHeight)
        : Math.max(0, (size.height - contentHeight) / 2);
    const ascent = this.textMetrics.ascent || fontSize * 0.8;
    const descent = this.textMetrics.descent || fontSize * 0.2;
    const leadingTop = Math.max(0, lineHeightPx - (ascent + descent)) / 2;
    const startBaselineY = outerTopOffset + leadingTop + ascent;

    const horiz = this.textAlign || "left";
    const startX = horiz === "left" ? 0 : horiz === "center" ? size.width / 2 : size.width;

    // 根据渲染器类型执行不同的绘制逻辑
    if (renderer) {
      // 假设渲染器有一个drawText方法
      if (typeof renderer.drawText === "function") {
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
          textBaseline: "alphabetic",
          lines: this.textMetrics.lines,
        });
      } else {
        console.warn("Renderer does not support drawText method");
      }
    }
  }
}

export type TextProps = Omit<TextData, "type" | "children"> & JSXComponentProps;
export const TextElement: React.FC<TextProps> = () => null;
