import { Widget, createBoxConstraints } from './base';

import type { BoxConstraints, Offset, Size, WidgetProps } from './base';

export type StackFit = 'loose' | 'expand' | 'passthrough';
export type AlignmentGeometry =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'centerLeft'
  | 'center'
  | 'centerRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight';

export interface StackProps extends WidgetProps {
  alignment?: AlignmentGeometry;
  fit?: StackFit;
  allowOverflowPositioned?: boolean;
  /**
   * 禁止在 Stack 上直接设置宽高。
   * 如需指定尺寸，请在外层包裹 SizedBox。
   */
  width?: never;
  height?: never;
}

/**
 * Stack 组件 - 将子组件堆叠在一起。
 *
 * 注意：Stack 本身不接受 width/height 属性。
 * 如果需要固定 Stack 的大小，请将其包裹在 SizedBox 中。
 *
 * @example
 * ```tsx
 * <SizedBox width={300} height={300}>
 *   <Stack>
 *     <Positioned left={10} top={10}>
 *       <Container width={50} height={50} color="red" />
 *     </Positioned>
 *   </Stack>
 * </SizedBox>
 * ```
 */
export class Stack extends Widget<StackProps> {
  alignment: AlignmentGeometry = 'center';
  fit: StackFit = 'loose';

  constructor(data: StackProps) {
    super(data);
    this.initStackProperties(data);
  }

  private initStackProperties(data: StackProps): void {
    // 默认开启点击穿透
    if (data.skipEvent === undefined) {
      this.skipEvent = true;
    }
    this.alignment = data.alignment || 'topLeft';
    this.fit = data.fit || 'loose';
    this.props.allowOverflowPositioned = data.allowOverflowPositioned;
  }

  createElement(data: StackProps): Widget {
    super.createElement(data);
    this.initStackProperties(data);
    return this;
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    if (childrenSizes.length === 0) {
      return {
        width: constraints.minWidth,
        height: constraints.minHeight,
      };
    }

    let width: number;
    let height: number;

    const isPositionedChild = (i: number): boolean => {
      const child = this.children[i];
      const maybe = child as unknown as { isPositioned?: () => boolean };
      return !!maybe && typeof maybe.isPositioned === 'function' && maybe.isPositioned();
    };

    const nonPosSizes = childrenSizes.filter((_, i) => !isPositionedChild(i));
    // 若全部是 Positioned，则退回到所有子项
    const fallbackSizes = nonPosSizes.length > 0 ? nonPosSizes : childrenSizes;

    switch (this.fit) {
      case 'expand':
        // 扩展到最大约束
        width =
          constraints.maxWidth === Infinity
            ? Math.max(...fallbackSizes.map((s) => s.width))
            : constraints.maxWidth;
        height =
          constraints.maxHeight === Infinity
            ? Math.max(...fallbackSizes.map((s) => s.height))
            : constraints.maxHeight;
        break;

      case 'passthrough':
        // 传递约束给子组件，Stack 本身尺寸由约束决定
        width =
          constraints.maxWidth === Infinity
            ? Math.max(...fallbackSizes.map((s) => s.width))
            : constraints.maxWidth;
        height =
          constraints.maxHeight === Infinity
            ? Math.max(...fallbackSizes.map((s) => s.height))
            : constraints.maxHeight;
        break;

      case 'loose':
      default:
        // 根据子组件的最大尺寸确定
        width = Math.max(...fallbackSizes.map((s) => s.width));
        height = Math.max(...fallbackSizes.map((s) => s.height));
        break;
    }

    // 确保满足约束条件
    width = Math.max(constraints.minWidth, Math.min(width, constraints.maxWidth));
    height = Math.max(constraints.minHeight, Math.min(height, constraints.maxHeight));

    return { width, height };
  }

  protected layoutChildren(parentConstraints: BoxConstraints): Size[] {
    const sizes: Size[] = new Array(this.children.length);

    const isPositionedChild = (child: Widget): boolean => {
      const maybe = child as unknown as { isPositioned?: () => boolean };
      return !!maybe && typeof maybe.isPositioned === 'function' && maybe.isPositioned();
    };

    // 1) 先布局非 Positioned 子项以确定 Stack 参考尺寸
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (!isPositionedChild(child)) {
        const constraints = this.getConstraintsForChild(parentConstraints, i);
        sizes[i] = child.layout(constraints);
      }
    }

