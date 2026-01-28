import type { IRenderer } from '@/renderer/IRenderer';

import {
  Widget,
  type BoxConstraints,
  type BuildContext,
  type Size,
  type WidgetProps,
} from '@/core/base';
import {
  applySteps,
  composeSteps,
  IDENTITY_MATRIX,
  multiply,
  multiplyTranslate,
} from '@/core/helper/transform';

type BlurBoundaryProps = WidgetProps & {
  /**
   * 是否开启模糊
   * - 关闭时等价于普通容器，直接绘制子树
   * - 开启时：优先复用缓存结果，仅在必要时重算
   */
  enabled?: boolean;
  /**
   * 模糊半径（CSS 像素）
   * 注意：内部会对离屏图做下采样，因此实际在低分辨率上应用的 blur 会按比例缩放
   */
  radius?: number;
  /**
   * 外部缓存键
   * - 用于在“内容语义变化”但布局尺寸未变时强制刷新缓存（例如主题切换）
   */
  cacheKey?: string | number;
  /**
   * 捕获节流窗口（ms）
   * - 仅当检测到需要刷新缓存但仍处于窗口内时才会触发尾随更新
   * - 未发生变化时不会主动重复执行
   */
  throttleMs?: number;
};

type Rect = { x: number; y: number; width: number; height: number };

type CanvasLike = HTMLCanvasElement | OffscreenCanvas;
type CtxLike = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type CanvasBundle = { canvas: CanvasLike; ctx: CtxLike; width: number; height: number };

export class BlurBoundary extends Widget<BlurBoundaryProps> {
  private lastEnabled = false;
  private lastCaptureAt = -1;
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingTrailingCapture = false;

  // 离屏源图层：用于捕获子树的原始渲染结果（CSS 像素已按 DPR 转为物理像素）
  private sourceLayer: CanvasBundle | null = null;
  // 下采样 + blur 的中间层：显著降低 blur 的采样负担，减少 GPU/CPU 压力
  private downsampleLayer: CanvasBundle | null = null;
  // 最终模糊结果缓存：每帧只做一次 drawImage 合成即可
  private blurredLayer: CanvasBundle | null = null;

  private cacheRadius = 0;
  private cacheKey: string | number | undefined;
  private cacheDpr = 1;
  private cacheWidth = 0;
  private cacheHeight = 0;
  private cacheValid = false;
  // 用于判断“源图是否变化”：只有源图发生更新时才需要重跑模糊流水线
  private sourcePaintStamp = 0;
  private blurredFromSourcePaintStamp = -1;

  constructor(data: BlurBoundaryProps) {
    super({ ...data, type: 'BlurBoundary' });
  }

  override dispose(): void {
    if (this.throttleTimer !== null) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    super.dispose();
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    if (childrenSizes.length > 0) {
      return childrenSizes[0];
    }
    const w = Number.isFinite(constraints.maxWidth) ? constraints.maxWidth : 0;
    const h = Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 0;
    return { width: w, height: h };
  }

  private invalidateCache(): void {
    this.cacheValid = false;
    this.cacheRadius = 0;
    this.cacheKey = undefined;
    this.lastCaptureAt = -1;
    this.pendingTrailingCapture = false;
    this.blurredFromSourcePaintStamp = -1;
  }

  private static normalizeRect(r: Rect): Rect {
    const x0 = Math.floor(r.x);
    const y0 = Math.floor(r.y);
    const x1 = Math.ceil(r.x + r.width);
    const y1 = Math.ceil(r.y + r.height);
    return {
      x: x0,
      y: y0,
      width: Math.max(0, x1 - x0),
      height: Math.max(0, y1 - y0),
    };
  }

  private createCanvasBundle(w: number, h: number): CanvasBundle | null {
    if (w <= 0 || h <= 0) {
      return null;
    }

    if (typeof OffscreenCanvas === 'function') {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
      if (!ctx) {
        return null;
      }
      return { canvas, ctx, width: w, height: h };
    }

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
      if (!ctx) {
        return null;
      }
      return { canvas, ctx, width: w, height: h };
    }

