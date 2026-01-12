import { Widget } from './base';

import type { BoxConstraints, Offset, Size, WidgetProps } from './base';
import type { EdgeInsets, PaddingValue } from './type';

export interface PaddingProps extends WidgetProps {
  padding: PaddingValue;
}

export const ZERO_EDGE_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * 将 PaddingValue 标准化为 EdgeInsets 对象
 * @param value 输入的 padding 值
 * @returns 标准化的 EdgeInsets 对象
 */
export function resolveEdgeInsets(value: PaddingValue | undefined): EdgeInsets {
  if (value === undefined) {
    return ZERO_EDGE_INSETS;
  }
  if (typeof value === 'number') {
    if (value === 0) {
      return ZERO_EDGE_INSETS;
    }
    return { top: value, right: value, bottom: value, left: value };
  }
  if (Array.isArray(value)) {
    // 检查数组元素是否全部为 number
    if (!value.every((v) => typeof v === 'number')) {
      console.error('Padding 数组必须仅包含数字');
      return ZERO_EDGE_INSETS;
    }

    // 优化：检查是否全 0
    if (value.length > 0) {
      let allZero = true;
      for (const v of value) {
        if (v !== 0) {
          allZero = false;
          break;
        }
      }
      if (allZero) {
        return ZERO_EDGE_INSETS;
      }
    }

    switch (value.length) {
      case 1:
        // [all]
        return { top: value[0], right: value[0], bottom: value[0], left: value[0] };
      case 2:
        // [vertical, horizontal] -> top/bottom, left/right
        return { top: value[0], right: value[1], bottom: value[0], left: value[1] };
      case 3:
        // [top, horizontal, bottom] -> top, left/right, bottom
        return { top: value[0], right: value[1], bottom: value[2], left: value[1] };
      case 4:
        // [top, right, bottom, left]
        return { top: value[0], right: value[1], bottom: value[2], left: value[3] };
      default:
        console.error('Padding 数组长度必须在 1 到 4 之间');
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }
  }
  return value;
}

/**
 * Padding 组件 - 为子组件添加内边距
 */
export class Padding extends Widget<PaddingProps> {
  padding: Required<EdgeInsets> = { top: 0, right: 0, bottom: 0, left: 0 };

  constructor(data: PaddingProps) {
    super(data);
    this.initPaddingProperties(data);
  }

  private initPaddingProperties(data: PaddingProps): void {
    const resolved = resolveEdgeInsets(data.padding);
    this.padding = {
      top: resolved.top || 0,
      right: resolved.right || 0,
      bottom: resolved.bottom || 0,
      left: resolved.left || 0,
    };
  }

  createElement(data: PaddingProps): Widget<PaddingProps> {
    super.createElement(data);
    this.initPaddingProperties(data);
    return this;
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const childSize = childrenSizes[0] || { width: 0, height: 0 };

    // 计算总尺寸（子组件尺寸 + 内边距）
    const width = childSize.width + this.padding.left + this.padding.right;
    const height = childSize.height + this.padding.top + this.padding.bottom;

    // 确保满足约束条件
    return {
      width: Math.max(constraints.minWidth, Math.min(width, constraints.maxWidth)),
      height: Math.max(constraints.minHeight, Math.min(height, constraints.maxHeight)),
    };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    _childIndex: number,
  ): BoxConstraints {
    // 计算可用于子组件的空间
    const paddingHorizontal = this.padding.left + this.padding.right;
    const paddingVertical = this.padding.top + this.padding.bottom;

    return {
      minWidth: Math.max(0, constraints.minWidth - paddingHorizontal),
      maxWidth: Math.max(0, constraints.maxWidth - paddingHorizontal),
      minHeight: Math.max(0, constraints.minHeight - paddingVertical),
      maxHeight: Math.max(0, constraints.maxHeight - paddingVertical),
    };
  }

  protected positionChild(_childIndex: number, _childSize: Size): Offset {
    // 子组件的位置偏移内边距
    return {
      dx: this.padding.left,
      dy: this.padding.top,
    };
  }
}

// 便捷函数：创建对称内边距
export function symmetric(vertical: number = 0, horizontal: number = 0): EdgeInsets {
  return {
    top: vertical,
    bottom: vertical,
    left: horizontal,
    right: horizontal,
  };
}

// 便捷函数：创建只有某一边的内边距
export function only(options: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}): EdgeInsets {
  return {
    top: options.top || 0,
    right: options.right || 0,
    bottom: options.bottom || 0,
    left: options.left || 0,
  };
}

// 便捷函数：创建所有边相同的内边距
export function all(value: number): EdgeInsets {
  return {
    top: value,
    right: value,
    bottom: value,
    left: value,
  };
}
