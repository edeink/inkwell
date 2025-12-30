import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Widget } from '@/core/base';
import {
  applySteps,
  composeSteps,
  IDENTITY_MATRIX,
  multiply,
  type TransformStep,
} from '@/core/helper/transform';

export interface ViewportProps extends WidgetProps {
  scale?: number;
  tx?: number;
  ty?: number;
  scrollX?: number;
  scrollY?: number;
  minScale?: number;
  maxScale?: number;
  width?: number;
  height?: number;

  // 回调
  onViewChange?: (view: { scale: number; tx: number; ty: number }) => void;
  onScroll?: (scrollX: number, scrollY: number) => void;
  onZoomAt?: (scale: number, cx: number, cy: number) => void;
}

/**
 * 核心视口组件 (Core Viewport)
 * 提供通用的视口管理逻辑，包括平移、缩放、滚动等基础功能。
 */
export class Viewport<T extends ViewportProps = ViewportProps> extends Widget<T> {
  protected _scale: number = 1;
  protected _tx: number = 0;
  protected _ty: number = 0;
  protected _scrollX: number = 0;
  protected _scrollY: number = 0;

  protected _minScale: number = 0.1;
  protected _maxScale: number = 10;

  protected _width?: number;
  protected _height?: number;

  protected _onViewChangeListeners: Set<(view: { scale: number; tx: number; ty: number }) => void> =
    new Set();
  protected _onScrollListeners: Set<(scrollX: number, scrollY: number) => void> = new Set();

  constructor(props: T) {
    super(props);
    this.initViewport(props);
  }

  protected initViewport(props: T): void {
    this._scale = props.scale ?? this._scale;
    this._tx = props.tx ?? this._tx;
    this._ty = props.ty ?? this._ty;
    this._scrollX = props.scrollX ?? this._scrollX;
    this._scrollY = props.scrollY ?? this._scrollY;
    this._minScale = props.minScale ?? this._minScale;
    this._maxScale = props.maxScale ?? this._maxScale;
    this._width = props.width;
    this._height = props.height;

    if (props.onViewChange) {
      this._onViewChangeListeners.add(props.onViewChange);
    }
    if (props.onScroll) {
      this._onScrollListeners.add(props.onScroll);
    }
  }

  createElement(props: T): Widget<T> {
    super.createElement(props);
    this.initViewport(props);
    return this;
  }

  // --- 属性获取 ---

  get scale(): number {
    return this._scale;
  }
  get tx(): number {
    return this._tx;
  }
  get ty(): number {
    return this._ty;
  }
  get scrollX(): number {
    return this._scrollX;
  }
  get scrollY(): number {
    return this._scrollY;
  }
  get width(): number {
    return this._width || 0;
  }
  get height(): number {
    return this._height || 0;
  }

  /**
   * 获取视口在屏幕上的绝对位置
   * 用于将屏幕坐标转换为视口内坐标
   */
  // getAbsolutePosition() moved to bottom to match Offset return type implementation

  // --- Listeners ---

  addViewChangeListener(fn: (view: { scale: number; tx: number; ty: number }) => void): () => void {
    this._onViewChangeListeners.add(fn);
    return () => this._onViewChangeListeners.delete(fn);
  }

  addScrollListener(fn: (scrollX: number, scrollY: number) => void): () => void {
    this._onScrollListeners.add(fn);
    return () => this._onScrollListeners.delete(fn);
  }

  protected notifyViewChange(scale: number, tx: number, ty: number) {
    this.data.onViewChange?.({ scale, tx, ty });
    this._onViewChangeListeners.forEach((fn) => fn({ scale, tx, ty }));
  }

  protected notifyScroll(scrollX: number, scrollY: number) {
    this.data.onScroll?.(scrollX, scrollY);
    this._onScrollListeners.forEach((fn) => fn(scrollX, scrollY));
  }

  // --- Actions ---

  protected clampScale(s: number): number {
    return Math.max(this._minScale, Math.min(this._maxScale, s));
  }

  public setTransform(scale: number, tx: number, ty: number): void {
    const s = this.clampScale(scale);
    const nx = Number.isFinite(tx) ? tx : this._tx;
    const ny = Number.isFinite(ty) ? ty : this._ty;

    if (this._scale !== s || this._tx !== nx || this._ty !== ny) {
      this._scale = s;
      this._tx = nx;
      this._ty = ny;
      this.notifyViewChange(s, nx, ny);
      this.markDirty();
    }
  }

