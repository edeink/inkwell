import { Widget } from './base';

import type { BoxConstraints, Offset, Size, WidgetProps } from './base';

export interface WrapProps extends WidgetProps {
  spacing?: number; // 同一行子元素之间的水平间距
  runSpacing?: number; // 行与行之间的垂直间距
}

/**
 * Wrap 组件：按水平方向排列子元素，超出宽度时自动换行
 * 参考 Flutter 的 Wrap 行为，目标兼容 HTML 的 inline-block + 自动折行
 */
export class Wrap extends Widget<WrapProps> {
  spacing: number = 0;
  runSpacing: number = 0;
  // 使用 Float32Array 存储子节点位置 (x, y)，索引为 childIndex * 2
  // 替代原有的 __wrapLines 对象数组，显著减少内存分配和 GC 压力
  private _childOffsets: Float32Array | null = null;

  constructor(data: WrapProps) {
    super(data);
    this.spacing = data.spacing || 0;
    this.runSpacing = data.runSpacing || 0;
  }

  protected getConstraintsForChild(constraints: BoxConstraints): BoxConstraints {
    return {
      minWidth: 0,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: constraints.maxHeight,
    };
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const maxWidth = isFinite(constraints.maxWidth) ? constraints.maxWidth : Infinity;
    const count = childrenSizes.length;

    // 预分配/复用位置缓存数组
    const requiredSize = count * 2;
    if (!this._childOffsets || this._childOffsets.length < requiredSize) {
      this._childOffsets = new Float32Array(requiredSize);
    }
    const offsets = this._childOffsets;

    let x = 0;
    let y = 0;
    let currentLineHeight = 0;
    let maxLineWidth = 0;

    const spacing = this.spacing;
    const runSpacing = this.runSpacing;

    for (let i = 0; i < count; i++) {
      const childSize = childrenSizes[i];
      const w = childSize.width;
      const h = childSize.height;

      // 计算当前行是否放得下
      // 如果当前不是行首 (x > 0)，需要加上 spacing
      let startX = x;
      if (startX > 0) {
        startX += spacing;
      }

      // 如果超出宽度，且当前行不为空 -> 换行
      if (startX + w > maxWidth && x > 0) {
        maxLineWidth = Math.max(maxLineWidth, x);
        y += currentLineHeight + runSpacing;
        x = 0;
        currentLineHeight = 0;
        startX = 0; // 新行起始位置
      }

      // 记录子节点位置
      offsets[i * 2] = startX;
      offsets[i * 2 + 1] = y;

      // 更新当前行状态
      x = startX + w;
      currentLineHeight = Math.max(currentLineHeight, h);
    }

    // 记录最后一行宽度
    maxLineWidth = Math.max(maxLineWidth, x);
    const totalHeight = y + currentLineHeight;

    const finalWidth = Math.min(Math.max(constraints.minWidth, maxLineWidth), constraints.maxWidth);

    return {
      width: finalWidth,
      height: Math.max(constraints.minHeight, Math.min(totalHeight, constraints.maxHeight)),
    };
  }

  protected positionChild(childIndex: number, _childSize: Size): Offset {
    if (this._childOffsets) {
      const idx = childIndex * 2;
      return { dx: this._childOffsets[idx], dy: this._childOffsets[idx + 1] };
    }
    return { dx: 0, dy: 0 };
  }
}
