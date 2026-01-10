/**
 * MindMapNodeToolbar（节点工具栏包装器）
 * 组件功能说明：
 * - 整合原 ToolbarLayer 的绘制与命中逻辑至本组件
 * - 根据激活/悬停状态显示，加号按钮随视口缩放/平移实时跟随
 * - 位置计算考虑边界自适应，避免绘制在画布可视区域之外
 * - 保持与节点拖拽/点击的交互一致性
 */

import { CustomComponentType, Side } from '../../type';
import { Connector } from '../connector';
import { MindMapViewport } from '../mindmap-viewport';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Widget } from '@/core/base';
import { invert, transformPoint } from '@/core/helper/transform';
import { findWidget } from '@/core/helper/widget-selector';
import { Themes, getCurrentThemeMode, type ThemePalette } from '@/styles/theme';
export interface MindMapNodeToolbarProps extends WidgetProps {
  onActive?: (key: string | null) => void;
  onAddSibling?: (refKey: string, dir: -1 | 1, side?: Side) => void;
  onAddChildSide?: (refKey: string, side: Side) => void;
  activeKey?: string | null;
  theme?: ThemePalette;
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
  private _onAddSibling?: (refKey: string, dir: -1 | 1, side?: Side) => void;
  private _onAddChildSide?: (refKey: string, side: Side) => void;

  constructor(data: MindMapNodeToolbarProps) {
    super({ ...data, zIndex: typeof data.zIndex === 'number' ? data.zIndex : 1 });
    this.initToolbar(data);
  }

  private initToolbar(data: MindMapNodeToolbarProps): void {
    this._onAddSibling = data.onAddSibling;
    this._onAddChildSide = data.onAddChildSide;
  }

  createElement(data: MindMapNodeToolbarProps): Widget<MindMapNodeToolbarProps> {
    super.createElement({ ...data, zIndex: typeof data.zIndex === 'number' ? data.zIndex : 1 });
    this.initToolbar(data);
    return this;
  }

  protected createChildWidget(_childData: WidgetProps): Widget | null {
    return null;
  }

