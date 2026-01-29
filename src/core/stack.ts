import { Widget, createBoxConstraints } from './base';
import { Positioned } from './positioned';
import { StatelessWidget } from './state/stateless';

import type { BoxConstraints, Offset, Size, WidgetProps } from './base';

export const StackFit = {
  Loose: 'loose',
  Expand: 'expand',
  Passthrough: 'passthrough',
} as const;
export type StackFit = (typeof StackFit)[keyof typeof StackFit];

export const AlignmentGeometry = {
  TopLeft: 'topLeft',
  TopCenter: 'topCenter',
  TopRight: 'topRight',
  CenterLeft: 'centerLeft',
  Center: 'center',
  CenterRight: 'centerRight',
  BottomLeft: 'bottomLeft',
  BottomCenter: 'bottomCenter',
  BottomRight: 'bottomRight',
} as const;
export type AlignmentGeometry = (typeof AlignmentGeometry)[keyof typeof AlignmentGeometry];

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
  alignment: AlignmentGeometry = AlignmentGeometry.Center;
  fit: StackFit = StackFit.Loose;
  allowOverflowPositioned: boolean = false;

  // 缓存布局结果数组，减少每帧 GC 压力
  private _cachedSizes: Size[] = [];

  constructor(data: StackProps) {
    super(data);
    this.initStackProperties(data);
  }

  private getPositionedProxy(child: Widget): Positioned | null {
    let w: Widget | null = child;
    for (let depth = 0; depth < 128 && w; depth++) {
      if (w.isPositioned) {
        return w as Positioned;
      }
      if (w instanceof StatelessWidget) {
        const childList = w.children as Widget[];
        if (childList && childList.length === 1) {
          w = childList[0];
          continue;
        }
      }
      return null;
    }
    return null;
  }

  private initStackProperties(data: StackProps): void {
    // 默认开启点击穿透
    if (data.pointerEvent === undefined) {
      this.pointerEvent = 'none';
    }
    this.alignment = data.alignment || AlignmentGeometry.TopLeft;
    this.fit = data.fit || StackFit.Loose;
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
      if (!this.getPositionedProxy(child)) {
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
      case StackFit.Expand:
      case StackFit.Passthrough:
        // 扩展到最大约束
        width = constraints.maxWidth === Infinity ? maxNonPosW : constraints.maxWidth;
        height = constraints.maxHeight === Infinity ? maxNonPosH : constraints.maxHeight;
        break;

      case StackFit.Loose:
      default:
        // 根据子组件的最大尺寸确定
        width = maxNonPosW;
        height = maxNonPosH;
        break;
    }

    let maxPosReqW = 0;
    let maxPosReqH = 0;
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const pos = this.getPositionedProxy(child);
      if (!pos) {
        continue;
      }
      const s = childrenSizes[i];
      if (!s) {
        continue;
      }
      const childW = s.width;
      const childH = s.height;

      let reqW = 0;
      if (pos.left !== undefined && pos.right !== undefined) {
        reqW = pos.left + childW + pos.right;
      } else if (pos.left !== undefined) {
        reqW = pos.left + childW;
      } else if (pos.right !== undefined) {
        reqW = pos.right + childW;
      } else {
        reqW = childW;
      }

      let reqH = 0;
      if (pos.top !== undefined && pos.bottom !== undefined) {
        reqH = pos.top + childH + pos.bottom;
      } else if (pos.top !== undefined) {
        reqH = pos.top + childH;
      } else if (pos.bottom !== undefined) {
        reqH = pos.bottom + childH;
      } else {
        reqH = childH;
      }

      if (reqW > maxPosReqW) {
        maxPosReqW = reqW;
      }
      if (reqH > maxPosReqH) {
        maxPosReqH = reqH;
      }
    }

    if (maxPosReqW > width) {
      width = maxPosReqW;
    }
    if (maxPosReqH > height) {
      height = maxPosReqH;
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

      const posChild = this.getPositionedProxy(child);
      if (posChild) {
        // 优化：内联 Positioned 计算逻辑，避免创建 Offset 对象
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

    if (isTight) {
      for (let i = 0; i < len; i++) {
        const child = this.children[i];
        if (this.getPositionedProxy(child)) {
          sizes[i] = child.layout(parentConstraints);
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
      if (!this.getPositionedProxy(child)) {
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
        case StackFit.Expand:
        case StackFit.Passthrough:
          refWidth =
            parentConstraints.maxWidth === Infinity ? maxNonPosW : parentConstraints.maxWidth;
          refHeight =
            parentConstraints.maxHeight === Infinity ? maxNonPosH : parentConstraints.maxHeight;
          break;
        case StackFit.Loose:
        default:
          refWidth = maxNonPosW;
          refHeight = maxNonPosH;
      }
    } else {
      // 若不存在非 Positioned 子项，参考尺寸退化为父约束的最小值
      refWidth = parentConstraints.minWidth ?? 0;
      refHeight = parentConstraints.minHeight ?? 0;
    }

    if (!hasNonPos) {
      for (let i = 0; i < len; i++) {
        const child = this.children[i];
        const pos = this.getPositionedProxy(child);
        if (!pos) {
          continue;
        }
        if (pos.width !== undefined) {
          const left = pos.left ?? 0;
          const right = pos.right ?? 0;
          const w = left + right + pos.width;
          if (w > refWidth) {
            refWidth = w;
          }
        }
        if (pos.height !== undefined) {
          const top = pos.top ?? 0;
          const bottom = pos.bottom ?? 0;
          const h = top + bottom + pos.height;
          if (h > refHeight) {
            refHeight = h;
          }
        }
      }
    }

    const maxWidthForPos = Number.isFinite(parentConstraints.maxWidth)
      ? parentConstraints.maxWidth
      : refWidth > 0
        ? refWidth
        : parentConstraints.maxWidth;
    const maxHeightForPos = Number.isFinite(parentConstraints.maxHeight)
      ? parentConstraints.maxHeight
      : refHeight > 0
        ? refHeight
        : parentConstraints.maxHeight;

    const posMaxWidth = this.allowOverflowPositioned
      ? maxWidthForPos
      : refWidth === 0
        ? maxWidthForPos
        : refWidth;
    const posMaxHeight = this.allowOverflowPositioned
      ? maxHeightForPos
      : refHeight === 0
        ? maxHeightForPos
        : refHeight;

    const refPosConstraints = createBoxConstraints({
      minWidth: 0,
      maxWidth: posMaxWidth,
      minHeight: 0,
      maxHeight: posMaxHeight,
    });
    const posConstraints = refPosConstraints;

    for (let i = 0; i < len; i++) {
      const child = this.children[i];
      if (this.getPositionedProxy(child)) {
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
      case StackFit.Expand:
        // 强制子组件扩展到 Stack 的尺寸
        return {
          minWidth: constraints.maxWidth === Infinity ? 0 : constraints.maxWidth,
          maxWidth: constraints.maxWidth,
          minHeight: constraints.maxHeight === Infinity ? 0 : constraints.maxHeight,
          maxHeight: constraints.maxHeight,
        };

      case StackFit.Passthrough:
        // 直接传递约束
        return constraints;

      case StackFit.Loose:
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
    const posChild = this.getPositionedProxy(child);
    if (posChild) {
      let dx = 0;
      let dy = 0;

      if (posChild.left !== undefined) {
        dx = posChild.left;
      } else if (posChild.right !== undefined) {
        dx = stackSize.width - posChild.right - childSize.width;
      }

      if (posChild.top !== undefined) {
        dy = posChild.top;
      } else if (posChild.bottom !== undefined) {
        dy = stackSize.height - posChild.bottom - childSize.height;
      }
      return { dx, dy };
    }

    // 根据对齐方式计算位置
    let dx: number;
    let dy: number;

    switch (this.alignment) {
      case AlignmentGeometry.TopLeft:
        dx = 0;
        dy = 0;
        break;
      case AlignmentGeometry.TopCenter:
        dx = (stackSize.width - childSize.width) / 2;
        dy = 0;
        break;
      case AlignmentGeometry.TopRight:
        dx = stackSize.width - childSize.width;
        dy = 0;
        break;
      case AlignmentGeometry.CenterLeft:
        dx = 0;
        dy = (stackSize.height - childSize.height) / 2;
        break;
      case AlignmentGeometry.Center:
        dx = (stackSize.width - childSize.width) / 2;
        dy = (stackSize.height - childSize.height) / 2;
        break;
      case AlignmentGeometry.CenterRight:
        dx = stackSize.width - childSize.width;
        dy = (stackSize.height - childSize.height) / 2;
        break;
      case AlignmentGeometry.BottomLeft:
        dx = 0;
        dy = stackSize.height - childSize.height;
        break;
      case AlignmentGeometry.BottomCenter:
        dx = (stackSize.width - childSize.width) / 2;
        dy = stackSize.height - childSize.height;
        break;
      case AlignmentGeometry.BottomRight:
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
