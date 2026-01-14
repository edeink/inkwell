import { Widget, type BuildContext, type WidgetProps } from '../base';

import type { InkwellEvent } from '@/core/events/types';

import { colorToString, lerp, lerpColor, parseColor } from '@/core/helper/color';

export interface ScrollBarProps extends WidgetProps {
  orientation: 'vertical' | 'horizontal';

  // 视口尺寸
  viewportSize: number;
  // 内容尺寸
  contentSize: number;
  // 当前滚动位置
  scrollPosition: number;

  // 样式配置
  thickness?: number;
  hoverThickness?: number;
  trackColor?: string;
  thumbColor?: string;
  hoverColor?: string;
  activeColor?: string;

  // 回调
  onScroll?: (newPos: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export class ScrollBar extends Widget<ScrollBarProps> {
  private _isHovering = false;
  private _isDragging = false;
  private _dragStartPos = 0;
  private _dragStartScroll = 0;

  private _currentColor: [number, number, number, number] | null = null;
  private _currentThickness: number = 0;

  // 用于拖拽的 window 事件监听
  private _handleWindowMoveBound: (e: PointerEvent) => void;
  private _handleWindowUpBound: (e: PointerEvent) => void;

  constructor(props: ScrollBarProps) {
    super(props);
    this._handleWindowMoveBound = this._handleWindowMove.bind(this);
    this._handleWindowUpBound = this._handleWindowUp.bind(this);
    this._currentThickness = props.thickness || 6;
  }

  protected paintSelf(context: BuildContext): void {
    const renderer = context.renderer;
    const { width, height } = this.renderObject.size;

    // 绘制轨道
    if (this.data.trackColor) {
      renderer.drawRect({
        x: 0,
        y: 0,
        width,
        height,
        fill: this.data.trackColor,
      });
    }

    const rect = this.getThumbRect();
    if (!rect) {
      return;
    }

    // 更新颜色动画
    const targetColor = this.getTargetColor();
    if (!this._currentColor) {
      this._currentColor = targetColor;
    }

    // 颜色插值
    const nextColor = lerpColor(this._currentColor, targetColor, 0.2);
    // 判断颜色是否仍在变化
    if (
      Math.abs(nextColor[0] - targetColor[0]) > 0.1 ||
      Math.abs(nextColor[1] - targetColor[1]) > 0.1 ||
      Math.abs(nextColor[2] - targetColor[2]) > 0.1 ||
      Math.abs(nextColor[3] - targetColor[3]) > 0.005
    ) {
      this._currentColor = nextColor;
      this.markNeedsPaint();
    } else {
      this._currentColor = targetColor;
    }

    // 更新厚度动画（用于 hover/拖拽效果）
    const baseThickness = this.data.thickness || 6;
    const hoverThickness = this.data.hoverThickness || 10;
    const targetThickness = this._isHovering || this._isDragging ? hoverThickness : baseThickness;

    if (Math.abs(this._currentThickness - targetThickness) > 0.1) {
      this._currentThickness = lerp(this._currentThickness, targetThickness, 0.2);
      this.markNeedsPaint();
    } else {
      this._currentThickness = targetThickness;
    }

    // 根据厚度调整滑块
    let thumbX = rect.x;
    let thumbY = rect.y;
    let thumbW = rect.width;
    let thumbH = rect.height;

    if (this.data.orientation === 'vertical') {
      thumbW = this._currentThickness;
      // 贴右侧
      thumbX = width - thumbW;
    } else {
      thumbH = this._currentThickness;
      // 贴底部
      thumbY = height - thumbH;
    }

    renderer.drawRect({
      x: thumbX,
      y: thumbY,
      width: thumbW,
      height: thumbH,
      fill: colorToString(this._currentColor),
      borderRadius: Math.min(thumbW, thumbH) / 2,
    });
  }

  private getThumbRect() {
    const { viewportSize, contentSize, scrollPosition, orientation } = this.data;
    const { width, height } = this.renderObject.size;

    if (contentSize <= viewportSize) {
      return null;
    }

    const trackLength = orientation === 'vertical' ? height : width;
    const ratio = viewportSize / contentSize;
    const thumbLength = Math.max(20, trackLength * ratio);
    const maxScroll = contentSize - viewportSize;
    const scrollRatio = Math.max(0, Math.min(1, scrollPosition / maxScroll));

    const thumbPos = scrollRatio * (trackLength - thumbLength);

    if (orientation === 'vertical') {
      return {
        x: 0,
        y: thumbPos,
        width: width, // 绘制时会根据厚度调整
        height: thumbLength,
      };
    } else {
      return {
        x: thumbPos,
        y: 0,
        width: thumbLength,
        height: height, // 绘制时会根据厚度调整
      };
    }
  }

  private getTargetColor() {
    let colorStr = this.data.thumbColor || 'rgba(0,0,0,0.2)';
    if (this._isDragging) {
      colorStr = this.data.activeColor || 'rgba(0,0,0,0.5)';
    } else if (this._isHovering) {
      colorStr = this.data.hoverColor || 'rgba(0,0,0,0.3)';
    }
    return parseColor(colorStr);
  }

  // --- 交互 ---

  onPointerDown(e: InkwellEvent) {
    const ne = e.nativeEvent as PointerEvent;
    e.stopPropagation();

    this._isDragging = true;
    this._dragStartScroll = this.data.scrollPosition;
    this.data.onDragStart?.();

    if (this.data.orientation === 'vertical') {
      this._dragStartPos = ne.clientY;
    } else {
      this._dragStartPos = ne.clientX;
    }

    // 绑定 window 监听
    window.addEventListener('pointermove', this._handleWindowMoveBound);
    window.addEventListener('pointerup', this._handleWindowUpBound);

    this.markNeedsPaint();
  }

  onPointerMove(e: InkwellEvent) {
    if (this._isDragging) {
      return;
    } // 由 window 监听处理

    if (!this._isHovering) {
      this._isHovering = true;
      this.markNeedsPaint();
    }
    e.stopPropagation();
  }

  onPointerLeave(e: InkwellEvent) {
    if (this._isDragging) {
      return;
    }

    if (this._isHovering) {
      this._isHovering = false;
      this.markNeedsPaint();
    }
  }

  private _handleWindowMove(e: PointerEvent) {
    if (!this._isDragging) {
      return;
    }

    const { viewportSize, contentSize, orientation } = this.data;
    const { width, height } = this.renderObject.size;

    const trackLength = orientation === 'vertical' ? height : width;

    // 计算可拖拽轨道长度（轨道 - 滑块）
    const ratio = viewportSize / contentSize;
    const thumbLength = Math.max(20, trackLength * ratio);
    const scrollableTrackLen = trackLength - thumbLength;

    if (scrollableTrackLen <= 0) {
      return;
    }

    const delta =
      orientation === 'vertical' ? e.clientY - this._dragStartPos : e.clientX - this._dragStartPos;

    const contentScrollable = contentSize - viewportSize;
    const scrollRatio = contentScrollable / scrollableTrackLen;
    const dScroll = delta * scrollRatio;

    const newPos = this._dragStartScroll + dScroll;
    this.data.onScroll?.(newPos);
  }

  private _handleWindowUp(_e: PointerEvent) {
    if (!this._isDragging) {
      return;
    }

    this._isDragging = false;
    this._isHovering = false;
    this.data.onDragEnd?.();

    window.removeEventListener('pointermove', this._handleWindowMoveBound);
    window.removeEventListener('pointerup', this._handleWindowUpBound);

    this.markNeedsPaint();
  }

  // 清理
  dispose() {
    window.removeEventListener('pointermove', this._handleWindowMoveBound);
    window.removeEventListener('pointerup', this._handleWindowUpBound);
    super.dispose();
  }
}