  public scrollTo(x: number, y: number): void {
    const nx = Number.isFinite(x) ? x : this._scrollX;
    const ny = Number.isFinite(y) ? y : this._scrollY;

    if (this._scrollX !== nx || this._scrollY !== ny) {
      this._scrollX = nx;
      this._scrollY = ny;
      this.notifyScroll(nx, ny);
      this.markDirty();
    }
  }

  public scrollBy(dx: number, dy: number): void {
    this.scrollTo(this._scrollX + dx, this._scrollY + dy);
  }

  public setScale(scale: number): void {
    this.setTransform(scale, this._tx, this._ty);
  }

  public zoomIn(): void {
    const cx = (this._width || 0) / 2;
    const cy = (this._height || 0) / 2;
    const scale = this.clampScale(this.scale * 1.2);
    this.executeZoom(scale, cx, cy);
  }

  public zoomOut(): void {
    const cx = (this._width || 0) / 2;
    const cy = (this._height || 0) / 2;
    const scale = this.clampScale(this.scale / 1.2);
    this.executeZoom(scale, cx, cy);
  }

  public zoomAt(scale: number, cx: number, cy: number): void {
    this.executeZoom(scale, cx, cy);
  }

  public resetZoom(): void {
    const cx = (this._width || 0) / 2;
    const cy = (this._height || 0) / 2;
    this.executeZoom(1, cx, cy);
  }

  /**
   * 执行缩放，保持中心点不变
   * 子类可以覆盖此方法以实现更复杂的逻辑（如撤销/重做记录）
   */
  protected executeZoom(targetScale: number, cx: number, cy: number): void {
    // 计算新的 tx, ty
    // 屏幕坐标 = (内容坐标 - scroll) * scale + tx
    // 内容坐标 = (屏幕坐标 - tx) / scale + scroll

    // 保持点 (cx, cy) 在内容空间中的位置不变
    const contentX = (cx - this._tx) / this._scale + this._scrollX;
    const contentY = (cy - this._ty) / this._scale + this._scrollY;

    const s = targetScale;

    // 新的 tx 使得：cx = (contentX - scrollX) * s + newTx
    // newTx = cx - (contentX - scrollX) * s

    const tx = cx - (contentX - this._scrollX) * s;
    const ty = cy - (contentY - this._scrollY) * s;

    this.setTransform(s, tx, ty);

    this.data.onZoomAt?.(s, cx, cy);
  }

  // --- Layout & Painting ---

  applyPaintTransform(child: Widget, transform: number[]): void {
    const s = this._scale;
    const tx = this._tx;
    const ty = this._ty;

    const a = transform[0];
    const b = transform[1];
    const c = transform[2];
    const d = transform[3];
    const x = transform[4];
    const y = transform[5];

    transform[0] = a * s;
    transform[1] = b * s;
    transform[2] = c * s;
    transform[3] = d * s;
    transform[4] = a * tx + c * ty + x;
    transform[5] = b * tx + d * ty + y;

    super.applyPaintTransform(child, transform);
  }

