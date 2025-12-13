/**
 * MindMapNodeToolbar（节点工具栏包装器）
 * 组件功能说明：
 * - 整合原 ToolbarLayer 的绘制与命中逻辑至本组件
 * - 根据激活/悬停状态显示，加号按钮随视口缩放/平移实时跟随
 * - 位置计算考虑边界自适应，避免绘制在画布可视区域之外
 * - 保持与节点拖拽/点击的交互一致性
 */

import { Connector } from './connector';
import { CustomComponentType, Side } from './type';
import { Viewport } from './viewport';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Widget } from '@/core/base';
import { findWidget } from '@/core/helper/widget-selector';

export interface MindMapNodeToolbarProps extends WidgetProps {
  onActive?: (key: string | null) => void;
  onAddSibling?: (refKey: string, dir: -1 | 1) => void;
  onAddChildSide?: (refKey: string, side: Side) => void;
  activeKey?: string | null;
}

function calculatePlusButtonPosition(
  side: 'top' | 'bottom' | 'left' | 'right',
  nodeRect: { x: number; y: number; width: number; height: number },
  buttonSize: { width: number; height: number },
  margin: number,
): { x: number; y: number } {
  const bw = buttonSize.width;
  const bh = buttonSize.height;
  const x0 = nodeRect.x;
  const y0 = nodeRect.y;
  const w = nodeRect.width;
  const h = nodeRect.height;
  if (side === 'left') {
    return { x: x0 - margin - bw, y: y0 + h / 2 - bh / 2 };
  }
  if (side === 'right') {
    return { x: x0 + w + margin, y: y0 + h / 2 - bh / 2 };
  }
  if (side === 'top') {
    return { x: x0 + w / 2 - bw / 2, y: y0 - margin - bh };
  }
  return { x: x0 + w / 2 - bw / 2, y: y0 + h + margin };
}

/**
 * MindMapNodeToolbar（节点工具栏包装器）
 * - 封装一个 MindMapNode 子组件，并在其周围绘制加号按钮
 * - 命中与事件在本组件中处理，确保 zIndex 与响应顺序正确
 */
export class MindMapNodeToolbar extends Widget<MindMapNodeToolbarProps> {
  private _onAddSibling?: (refKey: string, dir: -1 | 1) => void;
  private _onAddChildSide?: (refKey: string, side: Side) => void;

  constructor(data: MindMapNodeToolbarProps) {
    super({ ...data, zIndex: typeof data.zIndex === 'number' ? data.zIndex : 1 });
    this.init(data);
  }

  private init(data: MindMapNodeToolbarProps): void {
    this._onAddSibling = data.onAddSibling;
    this._onAddChildSide = data.onAddChildSide;
  }

  createElement(data: MindMapNodeToolbarProps): Widget<MindMapNodeToolbarProps> {
    super.createElement({ ...data, zIndex: typeof data.zIndex === 'number' ? data.zIndex : 1 });
    this.init(data);
    return this;
  }

  protected createChildWidget(_childData: WidgetProps): Widget | null {
    return null;
  }

  protected performLayout(): Size {
    let root: Widget | null = (this as unknown as Widget) ?? null;
    while (root && root.parent) {
      root = root.parent as Widget;
    }
    const vp = findWidget(root, 'Viewport') as Viewport | null;
    if (vp) {
      return { width: vp.width, height: vp.height } as Size;
    }
    const node = findWidget(root, ':active') as Widget | null;
    return node ? (node.renderObject.size as Size) : ({ width: 0, height: 0 } as Size);
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    void childIndex;
    return constraints;
  }

  protected positionChild(): Offset {
    return { dx: 0, dy: 0 };
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    let root: Widget | null = (this as unknown as Widget) ?? null;
    while (root && root.parent) {
      root = root.parent as Widget;
    }
    const node = findWidget(root, ':active') as Widget | null;
    const vp = findWidget(root, 'Viewport') as Viewport | null;
    if (!node || !vp) {
      return;
    }
    const activeKey = this.getActiveKey();
    const active = activeKey === node.key;
    if (!active) {
      return;
    }
    const size = node.renderObject.size as Size;
    const margin = 6;
    const sides = this.resolveSides(node, size);
    const pNode = node.getAbsolutePosition();
    const nodeRect = { x: pNode.dx, y: pNode.dy, width: size.width, height: size.height };
    const btnSize = 20;
    const half = btnSize / 2;
    const btnBlue = '#1890ff';
    const white = '#ffffff';
    const pOverlay = this.getAbsolutePosition();
    const drawPlusLocal = (wx: number, wy: number) => {
      const lx = wx - pOverlay.dx;
      const ly = wy - pOverlay.dy;
      renderer.drawRect({
        x: lx,
        y: ly,
        width: btnSize,
        height: btnSize,
        fill: btnBlue,
        stroke: btnBlue,
        strokeWidth: 1,
        borderRadius: 8,
      });
      const cx = lx + half;
      const cy = ly + half;
      renderer.drawLine({ x1: cx - 5, y1: cy, x2: cx + 5, y2: cy, stroke: white, strokeWidth: 2 });
      renderer.drawLine({ x1: cx, y1: cy - 5, x2: cx, y2: cy + 5, stroke: white, strokeWidth: 2 });
    };
    for (const s of sides) {
      const pos = calculatePlusButtonPosition(
        s,
        nodeRect,
        { width: btnSize, height: btnSize },
        margin,
      );
      drawPlusLocal(pos.x, pos.y);
    }
  }

