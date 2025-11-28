import React from 'react';

import { Widget } from './base';
import { ComponentType } from './type';

import type {
  BoxConstraints,
  BuildContext,
  JSXComponentProps,
  Offset,
  Size,
  WidgetData,
} from './base';

export interface WrapData extends WidgetData {
  spacing?: number; // 同一行子元素之间的水平间距
  runSpacing?: number; // 行与行之间的垂直间距
}

/**
 * Wrap 组件：按水平方向排列子元素，超出宽度时自动换行
 * 参考 Flutter 的 Wrap 行为，目标兼容 HTML 的 inline-block + 自动折行
 */
export class Wrap extends Widget<WrapData> {
  spacing: number = 0;
  runSpacing: number = 0;

  constructor(data: WrapData) {
    super(data);
    this.spacing = data.spacing || 0;
    this.runSpacing = data.runSpacing || 0;
  }

  static {
    Widget.registerType(ComponentType.Wrap, Wrap);
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    return Widget.createWidget(childData);
  }

  protected paintSelf(context: BuildContext): void {}

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    return {
      minWidth: 0,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: constraints.maxHeight,
    };
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const maxWidth = isFinite(constraints.maxWidth) ? constraints.maxWidth : Infinity;
    const lines: { widths: number; height: number; indices: number[] }[] = [];
    let currentLineWidth = 0;
    let currentLineHeight = 0;
    let currentIndices: number[] = [];

    for (let i = 0; i < childrenSizes.length; i++) {
      const sz = childrenSizes[i];
      const nextWidth =
        currentIndices.length === 0 ? sz.width : currentLineWidth + this.spacing + sz.width;
      if (nextWidth > maxWidth) {
        // 换行
        lines.push({
          widths: currentLineWidth,
          height: currentLineHeight,
          indices: currentIndices,
        });
        currentLineWidth = sz.width;
        currentLineHeight = sz.height;
        currentIndices = [i];
      } else {
        currentLineWidth = nextWidth;
        currentLineHeight = Math.max(currentLineHeight, sz.height);
        currentIndices.push(i);
      }
    }
    if (currentIndices.length > 0) {
      lines.push({ widths: currentLineWidth, height: currentLineHeight, indices: currentIndices });
    }

    const totalHeight = lines.reduce(
      (acc, l, idx) => acc + l.height + (idx > 0 ? this.runSpacing : 0),
      0,
    );
    const finalWidth = Math.min(
      Math.max(constraints.minWidth, Math.max(...lines.map((l) => l.widths))),
      constraints.maxWidth,
    );

    // 记录行信息以供定位
    (this as any).__wrapLines = lines;

    return {
      width: finalWidth,
      height: Math.max(constraints.minHeight, Math.min(totalHeight, constraints.maxHeight)),
    };
  }

  protected positionChild(childIndex: number, childSize: Size): Offset {
    const lines: { widths: number; height: number; indices: number[] }[] =
      (this as any).__wrapLines || [];
    let y = 0;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const idxInLine = line.indices.indexOf(childIndex);
      if (idxInLine >= 0) {
        let x = 0;
        for (let k = 0; k < idxInLine; k++) {
          const prevChild = this.children[line.indices[k]];
          x += prevChild.renderObject.size.width;
          if (k < idxInLine) {
            x += this.spacing;
          }
        }
        return { dx: x, dy: y };
      }
      y += line.height + this.runSpacing;
    }
    return { dx: 0, dy: 0 };
  }
}

export type WrapProps = Omit<WrapData, 'type' | 'children'> & JSXComponentProps;
export const WrapElement: React.FC<WrapProps> = () => null;
