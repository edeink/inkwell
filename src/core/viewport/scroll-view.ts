import { Viewport } from './viewport';

import type { Size } from '../base';
import type { ViewportProps } from './viewport';
import type { InkwellEvent } from '@/core/events/types';

const DEFAULT_BOUNCE_DAMPING = 0.2;
const DEFAULT_RESISTANCE_FACTOR = 0.5;
const MIN_BOUNCE_DIFF = 0.5;
const DEFAULT_BOUNCE_SPEED_THRESHOLD = 1;
const BOUNCE_DEBOUNCE_TIME = 50;

export enum BounceState {
  IDLE = 'idle',
  BOUNCING = 'bouncing',
  INTERRUPTED = 'interrupted',
}

export interface ScrollViewProps extends ViewportProps {
  scrollBarColor?: string;
  scrollBarWidth?: number;

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

export class ScrollView extends Viewport {
  protected _contentSize: Size = { width: 0, height: 0 };
  protected _showScrollbarX = false;
  protected _showScrollbarY = false;

  protected _reboundTimer: ReturnType<typeof setTimeout> | null = null;
  protected _animationFrame: number | null = null;
  protected _pointerDown = false;
  protected _isInteracting = false;
  protected _bounceState: BounceState = BounceState.IDLE;
  protected _lastX = 0;
  protected _lastY = 0;

  constructor(public data: ScrollViewProps) {
    super(data);
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

  // 重写 paintSelf 绘制滚动条
  protected paintSelf(context: import('../base').BuildContext): void {
    const renderer = context.renderer;
    // 绘制背景等（如果有）
    // Viewport 不绘制背景，由 Container 等处理，或者 Viewport 本身没有 paintSelf 逻辑
    // 但我们需要绘制滚动条

    if (this._showScrollbarY) {
      const viewportH = this._height || 0;
      const contentH = this._contentSize.height;
      if (contentH > viewportH && contentH > 0) {
        const ratio = viewportH / contentH;
        const thumbH = Math.max(20, viewportH * ratio);
        const maxScroll = contentH - viewportH;
        const scrollRatio = this._scrollY / maxScroll;
        // 滚动条位置：从 0 到 viewportH - thumbH
        const thumbY = scrollRatio * (viewportH - thumbH);

        renderer.drawRect({
          x: (this._width || 0) - (this.data.scrollBarWidth || 6) - 2,
          y: thumbY,
          width: this.data.scrollBarWidth || 6,
          height: thumbH,
          fill: this.data.scrollBarColor || 'rgba(0,0,0,0.3)',
          borderRadius: 3,
        });
      }
    }

    if (this._showScrollbarX) {
      const viewportW = this._width || 0;
      const contentW = this._contentSize.width;
      if (contentW > viewportW && contentW > 0) {
        const ratio = viewportW / contentW;
        const thumbW = Math.max(20, viewportW * ratio);
        const maxScroll = contentW - viewportW;
        const scrollRatio = this._scrollX / maxScroll;
        const thumbX = scrollRatio * (viewportW - thumbW);

        renderer.drawRect({
          x: thumbX,
          y: (this._height || 0) - (this.data.scrollBarWidth || 6) - 2,
          width: thumbW,
          height: this.data.scrollBarWidth || 6,
          fill: this.data.scrollBarColor || 'rgba(0,0,0,0.3)',
          borderRadius: 3,
        });
      }
    }
  }

  // 必须重写此方法以允许子节点超出视口
  protected getConstraintsForChild(
    constraints: import('../base').BoxConstraints,
  ): import('../base').BoxConstraints {
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
    this._showScrollbarX = this._contentSize.width > width;
    this._showScrollbarY = this._contentSize.height > height;

    // 修正滚动位置（防止内容缩小后滚动位置越界）
    const maxScrollX = Math.max(0, this._contentSize.width - width);
    const maxScrollY = Math.max(0, this._contentSize.height - height);

    const enableBounce = this.data.enableBounce ?? false;

    // 如果未开启弹性，则严格限制边界
    // 如果开启弹性，允许暂时越界（由回弹逻辑处理恢复）
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
    } else {
      // 即使开启弹性，如果在非交互状态下且严重越界（如内容大幅缩小），也建议触发回弹检查
      // 这里不直接修改 scrollX/Y，而是依靠后续的 update/tick 机制或 checkRebound
      // 但 performLayout 本身不触发副作用。
    }

    // Viewport 的 performLayout 还需要设置 this.width/height 属性
    this._width = width;
    this._height = height;

    return { width, height };
  }

  onPointerDown(e: InkwellEvent) {
    e.stopPropagation();
    this._pointerDown = true;
    this._isInteracting = true;

    // 记录初始触摸位置
    const ne = e.nativeEvent as PointerEvent;
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
    if (!this._pointerDown) {
      return;
    }
    e.stopPropagation();

    const ne = e.nativeEvent as PointerEvent;
    const dx = this._lastX - ne.clientX; // 拖动方向与滚动方向相反
    const dy = this._lastY - ne.clientY;

    this._lastX = ne.clientX;
    this._lastY = ne.clientY;

    // 复用 onWheel 的滚动处理逻辑（包含回弹阻力计算）
    // 构造一个模拟的 WheelEvent 数据结构传递给 processScroll
    this.processScroll(dx, dy);
  }

  onPointerUp(e: InkwellEvent) {
    e.stopPropagation();
    this._pointerDown = false;
    this._isInteracting = false;
    // 交互结束，检查是否需要回弹
    this.checkRebound();
  }

  onWheel(e: InkwellEvent): boolean | void {
    const we = e.nativeEvent as WheelEvent;
    if (!we) {
      return;
    }
    e.stopPropagation(); // 阻止事件冒泡，防止父级滚动

    const dx = we.deltaX;
    const dy = we.deltaY;

    this.processScroll(dx, dy);
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

        // 硬限制最大回弹距离
        if (nextY < -maxBounceY) {
          nextY = -maxBounceY;
        } else if (nextY > maxScrollY + maxBounceY) {
          nextY = maxScrollY + maxBounceY;
        }
      }
    }

    if (nextX !== this._scrollX || nextY !== this._scrollY) {
      this.scrollTo(nextX, nextY);

      // Start rebound check after debounce
      // 如果处于弹性状态，松手后需要回弹。
      // 这里实现速度阈值检测：如果 delta 很小（慢速滑动结束），立即触发回弹
      const speedThreshold = this.data.bounceSpeedThreshold || DEFAULT_BOUNCE_SPEED_THRESHOLD;
      const currentSpeed = Math.sqrt(dx * dx + dy * dy); // 简单估算每帧速度

      const debounceTime = currentSpeed < speedThreshold ? 0 : BOUNCE_DEBOUNCE_TIME;

      this._reboundTimer = setTimeout(() => {
        this.checkRebound();
      }, debounceTime);

      return true;
    }
    return false;
  }
}
