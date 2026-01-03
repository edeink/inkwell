import type { IRenderer, RendererOptions } from '../IRenderer';

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
    this.canvas = document.createElement('canvas');
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    this.canvas.style.width = `${options.width}px`;
    this.canvas.style.height = `${options.height}px`;

    // 获取 2D 渲染上下文
    this.ctx = this.canvas.getContext('2d', {
      alpha: options.backgroundAlpha !== 1,
    });

    if (!this.ctx) {
      throw new Error('Failed to get 2D rendering context');
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
      this.ctx.imageSmoothingQuality = 'high';
    }

    // 设置背景色
    if (options.background) {
      this.clearBackground();
    }

    // 将 Canvas 添加到容器
    this.container.appendChild(this.canvas);
  }

  update(options: Partial<RendererOptions>): void {
    if (!this.canvas || !this.ctx) {
      return;
    }
    const next: RendererOptions = {
      width: options.width ?? this.options?.width ?? this.canvas.width,
      height: options.height ?? this.options?.height ?? this.canvas.height,
      antialias: options.antialias ?? this.options?.antialias,
      resolution: options.resolution ?? this.options?.resolution,
      background: options.background ?? this.options?.background,
      backgroundAlpha: options.backgroundAlpha ?? this.options?.backgroundAlpha,
    } as RendererOptions;
    const dw = next.width;
    const dh = next.height;
    const cw = this.options?.width ?? dw;
    const ch = this.options?.height ?? dh;
    if (dw !== cw || dh !== ch) {
      this.resize(dw, dh);
    } else {
      this.options = { ...(this.options ?? next), ...next } as RendererOptions;
    }
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
      this.ctx.imageSmoothingQuality = 'high';
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

  getResolution(): number {
    return this.options?.resolution || 1;
  }

  /**
   * 获取原始渲染器实例
   * @returns Canvas 2D Context
   */
  getRawInstance(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  /**
   * 设置外部渲染上下文（用于离屏渲染）
   * @param ctx 外部传入的 Context
   * @returns 恢复原始 Context 的函数
   */
  setContext(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): () => void {
    const oldCtx = this.ctx;
    const oldCanvas = this.canvas;

    // @ts-ignore
    this.ctx = ctx;
    // @ts-ignore
    this.canvas = ctx.canvas;

    return () => {
      this.ctx = oldCtx;
      this.canvas = oldCanvas;
    };
  }

  /**
   * 保存当前绘图状态
   */
  save(): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.save();
    // 保存当前变换矩阵
    this.transformStack.push(this.ctx.getTransform());
  }

  /**
   * 恢复之前保存的绘图状态
   */
  restore(): void {
    if (!this.ctx) {
      return;
    }
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
    if (!this.ctx) {
      return;
    }
    this.ctx.translate(x, y);
  }

  scale(sx: number, sy: number): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.scale(sx, sy);
  }

  rotate(rad: number): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.rotate(rad);
  }

  /**
   * 清除背景
   */
  private clearBackground(): void {
    if (!this.ctx || !this.options) {
      return;
    }

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
    textAlign?: 'left' | 'center' | 'right';
    textBaseline?: 'top' | 'middle' | 'bottom';
    lines?: string[];
  }): void {
    if (!this.ctx) {
      return;
    }

    this.ctx.save();

    // 设置字体样式
    const fontSize = options.fontSize || 16;
    const fontFamily = options.fontFamily || 'Arial, sans-serif';
    const fontWeight = options.fontWeight || 'normal';
    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // 设置文本颜色
    this.ctx.fillStyle = options.color || '#000000';

    // 设置文本对齐
    this.ctx.textAlign = options.textAlign || 'left';
    this.ctx.textBaseline = options.textBaseline || 'top';

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
    borderRadius?:
      | number
      | {
          topLeft: number;
          topRight: number;
          bottomLeft: number;
          bottomRight: number;
        };
  }): void {
    if (!this.ctx) {
      return;
    }

    this.ctx.save();

    const r = normalizeRadius(options.borderRadius);

    if (r.total === 0) {
      // 普通矩形
      if (options.fill) {
        this.ctx.fillStyle = options.fill;
        this.ctx.fillRect(options.x, options.y, options.width, options.height);
      }
      if (options.stroke) {
        this.ctx.strokeStyle = options.stroke;
        this.ctx.lineWidth = options.strokeWidth || 1;
        this.ctx.strokeRect(options.x, options.y, options.width, options.height);
      }
    } else {
      // 圆角矩形
      const { x, y, width, height } = options;
      this.ctx.beginPath();
      roundedRectPath(this.ctx, x, y, width, height, r);
      this.ctx.closePath();
      if (options.fill) {
        this.ctx.fillStyle = options.fill;
        this.ctx.fill();
      }
      if (options.stroke) {
        this.ctx.strokeStyle = options.stroke;
        this.ctx.lineWidth = options.strokeWidth || 1;
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  // helper functions moved to file scope after class

  /**
   * 绘制图片
   * @param options 图片绘制选项
   */
  drawImage(options: {
    image: HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;
    x: number;
    y: number;
    width: number;
    height: number;
    sx?: number;
    sy?: number;
    sWidth?: number;
    sHeight?: number;
  }): void {
    if (!this.ctx) {
      return;
    }

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
          options.image as HTMLImageElement,
          options.sx,
          options.sy,
          options.sWidth,
          options.sHeight,
          options.x,
          options.y,
          options.width,
          options.height,
        );
      } else {
        // 简单图片绘制
        this.ctx.drawImage(
          options.image as HTMLImageElement,
          options.x,
          options.y,
          options.width,
          options.height,
        );
      }
    } catch (error) {
      console.warn('Failed to draw image:', error);
    }

    this.ctx.restore();
  }

  drawLine(options: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke?: string;
    strokeWidth?: number;
    dash?: number[];
  }): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(options.x1, options.y1);
    this.ctx.lineTo(options.x2, options.y2);
    this.ctx.strokeStyle = options.stroke || '#000';
    this.ctx.lineWidth = options.strokeWidth || 1;
    if (options.dash && options.dash.length) {
      this.ctx.setLineDash(options.dash);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawPath(options: {
    points: Array<{ x: number; y: number }>;
    close?: boolean;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    dash?: number[];
  }): void {
    if (!this.ctx) {
      return;
    }
    const pts = options.points || [];
    if (pts.length === 0) {
      return;
    }
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      this.ctx.lineTo(pts[i].x, pts[i].y);
    }
    if (options.close) {
      this.ctx.closePath();
    }
    if (options.fill) {
      this.ctx.fillStyle = options.fill;
      this.ctx.fill();
    }
    if (options.stroke || options.strokeWidth) {
      this.ctx.strokeStyle = options.stroke || '#000';
      this.ctx.lineWidth = options.strokeWidth || 1;
      if (options.dash && options.dash.length) {
        this.ctx.setLineDash(options.dash);
      }
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}

function normalizeRadius(
  radius?: number | { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number },
) {
  const r =
    typeof radius === 'number'
      ? { topLeft: radius, topRight: radius, bottomLeft: radius, bottomRight: radius }
      : radius || { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
  return { ...r, total: r.topLeft + r.topRight + r.bottomLeft + r.bottomRight };
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  r: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number },
) {
  const tl = r.topLeft || 0;
  const tr = r.topRight || 0;
  const br = r.bottomRight || 0;
  const bl = r.bottomLeft || 0;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  if (tr) {
    ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
  }
  ctx.lineTo(x + width, y + height - br);
  if (br) {
    ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
  }
  ctx.lineTo(x + bl, y + height);
  if (bl) {
    ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
  }
  ctx.lineTo(x, y + tl);
  if (tl) {
    ctx.quadraticCurveTo(x, y, x + tl, y);
  }
}
