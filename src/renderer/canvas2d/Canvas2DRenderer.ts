import type { IRenderer, RendererOptions } from "../IRenderer";

/**
 * Canvas2D 渲染器实现
 * 基于原生 HTML5 Canvas 2D Context
 */
export class Canvas2DRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private container: HTMLElement | null = null;
  private options: RendererOptions | null = null;
  private transformStack: Array<DOMMatrix> = [];

  /**
   * 初始化渲染器
   * @param container 容器元素
   * @param options 渲染选项
   */
  initialize(container: HTMLElement, options: RendererOptions): void {
    // 避免重复初始化
    if (this.canvas) {
      this.destroy();
    }

    this.container = container;
    this.options = options;

    // 创建 Canvas 元素
    this.canvas = document.createElement("canvas");
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    this.canvas.style.width = `${options.width}px`;
    this.canvas.style.height = `${options.height}px`;

    // 获取 2D 渲染上下文
    this.ctx = this.canvas.getContext("2d", {
      alpha: options.backgroundAlpha !== 1,
    });

    if (!this.ctx) {
      throw new Error("Failed to get 2D rendering context");
    }

    // 设置高分辨率支持
    const devicePixelRatio = window.devicePixelRatio || 1;
    const resolution = options.resolution || devicePixelRatio;
    
    if (resolution !== 1) {
      this.canvas.width = options.width * resolution;
      this.canvas.height = options.height * resolution;
      this.ctx.scale(resolution, resolution);
    }

    // 设置抗锯齿
    if (options.antialias !== false) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = "high";
    }

    // 设置背景色
    if (options.background) {
      this.clearBackground();
    }

    // 将 Canvas 添加到容器
    this.container.appendChild(this.canvas);
  }

  /**
   * 调整渲染器大小
   * @param width 宽度
   * @param height 高度
   */
  resize(width: number, height: number): void {
    if (!this.canvas || !this.ctx || !this.options) {
      return;
    }

    this.options.width = width;
    this.options.height = height;

    const resolution = this.options.resolution || window.devicePixelRatio || 1;
    
    this.canvas.width = width * resolution;
    this.canvas.height = height * resolution;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    this.ctx.scale(resolution, resolution);

    // 重新设置抗锯齿
    if (this.options.antialias !== false) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = "high";
    }

    this.clearBackground();
  }

  /**
   * 渲染一帧
   */
  render(): void {
    // Canvas2D 是立即模式渲染，不需要显式的渲染调用
    // 所有绘制操作都是立即执行的
  }

  /**
   * 销毁渲染器，释放资源
   */
  destroy(): void {
    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.options = null;
    this.transformStack = [];
  }

  /**
   * 获取原始渲染器实例
   * @returns Canvas 2D Context
   */
  getRawInstance(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  /**
   * 保存当前绘图状态
   */
  save(): void {
    if (!this.ctx) return;
    this.ctx.save();
    // 保存当前变换矩阵
    this.transformStack.push(this.ctx.getTransform());
  }

  /**
   * 恢复之前保存的绘图状态
   */
  restore(): void {
    if (!this.ctx) return;
    this.ctx.restore();
    // 恢复变换矩阵
    this.transformStack.pop();
  }

  /**
   * 平移坐标系
   * @param x X轴偏移量
   * @param y Y轴偏移量
   */
  translate(x: number, y: number): void {
    if (!this.ctx) return;
    this.ctx.translate(x, y);
  }

  /**
   * 清除背景
   */
  private clearBackground(): void {
    if (!this.ctx || !this.options) return;

    const { width, height } = this.options;
    
    // 清除整个画布
    this.ctx.clearRect(0, 0, width, height);

    // 如果设置了背景色，填充背景
    if (this.options.background) {
      this.ctx.save();
      this.ctx.fillStyle = this.options.background.toString();
      this.ctx.globalAlpha = this.options.backgroundAlpha ?? 1;
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.restore();
    }
  }

  /**
   * 绘制文本
   * @param options 文本绘制选项
   */
  drawText(options: {
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    color?: string;
    lineHeight?: number;
    textAlign?: "left" | "center" | "right";
    textBaseline?: "top" | "middle" | "bottom";
    lines?: string[];
  }): void {
    if (!this.ctx) return;

    this.ctx.save();

    // 设置字体样式
    const fontSize = options.fontSize || 16;
    const fontFamily = options.fontFamily || "Arial, sans-serif";
    const fontWeight = options.fontWeight || "normal";
    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // 设置文本颜色
    this.ctx.fillStyle = options.color || "#000000";

    // 设置文本对齐
    this.ctx.textAlign = options.textAlign || "left";
    this.ctx.textBaseline = options.textBaseline || "top";

    // 如果提供了分行文本，使用分行渲染
    if (options.lines && options.lines.length > 0) {
      const lineHeight = options.lineHeight || fontSize * 1.2;
      let currentY = options.y;

      for (const line of options.lines) {
        this.ctx.fillText(line, options.x, currentY);
        currentY += lineHeight;
      }
    } else {
      // 单行文本渲染
      this.ctx.fillText(options.text, options.x, options.y);
    }

    this.ctx.restore();
  }

  /**
   * 绘制矩形
   * @param options 矩形绘制选项
   */
  drawRect(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }): void {
    if (!this.ctx) return;

    this.ctx.save();

    // 绘制填充
    if (options.fill) {
      this.ctx.fillStyle = options.fill;
      this.ctx.fillRect(options.x, options.y, options.width, options.height);
    }

    // 绘制边框
    if (options.stroke) {
      this.ctx.strokeStyle = options.stroke;
      this.ctx.lineWidth = options.strokeWidth || 1;
      this.ctx.strokeRect(options.x, options.y, options.width, options.height);
    }

    this.ctx.restore();
  }

  /**
   * 绘制图片
   * @param options 图片绘制选项
   */
  drawImage(options: {
    image: HTMLImageElement;
    x: number;
    y: number;
    width: number;
    height: number;
    sx?: number;
    sy?: number;
    sWidth?: number;
    sHeight?: number;
  }): void {
    if (!this.ctx) return;

    this.ctx.save();

    try {
      if (
        options.sx !== undefined &&
        options.sy !== undefined &&
        options.sWidth !== undefined &&
        options.sHeight !== undefined
      ) {
        // 带裁剪的图片绘制
        this.ctx.drawImage(
          options.image,
          options.sx,
          options.sy,
          options.sWidth,
          options.sHeight,
          options.x,
          options.y,
          options.width,
          options.height
        );
      } else {
        // 简单图片绘制
        this.ctx.drawImage(
          options.image,
          options.x,
          options.y,
          options.width,
          options.height
        );
      }
    } catch (error) {
      console.warn("Failed to draw image:", error);
    }

    this.ctx.restore();
  }
}