  /**
   * 绘制组件自身
   */
  paint(context: BuildContext): void {
    if (this.isRepaintBoundary) {
      // @ts-ignore - access private method from base
      this._paintWithLayer(context);
      return;
    }

    // 1. Apply Self Transform (Position in Parent)
    const steps = this.getSelfTransformSteps();
    const local = composeSteps(steps);
    const prev = context.worldMatrix ?? IDENTITY_MATRIX;
    const next = multiply(prev, local);
    this._worldMatrix = next;

    context.renderer?.save?.();
    applySteps(context.renderer, steps);

    // 2. Paint Self (Background, Scrollbars, etc.)
    this.paintSelf({ ...context, worldMatrix: next });

    // 3. Apply View Transform (Scale, Tx, Ty) for Children
    // Matrix Order: T * S * p (Scale first, then Translate)
    const viewSteps: TransformStep[] = [
      { t: 'translate', x: this._tx, y: this._ty },
      { t: 'scale', sx: this._scale, sy: this._scale },
    ];

    applySteps(context.renderer, viewSteps);
    const viewLocal = composeSteps(viewSteps);
    const childMatrix = multiply(next, viewLocal);

    // 4. Paint Children
    const children = this.children.slice().sort((a, b) => a.zIndex - b.zIndex);
    for (const child of children) {
      child.paint({ ...context, worldMatrix: childMatrix });
    }

    context.renderer?.restore?.();
    // @ts-ignore
    this._needsPaint = false;
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const childMaxW = childrenSizes.length ? Math.max(...childrenSizes.map((s) => s.width)) : 0;
    const childMaxH = childrenSizes.length ? Math.max(...childrenSizes.map((s) => s.height)) : 0;

    const w0 = this._width ?? childMaxW;
    const h0 = this._height ?? childMaxH;

    const w = Math.max(constraints.minWidth, Math.min(w0, constraints.maxWidth));
    const h = Math.max(constraints.minHeight, Math.min(h0, constraints.maxHeight));

    this._width = isFinite(w) ? w : 800; // Default width
    this._height = isFinite(h) ? h : 600; // Default height

    return { width: this._width, height: this._height };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    _childIndex: number,
  ): BoxConstraints {
    // 默认允许子元素无限大，或者受限于视口（取决于具体需求）
    // 这里保持 MindMapViewport 的逻辑：允许无限大
    return {
      minWidth: 0,
      maxWidth: constraints.maxWidth, // 或者 Infinity? MindMapViewport 使用 constraints.maxWidth
      minHeight: 0,
      maxHeight: constraints.maxHeight,
    };
  }

  protected positionChild(_childIndex: number, _childSize: Size): Offset {
    // 应用滚动偏移
    return { dx: -this._scrollX, dy: -this._scrollY };
  }

  // --- Helper Methods ---

  // 将屏幕坐标转换为世界坐标（内容坐标）
  public getWorldXY(e: { x: number; y: number } | InkwellEvent): { x: number; y: number } {
    const evtX = e.x;
    const evtY = e.y;

    // 需要获取视口自身的绝对位置
    // 由于 Widget.getAbsolutePosition 不存在，我们需要实现它或者假设外部传入相对坐标
    // 暂时假设 e.x/e.y 是相对于 Canvas 的全局坐标，我们需要减去视口的 offset

    // 注意：MindMapViewport 中的实现依赖于 this.getAbsolutePosition()，这是它自己实现的方法吗？
    // 检查 MindMapViewport 源码，它确实调用了 this.getAbsolutePosition()
    // 但 Widget 基类没有这个方法。可能是在 MindMapViewport 中混入或者它其实是一个扩展方法。
    // 在 core/base.ts 中，Widget 没有 getAbsolutePosition。
    // 让我们看看 MindMapViewport 怎么实现的...
    // 其实 MindMapViewport 源码里并没有定义 getAbsolutePosition，
    // 可能是通过 renderObject 获取，或者它其实是 RenderObjectWidget？
    // MindMapViewport 继承 Widget。
    // 实际上，RenderObject 有 globalToLocal 等方法。

    // 为了通用性，我们应该依赖 renderObject 的 globalToLocal 吗？
    // Inkwell 的 RenderObject 体系可能支持这个。

    // 暂时我们简单模拟 MindMapViewport 的逻辑：
    // 我们需要在 Viewport 类中添加 getAbsolutePosition 逻辑，或者假设 e 已经包含了相对坐标？
    // InkwellEvent 的 x, y 是相对于 Canvas 的。

    // 我们先实现一个简单的 getAbsolutePosition，向上遍历父级
    let dx = 0;
    let dy = 0;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curr: Widget | null = this;
    while (curr) {
      if (curr.renderObject && curr.renderObject.offset) {
        dx += curr.renderObject.offset.dx;
        dy += curr.renderObject.offset.dy;
      }
      curr = curr.parent;
    }

    const vpPos = { dx, dy };

    const x = (evtX - vpPos.dx - this._tx) / this._scale + this._scrollX;
    const y = (evtY - vpPos.dy - this._ty) / this._scale + this._scrollY;
    return { x, y };
  }

  public getLocalCoords(native: Event): { x: number; y: number } {
    const target = native.target as Element;
    const rect = target?.getBoundingClientRect?.() ?? { left: 0, top: 0 };

    let clientX = 0;
    let clientY = 0;

    const m = native as MouseEvent;
    if (typeof m.clientX === 'number') {
      clientX = m.clientX;
      clientY = m.clientY;
    } else {
      const t = (native as TouchEvent).changedTouches?.[0];
      if (t) {
        clientX = t.clientX;
        clientY = t.clientY;
      }
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }
}
