import { Widget } from "./base";
import type {
  WidgetData,
  BoxConstraints,
  Size,
  Offset,
  BuildContext,
} from "./base";
// Text component implementation for UI rendering system

/**
 * 文本组件特有的数据接口
 * 明确不支持子组件
 */
export interface TextData extends Omit<WidgetData, "children"> {
  type: "text"; // 明确指定组件类型
  text: string;
  style?: TextStyle;
  children?: never; // 明确标记不支持子组件
}

/**
 * 文本样式接口
 */
export interface TextStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  height?: number; // 对应 lineHeight
  textAlign?: "left" | "center" | "right";
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

  // 文本样式
  style: TextStyle = {
    fontSize: 16,
    fontFamily: "Arial, sans-serif",
    fontWeight: "normal",
    color: "#000000",
    height: 1.2,
    textAlign: "left",
  };

  // 注册 Text 组件类型
  static {
    Widget.registerType("text", Text);
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
  } = { width: 0, height: 0, lines: [] };

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

    if (data.style) {
      this.style = {
        ...this.style,
        ...data.style,
      };
    }
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
    // 在实际应用中，这里应该使用canvas或其他方式测量文本
    // 这里使用简化的估算方法
    const fontSize = this.style.fontSize || 16;
    const lineHeight = this.style.height || 1.2;
    const avgCharWidth = fontSize * 0.6;
    const lines: string[] = [];

    const maxWidth = constraints.maxWidth;

    if (maxWidth === Infinity || this.text.length * avgCharWidth <= maxWidth) {
      // 单行文本
      lines.push(this.text);
      this.textMetrics = {
        width: Math.max(
          constraints.minWidth,
          Math.min(this.text.length * avgCharWidth, maxWidth)
        ),
        height: Math.max(constraints.minHeight, fontSize * lineHeight),
        lines: lines,
      };
    } else {
      // 多行文本
      const charsPerLine = Math.floor(maxWidth / avgCharWidth);
      let remainingText = this.text;

      // 考虑 maxLines 限制
      const maxLines = this.style.maxLines || Infinity;

      while (remainingText.length > 0 && lines.length < maxLines) {
        // 简单的按字符数分行，实际应用中应该按单词分行
        let line = remainingText.substring(0, charsPerLine);

        // 如果是最后一行且有溢出处理
        if (
          lines.length === maxLines - 1 &&
          remainingText.length > charsPerLine &&
          this.style.overflow === "ellipsis"
        ) {
          line = line.substring(0, line.length - 3) + "...";
        }

        lines.push(line);
        remainingText = remainingText.substring(charsPerLine);

        // 如果达到最大行数，停止处理
        if (lines.length >= maxLines) {
          break;
        }
      }

      this.textMetrics = {
        width: maxWidth,
        height: Math.max(
          constraints.minHeight,
          lines.length * fontSize * lineHeight
        ),
        lines: lines,
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
    const { offset, size } = this.renderObject;

    // 根据渲染器类型执行不同的绘制逻辑
    if (renderer) {
      // 假设渲染器有一个drawText方法
      if (typeof renderer.drawText === "function") {
        renderer.drawText({
          text: this.text,
          x: 0, // 使用 0，因为 translate 已经处理了偏移
          y: 0, // 使用 0，因为 translate 已经处理了偏移
          width: size.width,
          height: this.textMetrics.height, // 只使用文本部分的高度
          fontSize: this.style.fontSize,
          fontFamily: this.style.fontFamily,
          fontWeight: this.style.fontWeight,
          color: this.style.color,
          lineHeight: this.style.height,
          textAlign: this.style.textAlign,
          lines: this.textMetrics.lines,
        });
      } else {
        console.warn("Renderer does not support drawText method");
      }
    }
  }
}
