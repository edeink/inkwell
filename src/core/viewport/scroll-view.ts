import { expose } from '../decorators';

import { ScrollBar, type ScrollBarProps } from './scroll-bar';
import { Viewport } from './viewport';

import type { Size } from '../base';
import type { ViewportProps } from './viewport';
import type { InkwellEvent } from '@/core/events/types';

const DEFAULT_BOUNCE_DAMPING = 0.2;
const DEFAULT_RESISTANCE_FACTOR = 0.5;
const MIN_BOUNCE_DIFF = 0.5;
const BOUNCE_DEBOUNCE_TIME = 50;

export enum BounceState {
  IDLE = 'idle',
  BOUNCING = 'bouncing',
  INTERRUPTED = 'interrupted',
}

export interface ScrollViewHandle {
  scrollTo(x: number, y: number): void;
}

export interface ScrollViewProps extends ViewportProps {
  scrollBarColor?: string;
  scrollBarWidth?: number;

  /**
   * 是否始终显示垂直滚动条
   * @default true
   */
  alwaysShowScrollbarY?: boolean;

  /**
   * 是否始终显示水平滚动条
   * @default false
   */
  alwaysShowScrollbarX?: boolean;

  /**
   * 滚动条悬停颜色
   */
  scrollBarHoverColor?: string;

  /**
   * 滚动条激活(拖拽)颜色
   */
  scrollBarActiveColor?: string;

  /**
   * 滚动条轨道颜色
   */
  scrollBarTrackColor?: string;

  /**
   * 控制内容溢出显示行为
   * 'hidden': 裁剪超出视口的内容 (默认)
   * 'visible': 显示超出视口的内容
   */
  overflow?: 'hidden' | 'visible';

  /**
   * 是否开启弹性滚动
   * @default false
   */
  enableBounce?: boolean;

  /**
   * 是否开启垂直弹性
   * 如果未设置，则跟随 enableBounce
   */
  enableBounceVertical?: boolean;

  /**
   * 是否开启水平弹性
   * 如果未设置，则跟随 enableBounce
   */
  enableBounceHorizontal?: boolean;

  /**
   * 最大回弹距离
   */
  maxBounceDistance?: number;

  /**
   * 回弹动画开始时的回调
   */
  onBounceStart?: () => void;

  /**
   * 回弹动画完成时的回调
   */
  onBounceComplete?: () => void;

  /**
   * 回弹速度阈值 (px/frame)
   * 滚动速度低于此值时，可能触发回弹
   */
  bounceSpeedThreshold?: number;

  /**
   * 阻尼系数 (0-1)
   * 值越大，回弹越快
   */
  bounceDamping?: number;
}

import {
  applySteps,
  composeSteps,
  IDENTITY_MATRIX,
  invert,
  multiply,
  transformPoint,
  type TransformStep,
} from '@/core/helper/transform';

export class ScrollView extends Viewport {
  protected _contentSize: Size = { width: 0, height: 0 };
  protected _showScrollbarX = false;
  protected _showScrollbarY = false;

  protected _scrollBarX: ScrollBar;
  protected _scrollBarY: ScrollBar;

  protected _reboundTimer: ReturnType<typeof setTimeout> | null = null;
  protected _animationFrame: number | null = null;
  protected _pointerDown = false;
  protected _isInteracting = false;
  protected _bounceState: BounceState = BounceState.IDLE;
  protected _lastX = 0;
  protected _lastY = 0;

  // Track currently hovered scrollbar to handle enter/leave
  protected _hoveredScrollBar: ScrollBar | null = null;

  constructor(public data: ScrollViewProps) {
    super(data);

    this._scrollBarX = new ScrollBar({
      ...this.getScrollBarProps('horizontal'),
      viewportSize: 0,
      contentSize: 0,
      scrollPosition: 0,
    });
    this._scrollBarX.parent = this;

    this._scrollBarY = new ScrollBar({
      ...this.getScrollBarProps('vertical'),
      viewportSize: 0,
      contentSize: 0,
      scrollPosition: 0,
    });
    this._scrollBarY.parent = this;
  }

