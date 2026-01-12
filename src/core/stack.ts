import { Widget, createBoxConstraints } from './base';
import { Positioned } from './positioned';

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
  allowOverflowPositioned: boolean = false;

  // 缓存布局结果数组，减少每帧 GC 压力
  private _cachedSizes: Size[] = [];

  constructor(data: StackProps) {
    super(data);
    this.initStackProperties(data);
  }

  private initStackProperties(data: StackProps): void {
    // 默认开启点击穿透
    if (data.pointerEvent === undefined) {
      this.pointerEvent = 'none';
    }
    this.alignment = data.alignment || 'topLeft';
    this.fit = data.fit || 'loose';
    this.allowOverflowPositioned = !!data.allowOverflowPositioned;
  }

  createElement(data: StackProps): Widget {
    super.createElement(data);
    this.initStackProperties(data);
    return this;
  }

  /**
   * 执行 Stack 的布局逻辑
   *
   * @description
   * 计算 Stack 自身的尺寸。
   * 1. 如果是严格约束 (Tight Constraints)，直接使用约束的最大值。
   * 2. 如果是非严格约束，根据 `fit` 属性决定尺寸：
   *    - `loose`: 尺寸等于非 Positioned 子组件的最大尺寸。
   *    - `expand`: 尺寸扩展到父约束的最大值。
   *    - `passthrough`: 将父约束直接传递给非 Positioned 子组件（通常不用于确定自身尺寸，而是影响子组件）。
   *
   * 优化：尽量减少对象分配和遍历次数。
   *
   * @param constraints 父组件传递的布局约束
   * @param childrenSizes 子组件的布局结果
   * @returns Stack 的最终尺寸
   */
  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    // 优化：如果是紧约束，直接返回约束尺寸，跳过子节点遍历
    // 在 Pipeline 场景中，Stack 通常被 SizedBox 包裹，因此是紧约束
    if (
      constraints.minWidth === constraints.maxWidth &&
      constraints.minHeight === constraints.maxHeight
    ) {
      return { width: constraints.minWidth, height: constraints.minHeight };
    }

    let width = 0;
    let height = 0;

    let maxNonPosW = 0;
    let maxNonPosH = 0;
    let hasNonPos = false;

    // 避免使用 map/filter 减少内存分配
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (!child.isPositioned) {
        const s = childrenSizes[i];
        if (s) {
          if (s.width > maxNonPosW) {
            maxNonPosW = s.width;
          }
          if (s.height > maxNonPosH) {
            maxNonPosH = s.height;
          }
          hasNonPos = true;
        }
      }
    }

    // 若全部是 Positioned，则退回到所有子项
    if (!hasNonPos) {
      for (const s of childrenSizes) {
        if (s) {
          if (s.width > maxNonPosW) {
            maxNonPosW = s.width;
          }
          if (s.height > maxNonPosH) {
            maxNonPosH = s.height;
          }
        }
      }
    }

    switch (this.fit) {
      case 'expand':
      case 'passthrough':
        // 扩展到最大约束
        width = constraints.maxWidth === Infinity ? maxNonPosW : constraints.maxWidth;
        height = constraints.maxHeight === Infinity ? maxNonPosH : constraints.maxHeight;
        break;

      case 'loose':
      default:
        // 根据子组件的最大尺寸确定
        width = maxNonPosW;
        height = maxNonPosH;
        break;
    }

    // 确保满足约束条件
    width = Math.max(constraints.minWidth, Math.min(width, constraints.maxWidth));
    height = Math.max(constraints.minHeight, Math.min(height, constraints.maxHeight));

    return { width, height };
  }

  /**
   * 定位子组件
   *
   * @description
   * 根据 Stack 的尺寸和子组件的布局结果，设置每个子组件的偏移量 (Offset)。
   * - 对于 Positioned 子组件：根据 top/right/bottom/left 属性计算位置。
   * - 对于非 Positioned 子组件：根据 Stack 的 `alignment` 属性计算位置。
   *
   * 优化：内联了 Positioned 的计算逻辑，避免了额外的函数调用和对象创建。
   *
   * @param childrenSizes 子组件的布局结果
   */
  protected positionChildren(childrenSizes: Size[]): void {
    const len = this.children.length;
    const stackSize = this.renderObject.size;

    for (let i = 0; i < len; i++) {
      const child = this.children[i];
      const size = childrenSizes[i];

      if (!size) {
        continue;
      }

      if (child.isPositioned) {
        // 优化：内联 Positioned 计算逻辑，避免创建 Offset 对象
        const posChild = child as Positioned;
        const childW = child.renderObject.size.width;
        const childH = child.renderObject.size.height;

        let dx = 0;
        let dy = 0;

        if (posChild.left !== undefined) {
          dx = posChild.left;
        } else if (posChild.right !== undefined) {
          dx = stackSize.width - posChild.right - childW;
        }

        if (posChild.top !== undefined) {
          dy = posChild.top;
        } else if (posChild.bottom !== undefined) {
          dy = stackSize.height - posChild.bottom - childH;
        }

        child.renderObject.offset.dx = dx;
        child.renderObject.offset.dy = dy;
      } else {
        const offset = this.positionChild(i, size);
        // 复用 offset 对象
        child.renderObject.offset.dx = offset.dx;
        child.renderObject.offset.dy = offset.dy;
      }
    }
  }

  /**
   * 布局子组件
   *
   * @description
   * 遍历并布局所有子组件。
   * 1. 如果是紧约束 (Tight Constraints) 或允许溢出，则可以并行处理所有子组件（Positioned 组件可以直接布局）。
   * 2. 否则，必须先布局非 Positioned 子组件以确定 Stack 的参考尺寸，然后再布局 Positioned 子组件。
   *
   * 优化：使用了 `_cachedSizes` 数组来减少垃圾回收 (GC) 压力。
   *
   * @param parentConstraints 父组件传递的布局约束
   * @returns 所有子组件的尺寸数组
   */
  protected layoutChildren(parentConstraints: BoxConstraints): Size[] {
    const len = this.children.length;
    // 确保缓存数组长度足够
    if (this._cachedSizes.length < len) {
      this._cachedSizes.length = len;
    }
    const sizes = this._cachedSizes;

    // 优化：如果是紧约束，或者允许溢出，我们可以确定 Positioned 的约束
    // 从而合并循环，避免两次遍历
    const isTight =
      parentConstraints.minWidth === parentConstraints.maxWidth &&
      parentConstraints.minHeight === parentConstraints.maxHeight;

    if (isTight || this.allowOverflowPositioned) {
      const posConstraints = this.allowOverflowPositioned
        ? parentConstraints
        : createBoxConstraints({
            minWidth: 0,
            maxWidth: parentConstraints.maxWidth,
            minHeight: 0,
            maxHeight: parentConstraints.maxHeight,
          });

      for (let i = 0; i < len; i++) {
        const child = this.children[i];
        if (child.isPositioned) {
          sizes[i] = child.layout(posConstraints);
        } else {
          const constraints = this.getConstraintsForChild(parentConstraints, i);
          sizes[i] = child.layout(constraints);
        }
      }
      return sizes;
    }

    let maxNonPosW = 0;
    let maxNonPosH = 0;
    let hasNonPos = false;

    // 1) 先布局非 Positioned 子项以确定 Stack 参考尺寸
    for (let i = 0; i < len; i++) {
      const child = this.children[i];
      // DEBUG
      if (i === 0 && !child.isPositioned && child.type === 'Positioned') {
        // console.error('Stack Layout Error: Positioned widget has isPositioned=false');
      }
      if (!child.isPositioned) {
        const constraints = this.getConstraintsForChild(parentConstraints, i);
        const s = child.layout(constraints);
        sizes[i] = s;
        if (s.width > maxNonPosW) {
          maxNonPosW = s.width;
        }
        if (s.height > maxNonPosH) {
          maxNonPosH = s.height;
        }
        hasNonPos = true;
      }
    }

    // 计算参考尺寸（忽略 Positioned 子项）
    let refWidth = 0;
    let refHeight = 0;
    if (hasNonPos) {
      switch (this.fit) {
        case 'expand':
        case 'passthrough':
          refWidth =
            parentConstraints.maxWidth === Infinity ? maxNonPosW : parentConstraints.maxWidth;
          refHeight =
            parentConstraints.maxHeight === Infinity ? maxNonPosH : parentConstraints.maxHeight;
          break;
        case 'loose':
        default:
          refWidth = maxNonPosW;
          refHeight = maxNonPosH;
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

    for (let i = 0; i < len; i++) {
      const child = this.children[i];
      if (child.isPositioned) {
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
    if (child.isPositioned) {
      // 对于 Positioned 组件，使用其 getStackPosition 方法
      const posChild = child as Positioned;
      if (typeof posChild.getStackPosition === 'function') {
        return posChild.getStackPosition(stackSize);
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
