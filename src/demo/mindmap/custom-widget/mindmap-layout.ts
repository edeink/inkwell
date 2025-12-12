import React from 'react';

import { LayoutEngine } from './layout-engine';
import { CustomComponentType } from './type';

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

export type LayoutMode = 'radial' | 'tree' | 'treeBalanced';

export interface MindMapLayoutData extends WidgetData {
  layout?: LayoutMode;
  spacingX?: number;
  spacingY?: number;
  nodeSpacing?: number;
  side?: 'left' | 'right';
}

export class MindMapLayout extends Widget<MindMapLayoutData> {
  mode: LayoutMode = 'tree';
  spacingX: number = 40;
  spacingY: number = 24;
  nodeSpacing: number = 28;
  side: 'left' | 'right' = 'right';
  private computedOffsets: Offset[] = [];
  private lastSignature: string | null = null;
  private lastSize: Size | null = null;

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
    const signature = this.computeSignature(constraints, childrenSizes);
    if (this.lastSignature && signature === this.lastSignature && this.lastSize) {
      return this.lastSize;
    }

    // 统一交由布局引擎处理不同模式

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
    const engine = new LayoutEngine(this.spacingX, this.spacingY, this.nodeSpacing);
    const { offsets, size } = engine.compute(constraints, this.mode, nodes, edges, this.side);
    this.computedOffsets = this.children.map((_, i) => offsets[i] ?? ({ dx: 0, dy: 0 } as Offset));
    this.lastSignature = signature;
    this.lastSize = size;
    return size;
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    _childIndex: number,
  ): BoxConstraints {
    return {
      minWidth: 0,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: constraints.maxHeight,
    };
  }

  protected positionChild(childIndex: number, _childSize: Size): Offset {
    if (!this.computedOffsets || !this.computedOffsets[childIndex]) {
      return { dx: 0, dy: 0 } as Offset;
    }
    return this.computedOffsets[childIndex];
  }

  private computeSignature(constraints: BoxConstraints, childrenSizes: Size[]): string {
    const parts: string[] = [];
    parts.push(`mode:${this.mode}`);
    parts.push(`sx:${this.spacingX}`);
    parts.push(`sy:${this.spacingY}`);
    parts.push(`ns:${this.nodeSpacing}`);
    parts.push(`side:${this.side}`);
    parts.push(`mw:${constraints.maxWidth}`);
    parts.push(`mh:${constraints.maxHeight}`);
    for (let i = 0; i < this.children.length; i++) {
      const ch = this.children[i];
      const sz = childrenSizes[i];
      parts.push(`${ch.type}:${ch.key}:${sz.width}x${sz.height}`);
      if (ch.type === CustomComponentType.Connector) {
        const d = ch as unknown as { fromKey?: string; toKey?: string };
        parts.push(`edge:${String(d.fromKey)}->${String(d.toKey)}`);
      }
    }
    return parts.join('|');
  }
}

export type MindMapLayoutProps = Omit<MindMapLayoutData, 'type' | 'children'> & WidgetProps;
export const MindMapLayoutElement: React.FC<MindMapLayoutProps> = () => null;