  private getScrollBarProps(orientation: 'vertical' | 'horizontal'): ScrollBarProps {
    return {
      type: 'ScrollBar',
      orientation,
      viewportSize: 0,
      contentSize: 0,
      scrollPosition: 0,
      thickness: this.data.scrollBarWidth,
      trackColor: this.data.scrollBarTrackColor,
      thumbColor: this.data.scrollBarColor,
      hoverColor: this.data.scrollBarHoverColor,
      activeColor: this.data.scrollBarActiveColor,
      onScroll: (pos) => {
        if (orientation === 'vertical') {
          this.scrollTo(this._scrollX, pos);
        } else {
          this.scrollTo(pos, this._scrollY);
        }
      },
      onDragStart: () => {
        this._isInteracting = true;
      },
      onDragEnd: () => {
        this._isInteracting = false;
        // Check rebound on drag end
        this.checkRebound();
      },
    };
  }

  private updateScrollBars() {
    // Update X
    const propsX: Partial<ScrollBarProps> = {
      viewportSize: this._width || 0,
      contentSize: this._contentSize.width,
      scrollPosition: this._scrollX,
      thickness: this.data.scrollBarWidth,
      trackColor: this.data.scrollBarTrackColor,
      thumbColor: this.data.scrollBarColor,
      hoverColor: this.data.scrollBarHoverColor,
      activeColor: this.data.scrollBarActiveColor,
    };
    this._scrollBarX.data = { ...this._scrollBarX.data, ...propsX };

    if (this._showScrollbarX) {
      const height = this.data.scrollBarWidth || 6;
      this._scrollBarX.renderObject.size = { width: this._width || 0, height };
      this._scrollBarX.renderObject.offset = { dx: 0, dy: (this._height || 0) - height - 2 };
    } else {
      this._scrollBarX.renderObject.size = { width: 0, height: 0 };
    }

    // Update Y
    const propsY: Partial<ScrollBarProps> = {
      viewportSize: this._height || 0,
      contentSize: this._contentSize.height,
      scrollPosition: this._scrollY,
      thickness: this.data.scrollBarWidth,
      trackColor: this.data.scrollBarTrackColor,
      thumbColor: this.data.scrollBarColor,
      hoverColor: this.data.scrollBarHoverColor,
      activeColor: this.data.scrollBarActiveColor,
    };
    this._scrollBarY.data = { ...this._scrollBarY.data, ...propsY };

    if (this._showScrollbarY) {
      const width = this.data.scrollBarWidth || 6;
      this._scrollBarY.renderObject.size = { width, height: this._height || 0 };
      this._scrollBarY.renderObject.offset = { dx: (this._width || 0) - width - 2, dy: 0 };
    } else {
      this._scrollBarY.renderObject.size = { width: 0, height: 0 };
    }
  }

  @expose
  public override scrollTo(x: number, y: number) {
    super.scrollTo(x, y);
    // Update scrollbar positions immediately
    this._scrollBarX.data.scrollPosition = this._scrollX;
    this._scrollBarY.data.scrollPosition = this._scrollY;
    this._scrollBarX.markNeedsPaint();
    this._scrollBarY.markNeedsPaint();
    this.markNeedsPaint();
  }

  /**
   * 重写 paint 方法以支持 overflow 裁剪
   */
  paint(context: import('../base').BuildContext): void {
    // 1. Apply Self Transform (Position in Parent)
    const steps = this.getSelfTransformSteps();
    const local = composeSteps(steps);
    const prev = context.worldMatrix ?? IDENTITY_MATRIX;
    const next = multiply(prev, local);
    this._worldMatrix = next;

    context.renderer?.save?.();
    applySteps(context.renderer, steps);

    // 2. Clipping logic (Added for ScrollView)
    // 默认为 hidden，除非显式设置为 visible
    if (this.data.overflow !== 'visible') {
      const { width, height } = this.renderObject.size;
      // 只有当尺寸有效时才裁剪
      if (width > 0 && height > 0) {
        context.renderer.clipRect(0, 0, width, height);
      }
    }

    // 3. Apply View Transform (Scale, Tx, Ty) for Children
    // Matrix Order: T * S * p (Scale first, then Translate)
    context.renderer?.save?.();
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

    // 5. Paint Scrollbars (Overlay)
    // Use 'next' matrix (local coordinate system of ScrollView, not scrolled)
    if (this._showScrollbarX && this._scrollBarX.renderObject.size.width > 0) {
      this._scrollBarX.paint({ ...context, worldMatrix: next });
    }
    if (this._showScrollbarY && this._scrollBarY.renderObject.size.width > 0) {
      this._scrollBarY.paint({ ...context, worldMatrix: next });
    }

    context.renderer?.restore?.();
  }

