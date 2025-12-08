import React from 'react';

import { CustomComponentType } from './type';

import type {
  BoxConstraints,
  BuildContext,
  WidgetProps,
  Offset,
  Size,
  WidgetData,
} from '@/core/base';

import { Widget } from '@/core/base';
import { createWidget as createExternalWidget } from '@/core/registry';

export type LayoutMode = 'radial' | 'tree';

export interface MindMapLayoutData extends WidgetData {
  layout?: LayoutMode;
  spacingX?: number;
  spacingY?: number;
}

/**
 * MindMapLayoutElement：用于控制节点布局
 */
export class MindMapLayout extends Widget<MindMapLayoutData> {
  mode: LayoutMode = 'tree';
  spacingX: number = 40;
  spacingY: number = 24;
  private computedOffsets: Offset[] = [];

  static {
    Widget.registerType(CustomComponentType.MindMapLayout, MindMapLayout);
  }

  constructor(data: MindMapLayoutData) {
    super(data);
    this.init(data);
  }

  private init(data: MindMapLayoutData): void {
    this.mode = (data.layout ?? this.mode) as LayoutMode;
    this.spacingX = (data.spacingX ?? this.spacingX) as number;
    this.spacingY = (data.spacingY ?? this.spacingY) as number;
  }

  createElement(data: MindMapLayoutData): Widget<MindMapLayoutData> {
    super.createElement(data);
    this.init(data);
    return this;
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    return Widget.createWidget(childData) ?? createExternalWidget(childData.type, childData);
  }

