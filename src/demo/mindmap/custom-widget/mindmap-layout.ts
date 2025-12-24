import { LayoutEngine } from './layout-engine';
import { CustomComponentType, Side } from './type';

import type { MindMapViewport } from './mindmap-viewport';
import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from '@/core/base';

import { Widget } from '@/core/base';

export type LayoutMode = 'radial' | 'tree' | 'treeBalanced';

export interface MindMapLayoutProps extends WidgetProps {
  layout?: LayoutMode;
  spacingX?: number;
  spacingY?: number;
  nodeSpacing?: number;
  side?: 'left' | 'right';
  onLayout?: (size: Size) => void;
}

export class MindMapLayout extends Widget<MindMapLayoutProps> {
  mode: LayoutMode = 'tree';
  spacingX: number = 40;
  spacingY: number = 24;
  nodeSpacing: number = 28;
  side: 'left' | 'right' = 'right';
  onLayout?: (size: Size) => void;
  private computedOffsets: Offset[] = [];
  private lastSignature: string | null = null;
  private lastSize: Size | null = null;
  private lastSides = new Map<string, Side>();

  public visitHitTest(x: number, y: number): Widget | null {
    let wx = x;
    let wy = y;
    const vp = this.parent as MindMapViewport;
    if (typeof vp.scale === 'number' && typeof vp.tx === 'number') {
      const s = vp.scale || 1;
      const tx = vp.tx || 0;
      const ty = vp.ty || 0;
      wx = (x - tx) / s;
      wy = (y - ty) / s;
    }

    const child = this.hitTestChildren(wx, wy);
    if (child) {
      return child;
    }
    if (this.hitTest(wx, wy)) {
      return this;
    }
    return null;
  }

  constructor(data: MindMapLayoutProps) {
    super(data);
    this.init(data);
  }

  private init(data: MindMapLayoutProps): void {
    this.mode = (data.layout ?? this.mode) as LayoutMode;
    this.spacingX = (data.spacingX ?? this.spacingX) as number;
    this.spacingY = (data.spacingY ?? this.spacingY) as number;
    this.nodeSpacing = (data.nodeSpacing ?? this.nodeSpacing) as number;
    this.side = (data.side ?? this.side) as 'left' | 'right';
    this.onLayout = data.onLayout;
  }

  createElement(data: MindMapLayoutProps): Widget<MindMapLayoutProps> {
    super.createElement(data);
    this.init(data);
    return this;
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
    const { offsets, size } = engine.compute(
      constraints,
      this.mode,
      nodes,
      edges,
      this.side,
      this.lastSides,
    );
    this.computedOffsets = this.children.map((_, i) => offsets[i] ?? ({ dx: 0, dy: 0 } as Offset));
    this.lastSignature = signature;
    this.lastSize = size;

    // Update lastSides based on new layout
    const hasIncoming = new Set<string>();
    for (const e of edges) {
      hasIncoming.add(e.to);
    }
    let rootKey = nodes[0].key;
    for (const n of nodes) {
      if (!hasIncoming.has(n.key)) {
        rootKey = n.key;
        break;
      }
    }
    const rootNode = nodes.find((n) => n.key === rootKey);
    if (rootNode) {
      const rootOff = offsets[rootNode.index];
      for (const n of nodes) {
        if (n.key === rootKey) {
          continue;
        }
        const off = offsets[n.index];
        // Threshold can be small epsilon, but usually diff is large
        if (off.dx < rootOff.dx) {
          this.lastSides.set(n.key, Side.Left);
        } else if (off.dx > rootOff.dx) {
          this.lastSides.set(n.key, Side.Right);
        }
      }
    }

    if (this.onLayout) {
      this.onLayout(size);
    }
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
