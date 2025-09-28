import { Widget } from "./base";
import type {
  WidgetData,
  BoxConstraints,
  Size,
  Offset,
  BuildContext,
} from "./base";

/**
 * 图片组件特有的数据接口
 * 明确不支持子组件
 */
export interface ImageData extends WidgetData {
  type: "image"; // 明确指定组件类型
  src: string; // 图片源地址
  width?: number; // 图片宽度
  height?: number; // 图片高度
  fit?: ImageFit; // 图片适应方式
  alignment?: ImageAlignment; // 图片对齐方式
  children?: never; // 明确标记不支持子组件
}

/**
 * 图片适应方式类型
 */
export type ImageFit =
  | "fill" // 填充整个容器，可能会变形
  | "contain" // 保持比例，完整显示图片
  | "cover" // 保持比例，填充容器，可能会裁剪
  | "fitWidth" // 适应宽度
  | "fitHeight" // 适应高度
  | "none" // 原始尺寸
  | "scaleDown"; // 缩小以适应容器

/**
 * 图片适应方式常量
 */
export const ImageFit = {
  Fill: "fill" as const,
  Contain: "contain" as const,
  Cover: "cover" as const,
  FitWidth: "fitWidth" as const,
  FitHeight: "fitHeight" as const,
  None: "none" as const,
  ScaleDown: "scaleDown" as const,
};

/**
 * 图片对齐方式类型
 */
export type ImageAlignment =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "centerLeft"
  | "center"
  | "centerRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight";

/**
 * 图片对齐方式常量
 */
export const ImageAlignment = {
  TopLeft: "topLeft" as const,
  TopCenter: "topCenter" as const,
  TopRight: "topRight" as const,
  CenterLeft: "centerLeft" as const,
  Center: "center" as const,
  CenterRight: "centerRight" as const,
  BottomLeft: "bottomLeft" as const,
  BottomCenter: "bottomCenter" as const,
  BottomRight: "bottomRight" as const,
};

/**
 * 图片组件类，继承自基础组件
 * 类似于 Flutter 的 Image widget
 */
export class Image extends Widget<ImageData> {
  // 图片源地址
  src: string = "";

  // 图片尺寸
  imageWidth?: number;
  imageHeight?: number;

  // 图片适应方式
  fit: ImageFit = ImageFit.Contain;

  // 图片对齐方式
  alignment: ImageAlignment = ImageAlignment.Center;

  // 图片加载状态
  private imageLoaded: boolean = false;
  private imageElement: HTMLImageElement | null = null;
  private naturalWidth: number = 0;
  private naturalHeight: number = 0;

  // 注册 Image 组件类型
  static {
    Widget.registerType("image", Image);
  }

  /**
   * 创建子组件
   * Image 组件不支持子组件，始终返回 null 并给出警告
   */
  protected createChildWidget(childData: WidgetData): Widget | null {
    console.warn("Image 组件不支持子组件");
    return null;
  }

  constructor(data: ImageData) {
    // 移除children属性（如果存在）
    const { children, ...imageData } = data;
    if (children) {
      console.warn('Image组件不支持子组件，已忽略children属性');
    }
    
    super(imageData as ImageData);
    this.initImageProperties(imageData as ImageData);
    this.loadImage();
  }

  /**
   * 初始化图片特有属性
   */
  private initImageProperties(data: ImageData): void {
    // 确保 data.src 存在，否则给出警告
    if (!data.src) {
      console.warn("Image 组件必须提供 src 属性");
      this.src = "";
    } else {
      this.src = data.src;
    }

    this.imageWidth = data.width;
    this.imageHeight = data.height;
    this.fit = data.fit || ImageFit.Contain;
    this.alignment = data.alignment || ImageAlignment.Center;
  }

  /**
   * 加载图片
   */
  private loadImage(): void {
    if (!this.src) return;

    this.imageElement = new window.Image();
    this.imageElement.onload = () => {
      this.naturalWidth = this.imageElement!.naturalWidth;
      this.naturalHeight = this.imageElement!.naturalHeight;
      this.imageLoaded = true;
      // 触发重新布局和渲染
      this.markNeedsLayout();
    };
    this.imageElement.onerror = () => {
      console.error(`Failed to load image: ${this.src}`);
      this.imageLoaded = false;
    };
    this.imageElement.src = this.src;
  }

  /**
   * 创建组件实例
   */
  createElement(data: ImageData): Widget<ImageData> {
    return new Image(data);
  }