  dispose() {
    if (this._reboundTimer) {
      clearTimeout(this._reboundTimer);
      this._reboundTimer = null;
    }
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    this._scrollBarX.dispose();
    this._scrollBarY.dispose();
    super.dispose();
  }

  // 判断是否应触发回弹
  protected shouldBounceBack(): boolean {
    // 检查是否处于交互状态
    if (this._isInteracting) {
      return false;
    }

    const maxScrollX = Math.max(0, this._contentSize.width - (this._width || 0));
    const maxScrollY = Math.max(0, this._contentSize.height - (this._height || 0));

    // 检查是否超出边界
    const isOutOfBoundsX = this._scrollX < 0 || this._scrollX > maxScrollX;
    const isOutOfBoundsY = this._scrollY < 0 || this._scrollY > maxScrollY;

    return isOutOfBoundsX || isOutOfBoundsY;
  }

  // 执行回弹动画计算
  protected performBounceBack() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }

    // 再次检查是否需要回弹（处理中断逻辑）
    if (!this.shouldBounceBack()) {
      if (this._bounceState === BounceState.BOUNCING) {
        this._bounceState = BounceState.IDLE;
        this.data.onBounceComplete?.();
      }
      return;
    }

    if (this._bounceState !== BounceState.BOUNCING) {
      this._bounceState = BounceState.BOUNCING;
      this.data.onBounceStart?.();
    }

    const maxScrollX = Math.max(0, this._contentSize.width - (this._width || 0));
    const maxScrollY = Math.max(0, this._contentSize.height - (this._height || 0));

    let targetX = this._scrollX;
    let targetY = this._scrollY;

    // 检查水平回弹目标
    if (this._scrollX < 0) {
      targetX = 0;
    } else if (this._scrollX > maxScrollX) {
      targetX = maxScrollX;
    }

    // 检查垂直回弹目标
    if (this._scrollY < 0) {
      targetY = 0;
    } else if (this._scrollY > maxScrollY) {
      targetY = maxScrollY;
    }

    // 弹簧动画逻辑
    // 使用阻尼回弹，每帧逼近目标
    const dx = targetX - this._scrollX;
    const dy = targetY - this._scrollY;

    // 如果足够接近目标则结束动画
    if (Math.abs(dx) < MIN_BOUNCE_DIFF && Math.abs(dy) < MIN_BOUNCE_DIFF) {
      this.scrollTo(targetX, targetY);
      this._bounceState = BounceState.IDLE;
      this.data.onBounceComplete?.();
      return;
    }

    // 阻尼系数，默认 0.2，更陡峭的缓动
    const damping = this.data.bounceDamping || DEFAULT_BOUNCE_DAMPING;
    const nextX = this._scrollX + dx * damping;
    const nextY = this._scrollY + dy * damping;

    this.scrollTo(nextX, nextY);

    this._animationFrame = requestAnimationFrame(() => this.performBounceBack());
  }

  // Check if rebound is needed and animate
  protected checkRebound() {
    this.performBounceBack();
  }

  // 必须重写此方法以允许子节点超出视口
  protected getConstraintsForChild(
    constraints: import('../base').BoxConstraints,
  ): import('../base').BoxConstraints {
    const bounceH = this.data.enableBounceHorizontal;
    const bounceV = this.data.enableBounceVertical;

    const maxW = constraints.maxWidth;
    const maxH = constraints.maxHeight;
    const finiteW = Number.isFinite(maxW);
    const finiteH = Number.isFinite(maxH);

    if (bounceH === false && bounceV === true) {
      return {
        minWidth: finiteW ? maxW : 0,
        maxWidth: finiteW ? maxW : Infinity,
        minHeight: 0,
        maxHeight: Infinity,
      };
    }

    if (bounceV === false && bounceH === true) {
      return {
        minWidth: 0,
        maxWidth: Infinity,
        minHeight: finiteH ? maxH : 0,
        maxHeight: finiteH ? maxH : Infinity,
      };
    }

    return {
      minWidth: 0,
      maxWidth: Infinity,
      minHeight: 0,
      maxHeight: Infinity,
    };
  }

  // 这里的 performLayout 实际上会接收到基于 getConstraintsForChild 计算出的子节点尺寸
  protected override performLayout(
    constraints: import('../base').BoxConstraints,
    childrenSizes: Size[],
  ): Size {
    const width =
      constraints.maxWidth !== Infinity
        ? constraints.maxWidth
        : Math.max(constraints.minWidth, this.data.width || 0);
    const height =
      constraints.maxHeight !== Infinity
        ? constraints.maxHeight
        : Math.max(constraints.minHeight, this.data.height || 0);

    if (childrenSizes.length > 0) {
      this._contentSize = childrenSizes[0];
    } else {
      this._contentSize = { width: 0, height: 0 };
    }

    // 检查是否需要滚动条
    this._showScrollbarX =
      this._contentSize.width > width || (this.data.alwaysShowScrollbarX ?? false);
    // 默认开启垂直滚动条始终显示
    this._showScrollbarY =
      this._contentSize.height > height || (this.data.alwaysShowScrollbarY ?? true);

    // 修正滚动位置（防止内容缩小后滚动位置越界）
    const maxScrollX = Math.max(0, this._contentSize.width - width);
    const maxScrollY = Math.max(0, this._contentSize.height - height);

    const enableBounce = this.data.enableBounce ?? false;

    // 如果未开启弹性，则严格限制边界
    if (!enableBounce) {
      if (this._scrollX > maxScrollX) {
        this._scrollX = maxScrollX;
      }
      if (this._scrollY > maxScrollY) {
        this._scrollY = maxScrollY;
      }
      if (this._scrollX < 0) {
        this._scrollX = 0;
      }
      if (this._scrollY < 0) {
        this._scrollY = 0;
      }
    }

    // Viewport 的 performLayout 还需要设置 this.width/height 属性
    this._width = width;
    this._height = height;

    // Update ScrollBars props and layout
    this.updateScrollBars();

    return { width, height };
  }

  protected getLocalPoint(e: InkwellEvent): { x: number; y: number } {
    const ne = e.nativeEvent as PointerEvent;
    if (this._worldMatrix) {
      try {
        const inv = invert(this._worldMatrix);
        return transformPoint(inv, { x: ne.clientX, y: ne.clientY });
      } catch (err) {
        // Fallback
      }
    }
    return { x: e.x, y: e.y };
  }

  onPointerDown(e: InkwellEvent) {
    const ne = e.nativeEvent as PointerEvent;

    // Check Scrollbars (using global coordinates)
    if (this._showScrollbarY && this._scrollBarY.hitTest(ne.clientX, ne.clientY)) {
      this._scrollBarY.onPointerDown(e);
      this.markNeedsPaint();
      return;
    }

    if (this._showScrollbarX && this._scrollBarX.hitTest(ne.clientX, ne.clientY)) {
      this._scrollBarX.onPointerDown(e);
      this.markNeedsPaint();
      return;
    }

    const pointerType = (ne as unknown as { pointerType?: string } | null)?.pointerType;
    // 仅允许触摸/笔拖拽滚动；鼠标（以及不带 pointerType 的 MouseEvent）仅允许 wheel 滚动
    if (pointerType !== 'touch' && pointerType !== 'pen') {
      return;
    }

    e.stopPropagation();
    this._pointerDown = true;
    this._isInteracting = true;

    // 记录初始触摸位置
    this._lastX = ne.clientX;
    this._lastY = ne.clientY;

    // 交互开始，立即停止当前的回弹动画
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
      this._bounceState = BounceState.INTERRUPTED;
    }
  }

  onPointerMove(e: InkwellEvent) {
    const ne = e.nativeEvent as PointerEvent;

    // Always check for hover state on scrollbars
    // Use global coordinates for hitTest
    let hitAny = false;

    if (this._showScrollbarY && this._scrollBarY.hitTest(ne.clientX, ne.clientY)) {
      hitAny = true;
      if (this._hoveredScrollBar !== this._scrollBarY) {
        this._hoveredScrollBar?.onPointerLeave(e);
        this._hoveredScrollBar = this._scrollBarY;
      }
      this._scrollBarY.onPointerMove(e);
    } else if (this._showScrollbarX && this._scrollBarX.hitTest(ne.clientX, ne.clientY)) {
      hitAny = true;
      if (this._hoveredScrollBar !== this._scrollBarX) {
        this._hoveredScrollBar?.onPointerLeave(e);
        this._hoveredScrollBar = this._scrollBarX;
      }
      this._scrollBarX.onPointerMove(e);
    } else {
      if (this._hoveredScrollBar) {
        this._hoveredScrollBar.onPointerLeave(e);
        this._hoveredScrollBar = null;
      }
    }

    if (hitAny) {
      this.markNeedsPaint();
    }

    if (!this._pointerDown) {
      const pointerType = (ne as unknown as { pointerType?: string } | null)?.pointerType;
      if (pointerType !== 'touch' && pointerType !== 'pen') {
        return;
      }
      e.stopPropagation();
      return;
    }

    // Dragging Content
    e.stopPropagation();

    // Existing touch drag logic
    const dx = this._lastX - ne.clientX; // 拖动方向与滚动方向相反
    const dy = this._lastY - ne.clientY;

    this._lastX = ne.clientX;
    this._lastY = ne.clientY;

    // 复用 onWheel 的滚动处理逻辑（包含回弹阻力计算）
    // 构造一个模拟的 WheelEvent 数据结构传递给 processScroll
    this.processScroll(dx, dy);
  }

  onPointerUp(e: InkwellEvent) {
    const ne = e.nativeEvent as PointerEvent;
    if (!this._pointerDown) {
      const pointerType = (ne as unknown as { pointerType?: string } | null)?.pointerType;
      if (pointerType !== 'touch' && pointerType !== 'pen') {
        return;
      }
    }

    e.stopPropagation();
    this._pointerDown = false;

    // ScrollBar handles its own drag end via window listener.
    // We just reset our interaction state.
    this._isInteracting = false;
    // 交互结束，检查是否需要回弹
    this.checkRebound();
  }

  onPointerLeave(e: InkwellEvent) {
    if (this._hoveredScrollBar) {
      this._hoveredScrollBar.onPointerLeave(e);
      this._hoveredScrollBar = null;
    }
  }

  onWheel(e: InkwellEvent): boolean | void {
    const we = e.nativeEvent as WheelEvent;
    if (!we) {
      return;
    }

    const dx = we.deltaX;
    const dy = we.deltaY;

    // 优化：禁用 Chrome 原生的滑动返回功能
    // 当检测到水平滑动意图时，阻止默认行为（防止触发浏览器历史导航）
    if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 0) {
      we.preventDefault();
    }

    // 只有在发生实际滚动时才阻止冒泡
    // 如果已到达边界且未开启弹性（或弹性处理未消耗），则允许冒泡给父级
    if (this.processScroll(dx, dy)) {
      e.stopPropagation();
    }
  }

  /**
   * 处理滚动逻辑（包含边界阻力计算）
   * @param dx 水平滚动增量
   * @param dy 垂直滚动增量
   * @returns 是否发生有效滚动
   */
  protected processScroll(dx: number, dy: number): boolean {
    // 清除现有的动画
    if (this._reboundTimer) {
      clearTimeout(this._reboundTimer);
    }
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
      if (this._bounceState === BounceState.BOUNCING) {
        this._bounceState = BounceState.INTERRUPTED;
      }
    }

    const maxScrollX = Math.max(0, this._contentSize.width - (this._width || 0));
    const maxScrollY = Math.max(0, this._contentSize.height - (this._height || 0));

    // 动态计算最大回弹距离：取配置值与视口一半的较小值
    const viewportW = this._width || 0;
    const viewportH = this._height || 0;
    const configMaxBounce = this.data.maxBounceDistance || 400;

    // 确保回弹不超过视口的一半
    const maxBounceX = Math.min(configMaxBounce, viewportW * 0.5);
    const maxBounceY = Math.min(configMaxBounce, viewportH * 0.5);

    const enableBounce = this.data.enableBounce ?? false;
    const enableBounceX = this.data.enableBounceHorizontal ?? enableBounce;
    const enableBounceY = this.data.enableBounceVertical ?? enableBounce;

    // --- 计算水平滚动 (X) ---
    let nextX = this._scrollX + dx;

    // 检查是否越界
    const isOutOfBoundsX = nextX < 0 || nextX > maxScrollX;

    if (isOutOfBoundsX) {
      if (!enableBounceX) {
        // 如果未开启弹性，直接钳制
        nextX = Math.max(0, Math.min(nextX, maxScrollX));
      } else {
        // 开启弹性：应用非线性阻力
        // 计算当前的过卷距离（overscroll）
        let overscroll = 0;
        if (this._scrollX < 0) {
          overscroll = -this._scrollX;
        } else if (this._scrollX > maxScrollX) {
          overscroll = this._scrollX - maxScrollX;
        }

        // 如果当前已经在界内，但这一步导致越界，则只对越界部分应用阻力
        // 简化处理：直接对增量应用阻力系数
        // 阻力系数：随着过卷距离增加，阻力增大（系数减小）
        // 使用 (1 - ratio)^2 作为系数，提供非线性手感
        const ratio = Math.min(1, overscroll / maxBounceX);
        const resistanceFactor = Math.pow(1 - ratio, 2);

        // 重新计算 nextX
        // 基础阻力 0.5，叠加动态阻力
        nextX = this._scrollX + dx * (DEFAULT_RESISTANCE_FACTOR * resistanceFactor);

        // 硬限制最大回弹距离
        if (nextX < -maxBounceX) {
          nextX = -maxBounceX;
        } else if (nextX > maxScrollX + maxBounceX) {
          nextX = maxScrollX + maxBounceX;
        }
      }
    }

    // --- 计算垂直滚动 (Y) ---
    let nextY = this._scrollY + dy;

    // 检查是否越界
    const isOutOfBoundsY = nextY < 0 || nextY > maxScrollY;

    if (isOutOfBoundsY) {
      if (!enableBounceY) {
        // 如果未开启弹性，直接钳制
        nextY = Math.max(0, Math.min(nextY, maxScrollY));
      } else {
        // 开启弹性：应用非线性阻力
        let overscroll = 0;
        if (this._scrollY < 0) {
          overscroll = -this._scrollY;
        } else if (this._scrollY > maxScrollY) {
          overscroll = this._scrollY - maxScrollY;
        }

        const ratio = Math.min(1, overscroll / maxBounceY);
        const resistanceFactor = Math.pow(1 - ratio, 2);

        nextY = this._scrollY + dy * (DEFAULT_RESISTANCE_FACTOR * resistanceFactor);

        if (nextY < -maxBounceY) {
          nextY = -maxBounceY;
        } else if (nextY > maxScrollY + maxBounceY) {
          nextY = maxScrollY + maxBounceY;
        }
      }
    }

    // 检查是否发生了有效滚动
    const scrolledX = Math.abs(nextX - this._scrollX) > 0.1;
    const scrolledY = Math.abs(nextY - this._scrollY) > 0.1;

    if (scrolledX || scrolledY) {
      this.scrollTo(nextX, nextY);

      this._reboundTimer = setTimeout(() => {
        this.checkRebound();
      }, BOUNCE_DEBOUNCE_TIME);

      return true;
    }

    return false;
  }
}