  protected paintSelf(_context: BuildContext): void {}

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    if (childrenSizes.length === 0) {
      return { width: constraints.minWidth ?? 0, height: constraints.minHeight ?? 0 } as Size;
    }
    if (this.mode === 'radial') {
      const nodeIndices: number[] = [];
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].type === CustomComponentType.MindMapNode) {
          nodeIndices.push(i);
        }
      }
      const nNodes = nodeIndices.length;
      if (nNodes === 0) {
        this.computedOffsets = this.children.map(() => ({ dx: 0, dy: 0 }));
        return { width: constraints.minWidth, height: constraints.minHeight } as Size;
      }
      const rootIdx = nodeIndices[0];
      const cx = Math.max(childrenSizes[rootIdx].width, 120);
      const cy = Math.max(childrenSizes[rootIdx].height, 60);
      const r = Math.max(cx, cy) + 80;
      const n = Math.max(1, nNodes - 1);
      const offsets: Offset[] = this.children.map(() => ({ dx: 0, dy: 0 }));
      for (let k = 1; k < nNodes; k++) {
        const i = nodeIndices[k];
        const ang = (2 * Math.PI * (k - 1)) / n;
        offsets[i] = { dx: cx / 2 + Math.cos(ang) * r, dy: cy / 2 + Math.sin(ang) * r } as Offset;
      }
      offsets[rootIdx] = { dx: 0, dy: 0 } as Offset;

      // 统计内容包围盒（未居中前）
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let k = 0; k < nNodes; k++) {
        const i = nodeIndices[k];
        const off = offsets[i];
        const sz = childrenSizes[i];
        minX = Math.min(minX, off.dx);
        minY = Math.min(minY, off.dy);
        maxX = Math.max(maxX, off.dx + sz.width);
        maxY = Math.max(maxY, off.dy + sz.height);
      }
      const contentW = Math.max(0, maxX - minX);
      const contentH = Math.max(0, maxY - minY);
      const availW =
        Number.isFinite(constraints.maxWidth) && constraints.maxWidth > 0
          ? constraints.maxWidth
          : contentW;
      const availH =
        Number.isFinite(constraints.maxHeight) && constraints.maxHeight > 0
          ? constraints.maxHeight
          : contentH;
      // 计算居中平移量（使内容包围盒中心与视窗中心重合）
      const dx0 = Math.round((availW - contentW) / 2 - minX);
      const dy0 = Math.round((availH - contentH) / 2 - minY);
      // 应用居中平移至节点，绘制型子组件保持 (0,0)
      // 将平移量叠加到节点偏移；绘制型子组件维持 (0,0)
      this.computedOffsets = this.children.map((_, i) => {
        const base = offsets[i] || { dx: 0, dy: 0 };
        if (this.children[i].type === CustomComponentType.MindMapNode) {
          return { dx: base.dx + dx0, dy: base.dy + dy0 } as Offset;
        }
        return { dx: 0, dy: 0 } as Offset;
      });
      return { width: availW, height: availH };
    } else {
      const nodeIndices: number[] = [];
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].type === CustomComponentType.MindMapNode) {
          nodeIndices.push(i);
        }
      }
      if (nodeIndices.length === 0) {
        this.computedOffsets = this.children.map(() => ({ dx: 0, dy: 0 }));
        return { width: constraints.minWidth, height: constraints.minHeight } as Size;
      }
      const rootIdx = nodeIndices[0];
      const rootSize = childrenSizes[rootIdx];
      const offsets: Offset[] = this.children.map(() => ({ dx: 0, dy: 0 }));
      offsets[rootIdx] = { dx: 0, dy: 0 } as Offset;
      const xBase = rootSize.width + this.spacingX;
      let totalH = rootSize.height;
      for (let k = 1; k < nodeIndices.length; k++) {
        const i = nodeIndices[k];
        const dy = (k - 1) * (childrenSizes[i].height + this.spacingY);
        offsets[i] = { dx: xBase, dy } as Offset;
        totalH = Math.max(totalH, dy + childrenSizes[i].height);
      }

      // 统计内容包围盒（未居中前）
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let k = 0; k < nodeIndices.length; k++) {
        const i = nodeIndices[k];
        const off = offsets[i];
        const sz = childrenSizes[i];
        minX = Math.min(minX, off.dx);
        minY = Math.min(minY, off.dy);
        maxX = Math.max(maxX, off.dx + sz.width);
        maxY = Math.max(maxY, off.dy + sz.height);
      }
      const contentW = Math.max(0, maxX - minX);
      const contentH = Math.max(0, maxY - minY);
      const availW =
        Number.isFinite(constraints.maxWidth) && constraints.maxWidth > 0
          ? constraints.maxWidth
          : contentW;
      const availH =
        Number.isFinite(constraints.maxHeight) && constraints.maxHeight > 0
          ? constraints.maxHeight
          : contentH;
      // 计算居中平移量（使内容包围盒中心与视窗中心重合）
      const dx0 = Math.round((availW - contentW) / 2 - minX);
      const dy0 = Math.round((availH - contentH) / 2 - minY);
      // 应用居中平移至节点，绘制型子组件保持 (0,0)
      // 将平移量叠加到节点偏移；绘制型子组件维持 (0,0)
      this.computedOffsets = this.children.map((_, i) => {
        const base = offsets[i] || { dx: 0, dy: 0 };
        if (this.children[i].type === CustomComponentType.MindMapNode) {
          return { dx: base.dx + dx0, dy: base.dy + dy0 } as Offset;
        }
        return { dx: 0, dy: 0 } as Offset;
      });
      return { width: availW, height: availH };
    }
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    void childIndex;
    return {
      minWidth: 0,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: constraints.maxHeight,
    };
  }

  protected positionChild(childIndex: number, childSize: Size): Offset {
    void childSize;
    if (!this.computedOffsets || !this.computedOffsets[childIndex]) {
      return { dx: 0, dy: 0 } as Offset;
    }
    return this.computedOffsets[childIndex];
  }
}

export type MindMapLayoutProps = Omit<MindMapLayoutData, 'type' | 'children'> & WidgetProps;
export const MindMapLayoutElement: React.FC<MindMapLayoutProps> = () => null;
