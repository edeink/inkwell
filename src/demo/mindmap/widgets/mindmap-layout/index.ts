import { LayoutEngine } from '../../helpers/layout-engine';
import { CustomComponentType, Side } from '../../type';

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
    // 移除手动坐标变换，因为子节点 (MindMapNode) 已通过 _worldMatrix 处理了坐标变换
    // 直接传递屏幕坐标即可
    const child = this.hitTestChildren(x, y);
    if (child) {
      return child;
    }
    if (this.hitTest(x, y)) {
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
  protected paintSelf(_context: BuildContext): void {
    void _context;
  }

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

    // 根据新布局更新 lastSides
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
        // 阈值可以是极小值，但通常差异较大
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
    void _childIndex;
    return {
      minWidth: 0,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: constraints.maxHeight,
    };
  }

  protected positionChild(childIndex: number, _childSize: Size): Offset {
    void _childSize;
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