    // 计算参考尺寸（忽略 Positioned 子项）
    const nonPosSizes = sizes.filter((s) => !!s);
    let refWidth = 0;
    let refHeight = 0;
    if (nonPosSizes.length > 0) {
      switch (this.fit) {
        case 'expand':
        case 'passthrough':
          refWidth =
            parentConstraints.maxWidth === Infinity
              ? Math.max(...nonPosSizes.map((s) => s.width))
              : parentConstraints.maxWidth;
          refHeight =
            parentConstraints.maxHeight === Infinity
              ? Math.max(...nonPosSizes.map((s) => s.height))
              : parentConstraints.maxHeight;
          break;
        case 'loose':
        default:
          refWidth = Math.max(...nonPosSizes.map((s) => s.width));
          refHeight = Math.max(...nonPosSizes.map((s) => s.height));
      }
    } else {
      // 若不存在非 Positioned 子项，参考尺寸退化为父约束的最小值
      refWidth = parentConstraints.minWidth ?? 0;
      refHeight = parentConstraints.minHeight ?? 0;
    }

    // 2) 布局 Positioned 子项，使用基于参考尺寸的约束避免无穷大尺寸
    const posConstraints = this.props.allowOverflowPositioned
      ? parentConstraints
      : createBoxConstraints({
          minWidth: 0,
          maxWidth: refWidth === 0 ? parentConstraints.maxWidth : refWidth,
          minHeight: 0,
          maxHeight: refHeight === 0 ? parentConstraints.maxHeight : refHeight,
        });
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (isPositionedChild(child)) {
        sizes[i] = child.layout(posConstraints);
      }
    }

    return sizes;
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    _childIndex: number,
  ): BoxConstraints {
    switch (this.fit) {
      case 'expand':
        // 强制子组件扩展到 Stack 的尺寸
        return {
          minWidth: constraints.maxWidth === Infinity ? 0 : constraints.maxWidth,
          maxWidth: constraints.maxWidth,
          minHeight: constraints.maxHeight === Infinity ? 0 : constraints.maxHeight,
          maxHeight: constraints.maxHeight,
        };

      case 'passthrough':
        // 直接传递约束
        return constraints;

      case 'loose':
      default:
        // 宽松约束，子组件可以是任意尺寸
        return {
          minWidth: 0,
          maxWidth: constraints.maxWidth,
          minHeight: 0,
          maxHeight: constraints.maxHeight,
        };
    }
  }

  protected positionChild(childIndex: number, childSize: Size): Offset {
    const stackSize = this.renderObject.size;
    const child = this.children[childIndex];

    // 检查是否是 Positioned 组件
    if (
      child &&
      typeof child === 'object' &&
      'isPositioned' in child &&
      typeof child.isPositioned === 'function' &&
      child.isPositioned()
    ) {
      // 对于 Positioned 组件，使用其 getStackPosition 方法
      if ('getStackPosition' in child && typeof child.getStackPosition === 'function') {
        return child.getStackPosition(stackSize);
      }
    }

    // 根据对齐方式计算位置
    let dx: number;
    let dy: number;

    switch (this.alignment) {
      case 'topLeft':
        dx = 0;
        dy = 0;
        break;
      case 'topCenter':
        dx = (stackSize.width - childSize.width) / 2;
        dy = 0;
        break;
      case 'topRight':
        dx = stackSize.width - childSize.width;
        dy = 0;
        break;
      case 'centerLeft':
        dx = 0;
        dy = (stackSize.height - childSize.height) / 2;
        break;
      case 'center':
        dx = (stackSize.width - childSize.width) / 2;
        dy = (stackSize.height - childSize.height) / 2;
        break;
      case 'centerRight':
        dx = stackSize.width - childSize.width;
        dy = (stackSize.height - childSize.height) / 2;
        break;
      case 'bottomLeft':
        dx = 0;
        dy = stackSize.height - childSize.height;
        break;
      case 'bottomCenter':
        dx = (stackSize.width - childSize.width) / 2;
        dy = stackSize.height - childSize.height;
        break;
      case 'bottomRight':
        dx = stackSize.width - childSize.width;
        dy = stackSize.height - childSize.height;
        break;
      default:
        dx = 0;
        dy = 0;
    }

    return { dx, dy };
  }
}
