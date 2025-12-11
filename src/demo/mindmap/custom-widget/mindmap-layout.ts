import React from 'react';

import { CustomComponentType, Side } from './type';

import type {
  BoxConstraints,
  BuildContext,
  Offset,
  Size,
  WidgetData,
  WidgetProps,
} from '@/core/base';

import { Widget } from '@/core/base';
import { createWidget as createExternalWidget } from '@/core/registry';
import { computeBalancedTreePositions } from '@/demo/mindmap/helpers/layout-engine/balanced';
import { computeTreePositions } from '@/demo/mindmap/helpers/layout-engine/tree';

export type LayoutMode = 'radial' | 'tree' | 'treeBalanced';

export interface MindMapLayoutData extends WidgetData {
  layout?: LayoutMode;
  spacingX?: number;
  spacingY?: number;
  nodeSpacing?: number;
  side?: 'left' | 'right';
}

/**
 * MindMapLayoutElement：用于控制节点布局
 */
export class MindMapLayout extends Widget<MindMapLayoutData> {
  mode: LayoutMode = 'tree';
  spacingX: number = 40;
  spacingY: number = 24;
  nodeSpacing: number = 28;
  side: 'left' | 'right' = 'right';
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
    this.nodeSpacing = (data.nodeSpacing ?? this.nodeSpacing) as number;
    this.side = (data.side ?? this.side) as 'left' | 'right';
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
    const t0 = Date.now();
    if (this.mode === 'radial') {
      const nodeIndices: number[] = [];
      for (let i = 0; i < this.children.length; i++) {
        const t = this.children[i].type;
        if (t === CustomComponentType.MindMapNode) {
          nodeIndices.push(i);
        }
      }
      const nNodes = nodeIndices.length;
      if (nNodes === 0) {
        this.computedOffsets = this.children.map(() => ({ dx: 0, dy: 0 }));
        return { width: constraints.minWidth, height: constraints.minHeight } as Size;
      }
      const rootIdx = nodeIndices[0];
      const rootWidget = this.children[rootIdx];
      const rootSize = childrenSizes[rootIdx];
      const cx = Math.max(rootSize.width, 120);
      const cy = Math.max(rootSize.height, 60);
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
        const w = this.children[i];
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
        const t = this.children[i].type;
        if (t === CustomComponentType.MindMapNode) {
          return { dx: base.dx + dx0, dy: base.dy + dy0 } as Offset;
        }
        return { dx: 0, dy: 0 } as Offset;
      });
      return { width: availW, height: availH };
    } else {
      const nodes: Array<{ index: number; key: string; size: Size; widget: Widget }> = [];
      const edges: Array<{ from: string; to: string }> = [];
      for (let i = 0; i < this.children.length; i++) {
        const ch = this.children[i];
        if (ch.type === CustomComponentType.MindMapNode) {
          const sz = childrenSizes[i];
          nodes.push({ index: i, key: ch.key, size: sz, widget: ch });
        } else if (ch.type === CustomComponentType.Connector) {
          const d = ch as unknown as { fromKey?: string; toKey?: string };
          if (typeof d.fromKey === 'string' && typeof d.toKey === 'string') {
            edges.push({ from: d.fromKey, to: d.toKey });
          }
        }
      }
      if (nodes.length === 0) {
        this.computedOffsets = this.children.map(() => ({ dx: 0, dy: 0 }));
        return { width: constraints.minWidth, height: constraints.minHeight } as Size;
      }
      const indexByKey = new Map<string, number>();
      const sizeByKey = new Map<string, Size>();
      const widgetByKey = new Map<string, Widget>();
      for (const n of nodes) {
        indexByKey.set(n.key, n.index);
        sizeByKey.set(n.key, n.size);
        const w = n.widget;
        widgetByKey.set(n.key, w);
      }
      const childMap = new Map<string, string[]>();
      for (const e of edges) {
        const arr = childMap.get(e.from) || [];
        arr.push(e.to);
        childMap.set(e.from, arr);
      }
      const hasIncoming = new Map<string, boolean>();
      for (const e of edges) {
        hasIncoming.set(e.to, true);
      }
      let rootKey = nodes[0].key;
      for (const n of nodes) {
        if (!hasIncoming.get(n.key)) {
          rootKey = n.key;
          break;
        }
      }
      let res: { posByKey: Map<string, Offset>; levels: number };
      if (this.mode === 'treeBalanced') {
        const prefSideByKey = new Map<string, Side | undefined>();
        const rootChildren = childMap.get(rootKey) || [];
        for (const c of rootChildren) {
          const w = widgetByKey.get(c) as any;
          const ps = (w?.prefSide ?? undefined) as Side | undefined;
          prefSideByKey.set(c, ps);
        }
        res = computeBalancedTreePositions(
          sizeByKey,
          childMap,
          rootKey,
          this.spacingX,
          this.nodeSpacing ?? this.spacingY,
          prefSideByKey,
        );
      } else {
        res = computeTreePositions(
          sizeByKey,
          childMap,
          rootKey,
          this.spacingX,
          this.nodeSpacing ?? this.spacingY,
          this.side,
        );
      }
      const offsets: Offset[] = this.children.map(() => ({ dx: 0, dy: 0 }));
      for (const n of nodes) {
        const p = res.posByKey.get(n.key) || { dx: 0, dy: 0 };
        offsets[n.index] = p;
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of nodes) {
        const off = offsets[n.index];
        const sz = n.size;
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
      const dx0 = Math.round((availW - contentW) / 2 - minX);
      const dy0 = Math.round((availH - contentH) / 2 - minY);
      this.computedOffsets = this.children.map((_, i) => {
        const base = offsets[i] || { dx: 0, dy: 0 };
        const t = this.children[i].type;
        if (t === CustomComponentType.MindMapNode) {
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