  /**
   * 计算图片在容器中的尺寸和位置
   */
  private calculateImageLayout(containerSize: Size): {
    width: number;
    height: number;
    x: number;
    y: number;
  } {
    if (!this.imageLoaded || !this.naturalWidth || !this.naturalHeight) {
      return { width: 0, height: 0, x: 0, y: 0 };
    }

    let width = this.naturalWidth;
    let height = this.naturalHeight;

    // 如果指定了固定尺寸，使用指定尺寸
    if (this.imageWidth && this.imageHeight) {
      width = this.imageWidth;
      height = this.imageHeight;
    } else {
      // 根据适应方式计算尺寸
      const aspectRatio = this.naturalWidth / this.naturalHeight;
      const containerAspectRatio = containerSize.width / containerSize.height;

      switch (this.fit) {
        case "fill":
          width = containerSize.width;
          height = containerSize.height;
          break;
        case "contain":
          if (aspectRatio > containerAspectRatio) {
            width = containerSize.width;
            height = width / aspectRatio;
          } else {
            height = containerSize.height;
            width = height * aspectRatio;
          }
          break;
        case "cover":
          if (aspectRatio > containerAspectRatio) {
            height = containerSize.height;
            width = height * aspectRatio;
          } else {
            width = containerSize.width;
            height = width / aspectRatio;
          }
          break;
        case "fitWidth":
          width = containerSize.width;
          height = width / aspectRatio;
          break;
        case "fitHeight":
          height = containerSize.height;
          width = height * aspectRatio;
          break;
        case "scaleDown":
          if (this.naturalWidth > containerSize.width || this.naturalHeight > containerSize.height) {
            // 需要缩小，使用 contain 逻辑
            if (aspectRatio > containerAspectRatio) {
              width = containerSize.width;
              height = width / aspectRatio;
            } else {
              height = containerSize.height;
              width = height * aspectRatio;
            }
          } else {
            // 不需要缩小，使用原始尺寸
            width = this.naturalWidth;
            height = this.naturalHeight;
          }
          break;
        case "none":
        default:
          width = this.naturalWidth;
          height = this.naturalHeight;
          break;
      }
    }

    // 计算位置（基于对齐方式）
    let x = 0;
    let y = 0;

    switch (this.alignment) {
      case "topLeft":
        x = 0;
        y = 0;
        break;
      case "topCenter":
        x = (containerSize.width - width) / 2;
        y = 0;
        break;
      case "topRight":
        x = containerSize.width - width;
        y = 0;
        break;
      case "centerLeft":
        x = 0;
        y = (containerSize.height - height) / 2;
        break;
      case "center":
        x = (containerSize.width - width) / 2;
        y = (containerSize.height - height) / 2;
        break;
      case "centerRight":
        x = containerSize.width - width;
        y = (containerSize.height - height) / 2;
        break;
      case "bottomLeft":
        x = 0;
        y = containerSize.height - height;
        break;
      case "bottomCenter":
        x = (containerSize.width - width) / 2;
        y = containerSize.height - height;
        break;
      case "bottomRight":
        x = containerSize.width - width;
        y = containerSize.height - height;
        break;
    }

    return { width, height, x, y };
  }

  /**
   * 执行布局计算
   */
  protected performLayout(
    constraints: BoxConstraints,
    childrenSizes: Size[]
  ): Size {
    // 如果指定了固定尺寸，优先使用
    if (this.imageWidth && this.imageHeight) {
      const width = Math.max(
        constraints.minWidth,
        Math.min(this.imageWidth, constraints.maxWidth)
      );
      const height = Math.max(
        constraints.minHeight,
        Math.min(this.imageHeight, constraints.maxHeight)
      );
      return { width, height };
    }

    // 如果图片还未加载，返回最小尺寸
    if (!this.imageLoaded || !this.naturalWidth || !this.naturalHeight) {
      return {
        width: constraints.minWidth,
        height: constraints.minHeight,
      };
    }

    // 根据图片的自然尺寸和约束计算最终尺寸
    const aspectRatio = this.naturalWidth / this.naturalHeight;
    let width = this.naturalWidth;
    let height = this.naturalHeight;

    // 确保满足约束条件
    if (width > constraints.maxWidth) {
      width = constraints.maxWidth;
      height = width / aspectRatio;
    }
    if (height > constraints.maxHeight) {
      height = constraints.maxHeight;
      width = height * aspectRatio;
    }
    if (width < constraints.minWidth) {
      width = constraints.minWidth;
      height = width / aspectRatio;
    }
    if (height < constraints.minHeight) {
      height = constraints.minHeight;
      width = height * aspectRatio;
    }

    return { width, height };
  }

  /**
   * 获取子组件的约束
   * Image 组件没有子组件，返回空约束
   */
  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number
  ): BoxConstraints {
    return {
      minWidth: 0,
      maxWidth: 0,
      minHeight: 0,
      maxHeight: 0,
    };
  }

  /**
   * 定位子组件
   * Image 组件没有子组件，返回零偏移
   */
  protected positionChild(childIndex: number, childSize: Size): Offset {
    return { dx: 0, dy: 0 };
  }

  /**
   * 绘制图片
   */
  protected paintSelf(context: BuildContext): void {
    if (!this.imageLoaded || !this.imageElement) {
      // 图片未加载，绘制占位符
      const { size } = this.renderObject;
      context.renderer.drawRect({
        x: 0, // 使用 0，因为 translate 已经处理了偏移
        y: 0, // 使用 0，因为 translate 已经处理了偏移
        width: size.width,
        height: size.height,
        fill: "#f0f0f0",
        stroke: "#cccccc",
        strokeWidth: 1,
      });

      // 绘制加载提示文本
      context.renderer.drawText({
        text: this.src ? "Loading..." : "No Image",
        x: size.width / 2, // 相对于组件内部的中心位置
        y: size.height / 2, // 相对于组件内部的中心位置
        fontSize: 12,
        color: "#666666",
        textAlign: "center",
        textBaseline: "middle",
      });
      return;
    }

    // 计算图片布局
    const layout = this.calculateImageLayout(this.renderObject.size);

    // 绘制图片
    context.renderer.drawImage({
      image: this.imageElement,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
    });
  }
}