    return null;
  }

  private ensureBundle(bundle: CanvasBundle | null, w: number, h: number): CanvasBundle | null {
    if (w <= 0 || h <= 0) {
      return null;
    }
    if (bundle && bundle.width === w && bundle.height === h) {
      return bundle;
    }
    return this.createCanvasBundle(w, h);
  }

  private scheduleTrailingCapture(delay: number): void {
    if (this.throttleTimer !== null || this.pendingTrailingCapture) {
      return;
    }
    this.pendingTrailingCapture = true;
    if (typeof setTimeout !== 'function') {
      return;
    }
    this.throttleTimer = setTimeout(
      () => {
        this.throttleTimer = null;
        this.pendingTrailingCapture = false;
        if (this._disposed) {
          return;
        }
        this.markNeedsPaint();
      },
      Math.max(0, delay),
    );
  }

  paint(context: BuildContext): void {
    const parentOpacity = typeof context.opacity === 'number' ? context.opacity : 1;
    let selfOpacity = typeof this.props.opacity === 'number' ? (this.props.opacity as number) : 1;
    if (!isFinite(selfOpacity)) {
      selfOpacity = 1;
    }
    if (selfOpacity < 0) {
      selfOpacity = 0;
    } else if (selfOpacity > 1) {
      selfOpacity = 1;
    }
    const nextOpacity = parentOpacity * selfOpacity;
    const nextContext =
      nextOpacity === parentOpacity ? context : { ...context, opacity: nextOpacity };

    const enabled = this.props.enabled === true;
    const radius = typeof this.props.radius === 'number' ? this.props.radius : 10;
    const cacheKey = this.props.cacheKey;
    const throttleMsRaw = this.props.throttleMs;
    const throttleMs =
      typeof throttleMsRaw === 'number' && isFinite(throttleMsRaw)
        ? Math.max(0, throttleMsRaw)
        : 120;

    if (!enabled) {
      this.isRepaintBoundary = false;
      if (this.lastEnabled) {
        this.invalidateCache();
      }
      this.lastEnabled = false;
      this._performPaint(nextContext);
      this._needsPaint = false;
      return;
    }

    // 启用 RepaintBoundary：将子树绘制缓存成 Layer，后续只在子树脏时更新源图
    this.isRepaintBoundary = true;

    const steps = this.getSelfTransformSteps();
    const parentMatrix = context.worldMatrix ?? IDENTITY_MATRIX;
    const currentMatrix =
      steps.length === 1 && steps[0].t === 'translate'
        ? multiplyTranslate(parentMatrix, steps[0].x, steps[0].y)
        : multiply(parentMatrix, composeSteps(steps));

    const bounds = this.getBoundingBox(currentMatrix);
    const rect = BlurBoundary.normalizeRect(bounds);

    if (context.dirtyRect) {
      const dr = context.dirtyRect;
      const noIntersection =
        rect.x > dr.x + dr.width ||
        rect.x + rect.width < dr.x ||
        rect.y > dr.y + dr.height ||
        rect.y + rect.height < dr.y;
      if (noIntersection) {
        return;
      }
    }

    const renderer = nextContext.renderer;
    const dpr = renderer.getResolution ? renderer.getResolution() : 1;
    const w = Math.max(0, this.renderObject.size.width);
    const h = Math.max(0, this.renderObject.size.height);
    const pixelW = Math.max(1, Math.ceil(w * dpr));
    const pixelH = Math.max(1, Math.ceil(h * dpr));

    const downsampleScale = 0.25;
    const smallW = Math.max(1, Math.ceil(pixelW * downsampleScale));
    const smallH = Math.max(1, Math.ceil(pixelH * downsampleScale));
    const blurR = Math.max(0, radius * downsampleScale);

    const cacheMatches =
      this.cacheValid &&
      this.lastEnabled &&
      this.cacheWidth === pixelW &&
      this.cacheHeight === pixelH &&
      this.cacheDpr === dpr &&
      this.cacheRadius === radius &&
      this.cacheKey === cacheKey;

    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    const canUseLayerSource =
      nextContext.enableOffscreenRendering !== false &&
      !!this.runtime &&
      typeof this.runtime.getRenderer === 'function';

    let sourceCanvas: CanvasLike | null = null;

    if (canUseLayerSource) {
      const hadLayer = this._layer !== null;
      const sizeMismatch =
        hadLayer && (this._layer!.canvas.width !== pixelW || this._layer!.canvas.height !== pixelH);
      const wasDirty = this._needsPaint || !hadLayer || sizeMismatch;
      if (sizeMismatch) {
        this._needsPaint = true;
      }

      // 直接复用 Widget 基类的 RepaintBoundary Layer 作为“源图”
      this.updateLayer();

      if (wasDirty && this._layer) {
        this.sourcePaintStamp++;
      }

      sourceCanvas = this._layer?.canvas ?? null;
    }

    if (!canUseLayerSource) {
      this._updateChildrenMatrices(currentMatrix);

      const hadSource = this.sourceLayer !== null;
      const sizeMismatch =
        hadSource && (this.sourceLayer!.width !== pixelW || this.sourceLayer!.height !== pixelH);

      this.sourceLayer = this.ensureBundle(this.sourceLayer, pixelW, pixelH);
      const shouldCaptureSource = this._needsPaint || !hadSource || sizeMismatch;

      if (this.sourceLayer && shouldCaptureSource) {
        // 降级路径：没有可用的 RepaintBoundary Layer 时，手动把子树绘制到离屏 canvas
        const sourceCtx = this.sourceLayer.ctx;
        sourceCtx.setTransform(1, 0, 0, 1, 0, 0);
        sourceCtx.globalAlpha = 1;
        sourceCtx.filter = 'none';
        sourceCtx.clearRect(0, 0, pixelW, pixelH);
        sourceCtx.save();
        sourceCtx.scale(dpr, dpr);

        const LayerRendererClass = renderer.constructor as new () => IRenderer;
        const layerRenderer = new LayerRendererClass();
        layerRenderer.setContext(sourceCtx);

        this._performPaint(
          {
            ...nextContext,
            renderer: layerRenderer,
            worldMatrix: IDENTITY_MATRIX,
            dirtyRect: undefined,
            opacity: 1,
          },
          { dx: 0, dy: 0 },
        );

        sourceCtx.restore();
        this.sourcePaintStamp++;
      }

      sourceCanvas = this.sourceLayer?.canvas ?? null;
    }

    const needRecompute =
      !cacheMatches ||
      this.blurredFromSourcePaintStamp !== this.sourcePaintStamp ||
      !this.blurredLayer ||
      !this.downsampleLayer;

    const sizeChanged =
      this.cacheWidth !== pixelW || this.cacheHeight !== pixelH || this.cacheDpr !== dpr;
    const canSkipByThrottle =
      needRecompute &&
      sizeChanged &&
      throttleMs > 0 &&
      this.cacheValid &&
      this.lastCaptureAt >= 0 &&
      now - this.lastCaptureAt < throttleMs;

    if (canSkipByThrottle) {
      this.scheduleTrailingCapture(this.lastCaptureAt + throttleMs - now);
    }

    if (canUseLayerSource && !sourceCanvas) {
      this._updateChildrenMatrices(currentMatrix);
    }

    if (!canSkipByThrottle && needRecompute && sourceCanvas) {
      this.downsampleLayer = this.ensureBundle(this.downsampleLayer, smallW, smallH);
      this.blurredLayer = this.ensureBundle(this.blurredLayer, pixelW, pixelH);

      if (this.downsampleLayer && this.blurredLayer) {
        // 低分辨率做 blur，再放大回目标分辨率：在肉眼可接受的范围内，能把成本压到很低
        const smallCtx = this.downsampleLayer.ctx;
        smallCtx.setTransform(1, 0, 0, 1, 0, 0);
        smallCtx.globalAlpha = 1;
        smallCtx.filter = 'none';
        smallCtx.clearRect(0, 0, smallW, smallH);
        smallCtx.imageSmoothingEnabled = true;
        smallCtx.save();
        smallCtx.filter = `blur(${blurR}px)`;
        smallCtx.drawImage(sourceCanvas as unknown as CanvasImageSource, 0, 0, smallW, smallH);
        smallCtx.restore();

        const blurCtx = this.blurredLayer.ctx;
        blurCtx.setTransform(1, 0, 0, 1, 0, 0);
        blurCtx.globalAlpha = 1;
        blurCtx.filter = 'none';
        blurCtx.clearRect(0, 0, pixelW, pixelH);
        blurCtx.imageSmoothingEnabled = true;
        blurCtx.drawImage(
          this.downsampleLayer.canvas as unknown as CanvasImageSource,
          0,
          0,
          smallW,
          smallH,
          0,
          0,
          pixelW,
          pixelH,
        );

        this.cacheWidth = pixelW;
        this.cacheHeight = pixelH;
        this.cacheDpr = dpr;
        this.cacheRadius = radius;
        this.cacheKey = cacheKey;
        this.cacheValid = true;
        this.lastCaptureAt = now;
        this.blurredFromSourcePaintStamp = this.sourcePaintStamp;
      }
    }

    if (this.cacheValid && this.blurredLayer) {
      // 合成阶段：只绘制缓存的模糊结果，避免重复执行 blur
      renderer.save();
      try {
        applySteps(renderer, steps);
        if (nextOpacity !== 1) {
          renderer.setGlobalAlpha?.(nextOpacity);
        }
        renderer.drawImage({
          image: this.blurredLayer.canvas,
          x: 0,
          y: 0,
          width: w,
          height: h,
        });
      } finally {
        renderer.restore();
      }
    }

    this._needsPaint = false;
    this.lastEnabled = true;
  }
}