  public hitTest(x: number, y: number): boolean {
    let root: Widget | null = (this as unknown as Widget) ?? null;
    while (root && root.parent) {
      root = root.parent as Widget;
    }
    const node = findWidget(root, ':active') as Widget | null;
    const vp = findWidget(root, 'Viewport') as Viewport | null;
    if (!node || !vp) {
      return false;
    }
    const activeKey = this.getActiveKey();
    const active = activeKey === node.key;
    if (!active) {
      return false;
    }
    const size = node.renderObject.size as Size;
    const margin = 6;
    const sides = this.resolveSides(node, size);
    const pNode = node.getAbsolutePosition();
    const nodeRect = { x: pNode.dx, y: pNode.dy, width: size.width, height: size.height };
    const btnSize = 20;
    for (const s of sides) {
      const pos = calculatePlusButtonPosition(
        s,
        nodeRect,
        { width: btnSize, height: btnSize },
        margin,
      );
      const inside = x >= pos.x && y >= pos.y && x <= pos.x + btnSize && y <= pos.y + btnSize;
      if (inside) {
        return true;
      }
    }
    return false;
  }

  onPointerDown(e: InkwellEvent): boolean | void {
    const hit = this.hitToolbar(e.x, e.y);
    if (hit) {
      if (hit.type === 'addAbove') {
        const key = this.getNodeKey();
        if (key) {
          this._onAddSibling?.(key, -1);
        }
      } else if (hit.type === 'addBelow') {
        const key = this.getNodeKey();
        if (key) {
          this._onAddSibling?.(key, 1);
        }
      } else if (hit.type === 'addChildLeft') {
        const key = this.getNodeKey();
        if (key) {
          this._onAddChildSide?.(key, Side.Left);
        }
      } else if (hit.type === 'addChildRight') {
        const key = this.getNodeKey();
        if (key) {
          this._onAddChildSide?.(key, Side.Right);
        }
      }
      e.stopPropagation();
    }
  }

  private getActiveKey(): string | null {
    const k = this.data.activeKey;
    if (k === null || typeof k === 'string') {
      return k ?? null;
    }
    let root: Widget | null = (this as unknown as Widget) ?? null;
    while (root && root.parent) {
      root = root.parent as Widget;
    }
    const vp = findWidget(root, 'Viewport') as Viewport | null;
    return vp?.activeKey ?? null;
  }

  private getNodeKey(): string | null {
    let root: Widget | null = (this as unknown as Widget) ?? null;
    while (root && root.parent) {
      root = root.parent as Widget;
    }
    const n = findWidget(root, ':active') as Widget | null;
    return n ? (n.key as string) : null;
  }

  private hitToolbar(
    x: number,
    y: number,
  ): { type: 'addAbove' | 'addBelow' | 'addChildLeft' | 'addChildRight' } | null {
    let root: Widget | null = (this as unknown as Widget) ?? null;
    while (root && root.parent) {
      root = root.parent as Widget;
    }
    const node = findWidget(root, ':active') as Widget | null;
    if (!node) {
      return null;
    }
    const vp = findWidget(root, 'Viewport') as Viewport | null;
    if (!vp) {
      return null;
    }
    const size = node.renderObject.size as Size;
    const margin = 6;
    const sides = this.resolveSides(node, size);
    const pNode = node.getAbsolutePosition();
    const nodeRect = { x: pNode.dx, y: pNode.dy, width: size.width, height: size.height };
    const btnSize = 20;
    const localX = (x - vp.tx) / vp.scale - node.getAbsolutePosition().dx;
    const localY = (y - vp.ty) / vp.scale - node.getAbsolutePosition().dy;
    const M = 2;
    for (const s of sides) {
      const pos = calculatePlusButtonPosition(
        s,
        nodeRect,
        { width: btnSize, height: btnSize },
        margin,
      );
      const lx = pos.x - nodeRect.x;
      const ly = pos.y - nodeRect.y;
      const inside =
        localX >= lx - M &&
        localY >= ly - M &&
        localX <= lx + btnSize + M &&
        localY <= ly + btnSize + M;
      if (inside) {
        if (s === 'top') {
          return { type: 'addAbove' };
        }
        if (s === 'bottom') {
          return { type: 'addBelow' };
        }
        if (s === 'left') {
          return { type: 'addChildLeft' };
        }
        if (s === 'right') {
          return { type: 'addChildRight' };
        }
      }
    }
    return null;
  }

  private resolveSides(node: Widget, size: Size): Array<'top' | 'bottom' | 'left' | 'right'> {
    const container = (this.parent as Widget | null) ?? (this as Widget);
    const edge = findWidget(container, `Connector[toKey="${String(node.key)}"]`);
    const isRoot = !edge;
    if (isRoot) {
      return ['left', 'right'];
    }
    const parentContainer = this.parent;
    let parentKey: string | null = null;
    if (parentContainer) {
      for (const c of parentContainer.children) {
        if (c instanceof Connector) {
          const to = c.toKey;
          if (to === node.key) {
            parentKey = c.fromKey;
            break;
          }
        }
      }
    }
    let parentCenterX: number | null = null;
    if (parentKey && parentContainer) {
      let parentNode: Widget | null = null;
      for (const c of parentContainer.children) {
        if (c.type === CustomComponentType.MindMapNode && c.key === parentKey) {
          parentNode = c;
          break;
        }
      }
      if (parentNode) {
        const posParent = parentNode.getAbsolutePosition();
        const szParent = parentNode.renderObject.size as Size;
        parentCenterX = posParent.dx + szParent.width / 2;
      }
    }
    const cxSelf = node.getAbsolutePosition().dx + size.width / 2;
    const leftSide = parentCenterX != null ? cxSelf < parentCenterX : false;
    return leftSide ? ['top', 'bottom', 'left'] : ['top', 'bottom', 'right'];
  }
}
