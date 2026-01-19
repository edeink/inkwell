import { Widget } from './base';
import { resolveEdgeInsets } from './padding';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from './base';
import type { Border, BorderRadius, EdgeInsets, PaddingValue } from './type';

function areEdgeInsetsEqual(a: EdgeInsets, b: EdgeInsets): boolean {
  if (a === b) {
    return true;
  }
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

function areOptionalEdgeInsetsEqual(a: EdgeInsets | undefined, b: EdgeInsets | undefined): boolean {
  if (a === b) {
    return true;
  }
  if (a === undefined || b === undefined) {
    return false;
  }
  return areEdgeInsetsEqual(a, b);
}

export interface ContainerProps extends WidgetProps {
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  padding?: PaddingValue;
  margin?: PaddingValue;
  color?: string;
  border?: Border;
  borderRadius?: BorderRadius | number;
  alignment?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

/**
 * Container 组件 - 最常用的容器组件
 * 支持设置尺寸、内边距、外边距、背景色、边框等
 */
export class Container extends Widget<ContainerProps> {
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  padding?: EdgeInsets;
  margin?: EdgeInsets;
  color?: string;
  border?: Border;
  borderRadius?: BorderRadius;
  alignment?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

  constructor(data: ContainerProps) {
    super(data);
    this.initContainerProperties(data);
  }

  protected override init(data: ContainerProps) {
    super.init(data);
    this.initContainerProperties(data);
  }

  private initContainerProperties(data: ContainerProps): void {
    this.width = data.width;
    this.height = data.height;
    this.minWidth = data.minWidth;
    this.maxWidth = data.maxWidth;
    this.minHeight = data.minHeight;
    this.maxHeight = data.maxHeight;
    this.padding = data.padding === undefined ? undefined : resolveEdgeInsets(data.padding);
    this.margin = data.margin === undefined ? undefined : resolveEdgeInsets(data.margin);
    this.color = data.color;
    this.border = data.border;
    this.borderRadius = this.normalizeBorderRadius(data.borderRadius);
    this.alignment = data.alignment;
    // 更新光标配置
    if (data.cursor !== undefined) {
      this.cursor = data.cursor;
    }
  }

  private normalizeBorderRadius(value?: BorderRadius | number): BorderRadius | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === 'number') {
      return {
        topLeft: value,
        topRight: value,
        bottomLeft: value,
        bottomRight: value,
      };
    }
    return value;
  }

  // 移除 createElement 覆盖，让基类处理 shallowDiff 优化
  // 如果 props 未变，基类将直接返回，避免了此处不必要的属性解析和对象分配

  /**
   * 处理组件属性更新
   *
   * @description
   * 检查属性变更是否影响布局或绘制。
   * 采用了多项优化策略：
   * 1. 快速引用比较：如果 `oldProps === newProps` 直接返回。
   * 2. 原始值比较：优先比较 `borderRadius` 的原始值，避免对象分配。
   * 3. 复用解析值：如果 `padding`/`margin` 引用未变，复用已解析的 `EdgeInsets` 对象。
   * 4. 区分布局变更和绘制变更：
   *    - 布局变更 (width, height, padding, margin, alignment 等)：调用 `super.didUpdateWidget`（触发布局）。
   *    - 绘制变更 (color, border, borderRadius 等)：仅调用 `markNeedsPaint`（触发重绘）。
   *
   * @param oldProps 旧的属性
   */
  protected didUpdateWidget(oldProps: ContainerProps): void {
    const newProps = this.data;

    // 优化：快速比较，避免不必要的 resolve
    if (oldProps === newProps) {
      return;
    }

    // 优化：优先比较原始 borderRadius 值，避免 normalizeBorderRadius 的对象分配
    const borderRadiusChanged = oldProps.borderRadius !== newProps.borderRadius;

    // 优化：如果 padding/margin 属性引用未变，直接复用已解析的值
    let newPadding = this.padding;
    let newMargin = this.margin;

    // 注意：这里需要处理 undefined 的情况，所以比较 newProps.padding !== oldProps.padding
    if (newProps.padding !== oldProps.padding) {
      newPadding = newProps.padding === undefined ? undefined : resolveEdgeInsets(newProps.padding);
    }

    if (newProps.margin !== oldProps.margin) {
      newMargin = newProps.margin === undefined ? undefined : resolveEdgeInsets(newProps.margin);
    }

    const paddingLayoutChanged = !areOptionalEdgeInsetsEqual(this.padding, newPadding);
    const marginLayoutChanged = !areOptionalEdgeInsetsEqual(this.margin, newMargin);

    // 比较逻辑：
    const layoutChanged =
      oldProps.width !== newProps.width ||
      oldProps.height !== newProps.height ||
      oldProps.minWidth !== newProps.minWidth ||
      oldProps.maxWidth !== newProps.maxWidth ||
      oldProps.minHeight !== newProps.minHeight ||
      oldProps.maxHeight !== newProps.maxHeight ||
      oldProps.alignment !== newProps.alignment ||
      paddingLayoutChanged ||
      marginLayoutChanged;

    // 更新内部属性
    this.width = newProps.width;
    this.height = newProps.height;
    this.minWidth = newProps.minWidth;
    this.maxWidth = newProps.maxWidth;
    this.minHeight = newProps.minHeight;
    this.maxHeight = newProps.maxHeight;
    this.padding = newPadding;
    this.margin = newMargin;
    this.color = newProps.color;
    this.border = newProps.border;
    this.borderRadius = this.normalizeBorderRadius(newProps.borderRadius);
    this.alignment = newProps.alignment;
    if (newProps.cursor !== undefined) {
      this.cursor = newProps.cursor;
    }

    if (layoutChanged) {
      super.didUpdateWidget(oldProps);
      return;
    }

    // 检查绘制属性是否变化
    const paintChanged =
      this.color !== newProps.color ||
      this.border !== newProps.border ||
      this.borderRadius !== this.normalizeBorderRadius(newProps.borderRadius) ||
      this.cursor !== newProps.cursor;

    if (paintChanged) {
      this.markNeedsPaint();
    }
  }

  /**
   * 绘制自身内容
   *
   * @description
   * Container 负责绘制背景色 (`color`) 和边框 (`border`)。
   *
   * 优化：
   * 1. 如果无背景色且无边框，直接返回。
   * 2. 预先计算绘制区域（考虑 margin），避免重复计算。
   * 3. 使用 `renderer.drawRect` 进行绘制，支持圆角。
   *
   * @param context 构建上下文，包含渲染器
   */
  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const { size } = this.renderObject;

    // 优化：如果无绘制内容，直接返回
    if (!this.color && !this.border) {
      return;
    }

    // 计算实际绘制区域（考虑外边距）
    // 注意：这里使用相对坐标，因为base.ts的paint方法已经处理了translate
    const marginLeft = this.margin?.left ?? 0;
    const marginTop = this.margin?.top ?? 0;

    // 优化：避免对象分配
    const drawX = marginLeft;
    const drawY = marginTop;
    let drawW = size.width;
    let drawH = size.height;

    if (this.margin) {
      drawW = size.width - (this.margin.left ?? 0) - (this.margin.right ?? 0);
      drawH = size.height - (this.margin.top ?? 0) - (this.margin.bottom ?? 0);
    }

    const borderRadius = this.borderRadius; // 直接使用，不需要 clone

    // 绘制背景色（使用相对坐标）
    if (this.color) {
      renderer.drawRect({
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
        fill: this.color,
        borderRadius,
      });
    }

    // 绘制边框（使用相对坐标）
    if (this.border) {
      renderer.drawRect({
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
        stroke: this.border.color,
        strokeWidth: this.border.width,
        borderRadius,
      });
    }
  }

  /**
   * 执行 Container 的布局逻辑
   *
   * @description
   * 计算 Container 的尺寸。
   * 1. 优先使用显式指定的 `width` / `height`。
   * 2. 如果未指定，尝试根据 `alignment` 撑满父约束。
   * 3. 如果无 `alignment`，则包裹子组件（加上 padding 和 margin）。
   * 4. 最后确保满足父约束和自身的 `minWidth`/`maxWidth` 等约束。
   *
   * @param constraints 父组件传递的布局约束
   * @param childrenSizes 子组件的布局结果
   * @returns Container 的最终尺寸
   */
  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    // 计算外边距占用的空间
    const marginHorizontal = this.margin ? (this.margin.left ?? 0) + (this.margin.right ?? 0) : 0;
    const marginVertical = this.margin ? (this.margin.top ?? 0) + (this.margin.bottom ?? 0) : 0;

    // 计算内边距占用的空间
    const paddingHorizontal = this.padding
      ? (this.padding.left ?? 0) + (this.padding.right ?? 0)
      : 0;
    const paddingVertical = this.padding ? (this.padding.top ?? 0) + (this.padding.bottom ?? 0) : 0;

    // 如果指定了固定尺寸，使用固定尺寸
    let width = this.width !== undefined ? this.width + marginHorizontal : undefined;
    let height = this.height !== undefined ? this.height + marginVertical : undefined;

    // 如果没有指定尺寸，根据子组件和约束来确定
    if (width === undefined || height === undefined) {
      const childSize = childrenSizes[0] || { width: 0, height: 0 };

      if (width === undefined) {
        // 如果有 alignment，则尽可能撑大
        if (this.alignment && constraints.maxWidth !== Infinity) {
          width = constraints.maxWidth;
        } else {
          width = childSize.width + paddingHorizontal + marginHorizontal;
        }
      }
      if (height === undefined) {
        // 如果有 alignment，则尽可能撑大
        if (this.alignment && constraints.maxHeight !== Infinity) {
          height = constraints.maxHeight;
        } else {
          height = childSize.height + paddingVertical + marginVertical;
        }
      }
    }

    // 确保满足约束条件
    // 结合组件自身的 min/max 约束与父级传递的 constraints
    // 注意：this.minWidth 是视觉宽度，需要加上 margin 才是布局宽度
    const minWidth = Math.max(constraints.minWidth, (this.minWidth ?? 0) + marginHorizontal);
    const maxWidth = Math.min(constraints.maxWidth, (this.maxWidth ?? Infinity) + marginHorizontal);
    const minHeight = Math.max(constraints.minHeight, (this.minHeight ?? 0) + marginVertical);
    const maxHeight = Math.min(
      constraints.maxHeight,
      (this.maxHeight ?? Infinity) + marginVertical,
    );

    width = Math.max(minWidth, Math.min(width!, maxWidth));
    height = Math.max(minHeight, Math.min(height!, maxHeight));

    return { width, height };
  }

  /**
   * 计算传递给子组件的约束
   *
   * @description
   * 确定子组件可用的空间。
   * 1. 从父约束中减去 margin 和 padding。
   * 2. 应用 Container 自身的 min/max 约束（减去 padding）。
   * 3. 如果 Container 指定了固定尺寸，则强制传递紧约束（Tight Constraints）。
   * 4. 如果设置了 `alignment`，则传递松散约束（Loose Constraints，min=0）。
   *
   * @param constraints 父组件传递的布局约束
   * @returns 传递给子组件的约束
   */
  protected getConstraintsForChild(constraints: BoxConstraints): BoxConstraints {
    // 计算可用于子组件的空间
    const marginHorizontal = this.margin ? (this.margin.left ?? 0) + (this.margin.right ?? 0) : 0;
    const marginVertical = this.margin ? (this.margin.top ?? 0) + (this.margin.bottom ?? 0) : 0;
    const paddingHorizontal = this.padding
      ? (this.padding.left ?? 0) + (this.padding.right ?? 0)
      : 0;
    const paddingVertical = this.padding ? (this.padding.top ?? 0) + (this.padding.bottom ?? 0) : 0;

    const totalHorizontal = marginHorizontal + paddingHorizontal;
    const totalVertical = marginVertical + paddingVertical;

    // 计算有效的自身约束
    // 注意：this.minWidth 等属性是视觉属性（不含 margin），但包含 padding
    // 所以计算子组件约束时，只需要减去 padding
    const selfMinWidth = Math.max(0, (this.minWidth ?? 0) - paddingHorizontal);
    const selfMaxWidth = Math.max(0, (this.maxWidth ?? Infinity) - paddingHorizontal);
    const selfMinHeight = Math.max(0, (this.minHeight ?? 0) - paddingVertical);
    const selfMaxHeight = Math.max(0, (this.maxHeight ?? Infinity) - paddingVertical);

    // 父级约束减去内边距/外边距 (因为父级约束包含 margin 空间)
    const parentMinWidth = Math.max(0, constraints.minWidth - totalHorizontal);
    const parentMaxWidth = Math.max(0, constraints.maxWidth - totalHorizontal);
    const parentMinHeight = Math.max(0, constraints.minHeight - totalVertical);
    const parentMaxHeight = Math.max(0, constraints.maxHeight - totalVertical);

    // 计算子组件约束范围
    let cMinWidth = parentMinWidth;
    let cMaxWidth = parentMaxWidth;
    let cMinHeight = parentMinHeight;
    let cMaxHeight = parentMaxHeight;

    // 应用自身 min/max 约束
    cMinWidth = Math.max(cMinWidth, selfMinWidth);
    cMaxWidth = Math.min(cMaxWidth, selfMaxWidth);
    cMinHeight = Math.max(cMinHeight, selfMinHeight);
    cMaxHeight = Math.min(cMaxHeight, selfMaxHeight);

    // 独立应用 width 约束：即使 height 未定义，也要强制应用 width
    // 修复：之前只有当 width 和 height 都定义时才应用紧约束，导致仅设置 width 时约束失效
    if (this.width !== undefined) {
      // this.width 是视觉宽度（包含 padding），所以只减去 padding 得到内容宽度
      const w = Math.max(0, this.width - paddingHorizontal);
      cMinWidth = w;
      cMaxWidth = w;
    } else {
      // 只有未定义 width 且无 min/max 约束时，才尝试传递父级约束
      // 如果 constraints 是紧约束（min==max），需要确保子组件能响应
    }

    // 独立应用 height 约束
    if (this.height !== undefined) {
      // this.height 是视觉高度（包含 padding），所以只减去 padding 得到内容高度
      const h = Math.max(0, this.height - paddingVertical);
      cMinHeight = h;
      cMaxHeight = h;
    }

    // 如果父级是紧约束，强制传递给子组件（除非显式指定了尺寸）
    // 这对于 Positioned -> Container 场景至关重要
    if (constraints.minWidth === constraints.maxWidth && this.width === undefined) {
      const w = Math.max(0, constraints.maxWidth - totalHorizontal);
      cMinWidth = w;
      cMaxWidth = w;
    }
    if (constraints.minHeight === constraints.maxHeight && this.height === undefined) {
      const h = Math.max(0, constraints.maxHeight - totalVertical);
      cMinHeight = h;
      cMaxHeight = h;
    }

    // 如果有 alignment，则子组件约束为松散的（0~max）
    // 注意：alignment 会使 min 约束变为 0，允许子组件小于父组件
    if (this.alignment) {
      return {
        minWidth: 0,
        maxWidth: cMaxWidth,
        minHeight: 0,
        maxHeight: cMaxHeight,
      };
    }

    // 否则，传递严格约束（如果是固定尺寸）或范围约束
    return {
      minWidth: cMinWidth,
      maxWidth: cMaxWidth,
      minHeight: cMinHeight,
      maxHeight: cMaxHeight,
    };
  }

  /**
   * 计算子组件位置
   *
   * @description
   * 根据 alignment、padding 和 margin 计算子组件的相对位置。
   *
   * @returns 子组件的偏移量 (Offset)
   */
  protected positionChild(): Offset {
    // 计算子组件的位置（考虑外边距和内边距）
    const marginLeft = this.margin?.left || 0;
    const marginTop = this.margin?.top || 0;
    const paddingLeft = this.padding?.left || 0;
    const paddingTop = this.padding?.top || 0;

    let x = marginLeft + paddingLeft;
    let y = marginTop + paddingTop;

    if (this.alignment && this.children.length > 0) {
      const childSize = this.children[0].renderObject.size;
      const margin = this.margin;
      const padding = this.padding;
      const marginHorizontal = margin ? (margin.left || 0) + (margin.right || 0) : 0;
      const marginVertical = margin ? (margin.top || 0) + (margin.bottom || 0) : 0;
      const paddingHorizontal = padding ? (padding.left || 0) + (padding.right || 0) : 0;
      const paddingVertical = padding ? (padding.top || 0) + (padding.bottom || 0) : 0;

      const contentWidth =
        (this.renderObject.size.width || 0) - marginHorizontal - paddingHorizontal;
      const contentHeight = (this.renderObject.size.height || 0) - marginVertical - paddingVertical;

      if (this.alignment === 'center') {
        x += Math.max(0, (contentWidth - childSize.width) / 2);
        y += Math.max(0, (contentHeight - childSize.height) / 2);
      } else if (this.alignment === 'topRight') {
        x += Math.max(0, contentWidth - childSize.width);
      } else if (this.alignment === 'bottomLeft') {
        y += Math.max(0, contentHeight - childSize.height);
      } else if (this.alignment === 'bottomRight') {
        x += Math.max(0, contentWidth - childSize.width);
        y += Math.max(0, contentHeight - childSize.height);
      }
    }

    return {
      dx: x,
      dy: y,
    };
  }
}
