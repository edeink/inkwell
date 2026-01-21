import type { IRenderer, RendererOptions } from '../IRenderer';

/**
 * Canvas2D 渲染器实现
 * 基于原生 HTML5 Canvas 2D Context
 */
type BorderRadius =
  | number
  | { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number };

export class Canvas2DRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private container: HTMLElement | null = null;
  private options: RendererOptions | null = null;
  private transformStack: Array<DOMMatrix> = [];
  private _cachedFillStyle: string | CanvasGradient | CanvasPattern = '';
  private _cachedStrokeStyle: string | CanvasGradient | CanvasPattern = '';
  private _cachedLineWidth: number = 1;
  private _cachedFont: string = '';

  /**
   * 初始化渲染器
   *
   * @description
   * 创建 Canvas 元素，获取 2D 上下文，并配置初始状态。
   * 支持高分辨率屏幕 (Retina)，自动缩放 Canvas 以保持清晰度。
   *
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

    // 重置缓存状态
    this._cachedFillStyle = '';
    this._cachedStrokeStyle = '';
    this._cachedLineWidth = 1;
    this._cachedFont = '';

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

  getWidth(): number {
    return this.options?.width ?? 0;
  }

  getHeight(): number {
    return this.options?.height ?? 0;
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
   *
   * @description
   * 更新 Canvas 尺寸，并重新应用缩放比例和抗锯齿设置。
   *
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
   * 获取 Canvas 元素
   */
  getCanvas(): HTMLCanvasElement | OffscreenCanvas | null {
    return this.canvas;
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
  }

  /**
   * 恢复之前保存的绘图状态
   */
  restore(): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.restore();
    // Context 状态回滚后，缓存的状态已失效，必须重置
    this._cachedFillStyle = '';
    this._cachedStrokeStyle = '';
    this._cachedLineWidth = -1; // 使用不可能的值以确保下次设置生效
    this._cachedFont = '';
  }

  setGlobalAlpha(alpha: number): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.globalAlpha = alpha;
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

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.setTransform(a, b, c, d, e, f);
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
    fontStyle?: 'normal' | 'italic' | 'oblique';
    color?: string;
    textDecoration?: Array<'underline' | 'line-through'>;
    lineHeight?: number;
    textAlign?: 'left' | 'center' | 'right';
    textBaseline?: 'top' | 'middle' | 'bottom' | 'alphabetic';
    lines?: string[];
  }): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }

    ctx.save();

    // 设置字体样式
    const fontSize = options.fontSize || 14;
    const fontFamily =
      options.fontFamily ||
      'Noto Sans SC, Noto Sans, -apple-system, BlinkMacSystemFont, Arial, sans-serif';
    const fontWeight = options.fontWeight || 'normal';
    const fontStyle = options.fontStyle || 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

    // 设置文本颜色
    ctx.fillStyle = options.color || '#000000';

    // 设置文本对齐
    ctx.textAlign = options.textAlign || 'left';
    ctx.textBaseline = options.textBaseline || 'top';

    const drawDecorations = (text: string, x: number, baselineY: number) => {
      const decorations = options.textDecoration ?? [];
      if (decorations.length === 0) {
        return;
      }

      const m = ctx.measureText(text);
      const ascent = m.actualBoundingBoxAscent ?? fontSize * 0.8;
      const descent = m.actualBoundingBoxDescent ?? fontSize * 0.2;
      const width = m.width;
      const align = options.textAlign || 'left';
      const startX = align === 'left' ? x : align === 'center' ? x - width / 2 : x - width;

      ctx.save();
      ctx.strokeStyle = String(ctx.fillStyle);
      ctx.lineWidth = Math.max(1, Math.round(fontSize / 14));

      for (const deco of decorations) {
        if (deco === 'underline') {
          const y = baselineY + Math.max(1, descent * 0.5);
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(startX + width, y);
          ctx.stroke();
        } else if (deco === 'line-through') {
          const y = baselineY - ascent * 0.35;
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(startX + width, y);
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    // 如果提供了分行文本，使用分行渲染
    if (options.lines && options.lines.length > 0) {
      const lineHeight = options.lineHeight || fontSize * 1.2;
      let currentY = options.y;

      for (const line of options.lines) {
        ctx.fillText(line, options.x, currentY);
        drawDecorations(line, options.x, currentY);
        currentY += lineHeight;
      }
    } else {
      // 单行文本渲染
      ctx.fillText(options.text, options.x, options.y);
      drawDecorations(options.text, options.x, options.y);
    }

    ctx.restore();
  }

  /**
   * 绘制矩形
   *
   * @description
   * 绘制填充或描边的矩形，支持圆角。
   *
   * 优化策略：
   * 1. 状态缓存：检查 fillStyle/strokeStyle/lineWidth 是否变化，减少 Context 状态切换开销。
   * 2. 原生 API：优先使用 `roundRect` API 绘制圆角矩形，比手动路径快得多。
   * 3. 避免 save/restore：对于简单矩形，直接设置样式绘制，移除 save/restore 调用（显著提升性能）。
   *
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
    borderRadius?: BorderRadius;
  }): void {
    if (!this.ctx) {
      return;
    }

    // 优化：如果是数字类型的 borderRadius，且为 0，视为无圆角
    // 如果是数字且不为 0，可以直接用于 roundRect (如果支持)
    const isSimpleRadius = typeof options.borderRadius === 'number';
    const radiusVal = isSimpleRadius ? (options.borderRadius as number) : 0;

    // 无圆角情况
    if (!options.borderRadius || (isSimpleRadius && radiusVal === 0)) {
      // 普通矩形 - 优化：移除 save/restore，直接设置样式
      // 注意：这会改变 Context 状态，但由于所有绘制方法都会设置自己的状态或使用 save/restore，
      // 所以这里不恢复状态是安全的，且能显著提升性能
      if (options.fill) {
        if (this._cachedFillStyle !== options.fill) {
          this.ctx.fillStyle = options.fill;
          this._cachedFillStyle = options.fill;
        }
        this.ctx.fillRect(options.x, options.y, options.width, options.height);
      }
      if (options.stroke) {
        if (this._cachedStrokeStyle !== options.stroke) {
          this.ctx.strokeStyle = options.stroke;
          this._cachedStrokeStyle = options.stroke;
        }
        const lw = options.strokeWidth || 1;
        if (this._cachedLineWidth !== lw) {
          this.ctx.lineWidth = lw;
          this._cachedLineWidth = lw;
        }
        this.ctx.strokeRect(options.x, options.y, options.width, options.height);
      }
      return;
    }

    // 圆角矩形处理
    // 优先使用原生 roundRect API
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.beginPath();

      if (isSimpleRadius) {
        // 直接传递数字，避免数组分配
        // @ts-ignore - roundRect supports number in some implementations,
        // but spec says DOMPointInit or number?
        // MDN says: radii: A number or a sequence of numbers...
        this.ctx.roundRect(options.x, options.y, options.width, options.height, radiusVal);
      } else {
        const r = normalizeRadius(options.borderRadius);
        // roundRect 支持 [tl, tr, br, bl] 顺序
        this.ctx.roundRect(options.x, options.y, options.width, options.height, [
          r.topLeft,
          r.topRight,
          r.bottomRight,
          r.bottomLeft,
        ]);
      }

      if (options.fill) {
        if (this._cachedFillStyle !== options.fill) {
          this.ctx.fillStyle = options.fill;
          this._cachedFillStyle = options.fill;
        }
        this.ctx.fill();
      }
      if (options.stroke) {
        if (this._cachedStrokeStyle !== options.stroke) {
          this.ctx.strokeStyle = options.stroke;
          this._cachedStrokeStyle = options.stroke;
        }
        const lw = options.strokeWidth || 1;
        if (this._cachedLineWidth !== lw) {
          this.ctx.lineWidth = lw;
          this._cachedLineWidth = lw;
        }
        this.ctx.stroke();
      }
    } else {
      // 降级到手动路径
      const r = normalizeRadius(options.borderRadius);
      this.ctx.beginPath();
      roundedRectPath(this.ctx, options.x, options.y, options.width, options.height, r);
      this.ctx.closePath();

      if (options.fill) {
        if (this._cachedFillStyle !== options.fill) {
          this.ctx.fillStyle = options.fill;
          this._cachedFillStyle = options.fill;
        }
        this.ctx.fill();
      }
      if (options.stroke) {
        if (this._cachedStrokeStyle !== options.stroke) {
          this.ctx.strokeStyle = options.stroke;
          this._cachedStrokeStyle = options.stroke;
        }
        const lw = options.strokeWidth || 1;
        if (this._cachedLineWidth !== lw) {
          this.ctx.lineWidth = lw;
          this._cachedLineWidth = lw;
        }
        this.ctx.stroke();
      }
    }
  }

  // helper functions moved to file scope after class

  /**
   * 绘制图片
   *
   * @description
   * 绘制图像、画布或离屏画布到当前上下文。
   * 支持裁剪绘制 (sx, sy, sWidth, sHeight) 和 缩放绘制 (x, y, width, height)。
   *
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

  /**
   * 裁剪矩形区域
   */
  clipRect(x: number, y: number, width: number, height: number): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
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