  protected performLayout(): Size {
    const parent = this.parent;
    return parent ? (parent.renderObject.size as Size) : ({ width: 0, height: 0 } as Size);
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

  private getActiveNode(): Widget | null {
    const activeKey = this.getActiveKey();
    if (!activeKey) {
      return null;
    }
    return findWidget(this.root, `#${activeKey}`) as Widget | null;
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const node = this.getActiveNode();
    const vp = findWidget<MindMapViewport>(
      this.root,
      CustomComponentType.MindMapViewport,
    ) as MindMapViewport | null;
    if (!node || !vp) {
      return;
    }
    const activeKey = this.getActiveKey();
    // 既然通过 getActiveNode 查找到的，必定是 activeKey 对应的节点，这里再次确认一下
    if (activeKey !== node.key) {
      return;
    }
    const size = node.renderObject.size as Size;
    const margin = 6;
    const { allowed: sides } = this.resolveSides(node, size);

    // 获取节点绝对坐标并转换为本地坐标
    const nodeAbs = node.getAbsolutePosition();
    const nodeLocal = this.globalToLocal({ x: nodeAbs.dx, y: nodeAbs.dy });

    const nodeRect = { x: nodeLocal.x, y: nodeLocal.y, width: size.width, height: size.height };
    const btnSize = 20;
    const half = btnSize / 2;
    const theme = (this.data as MindMapNodeToolbarProps).theme || Themes[getCurrentThemeMode()];
    const btnBlue = theme.primary;
    const white = theme.text.inverse;

    const drawPlusLocal = (lx: number, ly: number) => {
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
    const node = this.getActiveNode();
    const vp = findWidget<MindMapViewport>(
      this.root,
      CustomComponentType.MindMapViewport,
    ) as MindMapViewport | null;
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
    const { allowed: sides } = this.resolveSides(node, size);

    // 坐标变换：将点击坐标和节点坐标都转换为本地坐标系
    const localClick = this.globalToLocal({ x, y });
    const nodeAbs = node.getAbsolutePosition();
    const nodeLocal = this.globalToLocal({ x: nodeAbs.dx, y: nodeAbs.dy });

    const nodeRect = { x: nodeLocal.x, y: nodeLocal.y, width: size.width, height: size.height };
    const btnSize = 20;

    const M = 2;

    for (const s of sides) {
      const pos = calculatePlusButtonPosition(
        s,
        nodeRect,
        { width: btnSize, height: btnSize },
        margin,
      );
      // pos 已经是本地坐标
      const inside =
        localClick.x >= pos.x - M &&
        localClick.y >= pos.y - M &&
        localClick.x <= pos.x + btnSize + M &&
        localClick.y <= pos.y + btnSize + M;
      if (inside) {
        return true;
      }
    }
    return false;
  }

  private globalToLocal(p: { x: number; y: number }): { x: number; y: number } {
    if (this._worldMatrix) {
      const inv = invert(this._worldMatrix);
      return transformPoint(inv, p);
    }
    const abs = this.getAbsolutePosition();
    return { x: p.x - abs.dx, y: p.y - abs.dy };
  }

  private lastActionTime: number = 0;

  onPointerDown(e: InkwellEvent): boolean | void {
    const hit = this.hitToolbar(e.x, e.y);
    if (hit) {
      e.stopPropagation();
      e.nativeEvent?.preventDefault();
      const now = Date.now();
      if (now - this.lastActionTime < 100) {
        return;
      }
      this.lastActionTime = now;

      // 视口智能调整：预测新节点位置并确保可见
      this.optimizeViewportForNewNode(hit);

      if (hit.type === 'addAbove') {
        const key = this.getNodeKey();
        if (key) {
          this._onAddSibling?.(key, -1, hit.side);
        }
      } else if (hit.type === 'addBelow') {
        const key = this.getNodeKey();
        if (key) {
          this._onAddSibling?.(key, 1, hit.side);
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
    }
  }

  /**
   * 优化视口偏移：仅在新增节点超出可视区域时调整
   * 确保新节点及激活后的工具栏都能完整显示
   */
  private optimizeViewportForNewNode(hit: {
    type: 'addAbove' | 'addBelow' | 'addChildLeft' | 'addChildRight';
    side?: Side;
  }): void {
    const node = this.getActiveNode();
    const vp = findWidget<MindMapViewport>(
      this.root,
      CustomComponentType.MindMapViewport,
    ) as MindMapViewport | null;
    if (!node || !vp || !vp.width || !vp.height) {
      return;
    }

    const size = node.renderObject.size as Size;
    const pNode = node.getAbsolutePosition();
    // 转换到相对于 Viewport 内容层的坐标（消除 tx/ty 和 scale 的影响，但这里 getAbsolutePosition 已经是屏幕坐标）
    // 我们需要的是相对于 Viewport 内容原点的坐标，即 World Coordinates
    // vp.tx/ty 是视口平移，scale 是缩放
    // WorldX = (ScreenX - tx) / scale
    // WorldY = (ScreenY - ty) / scale

    // 当前节点的世界坐标
    const worldX = (pNode.dx - vp.tx) / vp.scale;
    const worldY = (pNode.dy - vp.ty) / vp.scale;
    const worldW = size.width;
    const worldH = size.height;

    // 预估新节点的位置和尺寸（假设新节点尺寸与当前节点相近或稍小，因是空文本）
    // 垂直间距估算：节点高度 + 间距(约30px)
    // 水平间距估算：节点宽度 + 间距(约100px)
    const spacingY = 50;
    const spacingX = 150;
    const newNodeH = 40; // 空节点高度预估
    const newNodeW = 100; // 空节点宽度预估

    let targetX = worldX;
    let targetY = worldY;
    const targetW = newNodeW;
    const targetH = newNodeH;

    switch (hit.type) {
      case 'addAbove':
        targetY = worldY - spacingY;
        targetX = worldX; // 简化假设对齐
        break;
      case 'addBelow':
        targetY = worldY + worldH + spacingY / 2; // 向下添加
        break;
      case 'addChildLeft':
        targetX = worldX - spacingX;
        targetY = worldY; // 简化假设居中
        break;
      case 'addChildRight':
        targetX = worldX + worldW + spacingX / 3;
        targetY = worldY;
        break;
    }

    // 预估 Toolbar 的位置（在节点上方或下方，约 30px 空间）
    // 我们需要确保 targetRect + padding 能显示
    const padding = 60; // 包含 Toolbar 和边距
    const safeRect = {
      x: targetX - padding,
      y: targetY - padding,
      w: targetW + padding * 2,
      h: targetH + padding * 2,
    };

    // 当前视口可视区域（世界坐标）
    const vpSize = vp.renderObject.size as Size;
    const viewX = -vp.tx / vp.scale;
    const viewY = -vp.ty / vp.scale;
    const viewW = vpSize.width / vp.scale;
    const viewH = vpSize.height / vp.scale;

    // 检查是否在可视区域内
    const isVisible =
      safeRect.x >= viewX &&
      safeRect.y >= viewY &&
      safeRect.x + safeRect.w <= viewX + viewW &&
      safeRect.y + safeRect.h <= viewY + viewH;

    if (isVisible) {
      return; // 无需调整
    }

    // 计算需要的偏移量
    let newViewX = viewX;
    let newViewY = viewY;

    // 水平调整
    if (safeRect.x < viewX) {
      newViewX = safeRect.x;
    } else if (safeRect.x + safeRect.w > viewX + viewW) {
      newViewX = safeRect.x + safeRect.w - viewW;
    }

    // 垂直调整
    if (safeRect.y < viewY) {
      newViewY = safeRect.y;
    } else if (safeRect.y + safeRect.h > viewY + viewH) {
      newViewY = safeRect.y + safeRect.h - viewH;
    }

    // 应用新的视口偏移
    // tx = -viewX * scale
    const newTx = -newViewX * vp.scale;
    const newTy = -newViewY * vp.scale;

    vp.setPosition(newTx, newTy);
  }

  private getActiveKey(): string | null {
    const k = this.data.activeKey;
    if (k === null || typeof k === 'string') {
      return k ?? null;
    }
    const vp = findWidget<MindMapViewport>(
      this.root,
      CustomComponentType.MindMapViewport,
    ) as MindMapViewport | null;
    return vp?.activeKey ?? null;
  }

  private getNodeKey(): string | null {
    const n = this.getActiveNode();
    return n ? (n.key as string) : null;
  }

  private hitToolbar(
    x: number,
    y: number,
  ): { type: 'addAbove' | 'addBelow' | 'addChildLeft' | 'addChildRight'; side?: Side } | null {
    const node = this.getActiveNode();
    if (!node) {
      return null;
    }
    const vp = findWidget<MindMapViewport>(
      this.root,
      CustomComponentType.MindMapViewport,
    ) as MindMapViewport | null;
    if (!vp) {
      return null;
    }
    const size = node.renderObject.size as Size;
    const margin = 6;
    const { allowed: sides, isLeft } = this.resolveSides(node, size);

    // 坐标变换：将点击坐标和节点坐标都转换为本地坐标系
    const localClick = this.globalToLocal({ x, y });
    const nodeAbs = node.getAbsolutePosition();
    const nodeLocal = this.globalToLocal({ x: nodeAbs.dx, y: nodeAbs.dy });

    const nodeRect = { x: nodeLocal.x, y: nodeLocal.y, width: size.width, height: size.height };
    const btnSize = 20;

    const M = 2;
    for (const s of sides) {
      const pos = calculatePlusButtonPosition(
        s,
        nodeRect,
        { width: btnSize, height: btnSize },
        margin,
      );
      // pos 已经是本地坐标
      const inside =
        localClick.x >= pos.x - M &&
        localClick.y >= pos.y - M &&
        localClick.x <= pos.x + btnSize + M &&
        localClick.y <= pos.y + btnSize + M;
      if (inside) {
        if (s === 'top') {
          return { type: 'addAbove', side: isLeft ? Side.Left : Side.Right };
        }
        if (s === 'bottom') {
          return { type: 'addBelow', side: isLeft ? Side.Left : Side.Right };
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

  private resolveSides(
    node: Widget,
    size: Size,
  ): { allowed: Array<'top' | 'bottom' | 'left' | 'right'>; isLeft: boolean } {
    const container = (this.parent as Widget | null) ?? (this as Widget);
    const edge = findWidget(
      container,
      `${CustomComponentType.Connector}[toKey="${String(node.key)}"]`,
    );
    const isRoot = !edge;
    if (isRoot) {
      return { allowed: ['left', 'right'], isLeft: false };
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
    return {
      allowed: leftSide ? ['top', 'bottom', 'left'] : ['top', 'bottom', 'right'],
      isLeft: leftSide,
    };
  }
}
