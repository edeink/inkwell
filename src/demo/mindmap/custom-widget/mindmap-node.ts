import React from 'react';

import { CustomComponentType, Side } from './type';
import { Viewport } from './viewport';

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
import Runtime from '@/runtime';

export interface MindMapNodeData extends WidgetData {
  title: string;
  width?: number;
  height?: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  prefSide?: Side;
  onSetActiveKey?: (key: string | null) => void;
  onAddSibling?: (refKey: string, dir: -1 | 1) => void;
  onAddChildSide?: (refKey: string, side: Side) => void;
  onMoveNode?: (key: string, dx: number, dy: number) => void;
}

/**
 * MindMapNode（思维导图节点）
 * 提供基础矩形节点绘制与尺寸估算，支持自定义边框、圆角与内边距。
 */
export class MindMapNode extends Widget<MindMapNodeData> {
  title: string = '';
  width?: number;
  height?: number;
  color: string = '#ffffff';
  borderColor: string = '#1677ff';
  borderWidth: number = 1.2;
  borderRadius: number = 10;
  padding: number = 12;
  prefSide: Side | undefined = undefined;
  private _onSetActiveKey?: (key: string | null) => void;
  private _onAddSibling?: (refKey: string, dir: -1 | 1) => void;
  private _onAddChildSide?: (refKey: string, side: Side) => void;
  private _onMoveNode?: (key: string, dx: number, dy: number) => void;
  private childOffsets: Offset[] = [];
  private dragState: { startX: number; startY: number; origDx: number; origDy: number } | null =
    null;
  private clickCandidate: { startX: number; startY: number } | null = null;
  private static hoverAnim: Map<string, number> = new Map();
  private static hoverAnimRaf: number | null = null;
  private static currentHoverKey: string | null = null;

  static {
    Widget.registerType(CustomComponentType.MindMapNode, MindMapNode);
  }

  constructor(data: MindMapNodeData) {
    super(data);
    this.init(data);
  }

  private init(data: MindMapNodeData): void {
    this.title = data.title || '';
    this.width = data.width;
    this.height = data.height;
    this.color = (data.color ?? this.color) as string;
    this.borderColor = (data.borderColor ?? this.borderColor) as string;
    this.borderWidth = (data.borderWidth ?? this.borderWidth) as number;
    this.borderRadius = (data.borderRadius ?? this.borderRadius) as number;
    this.padding = (data.padding ?? this.padding) as number;
    this.prefSide = data.prefSide;
    this._onSetActiveKey = data.onSetActiveKey;
    this._onAddSibling = data.onAddSibling;
    this._onAddChildSide = data.onAddChildSide;
    this._onMoveNode = data.onMoveNode;
  }

  createElement(data: MindMapNodeData): Widget<MindMapNodeData> {
    super.createElement(data);
    this.init(data);
    return this;
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    if (childData.type === CustomComponentType.MindMapNode) {
      throw new Error('MindMapNode does not support nested MindMapNode');
    }
    return Widget.createWidget(childData) ?? createExternalWidget(childData.type, childData);
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const { size } = this.renderObject as { size: Size };
    const vp = this.findViewport();
    const editing = vp?.editingKey === this.key;
    const baseFill = editing ? 'rgba(22,119,255,0.08)' : this.color;
    renderer.drawRect({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      fill: baseFill,
      stroke: this.borderColor,
      strokeWidth: this.borderWidth,
      borderRadius: this.borderRadius,
    });
    const pad = this.padding;
    const textX = pad;
    const textY = pad + 14;
    renderer.drawText({
      text: this.title,
      x: textX,
      y: textY,
      width: size.width - pad * 2,
      fontSize: 14,
      color: '#333333',
    });
    if (vp && Array.isArray(vp.selectedKeys) && vp.selectedKeys.includes(this.key)) {
      renderer.drawRect({
        x: -2,
        y: -2,
        width: size.width + 4,
        height: size.height + 4,
        stroke: '#fa8c16',
        strokeWidth: 2,
      });
    }

    const hoverP = MindMapNode.getHoverProgress(this.key);
    if (hoverP > 0) {
      const padW = Math.max(0, Math.round(2 * hoverP));
      renderer.drawRect({
        x: -padW,
        y: -padW,
        width: size.width + padW * 2,
        height: size.height + padW * 2,
        stroke: '#1677ff',
        strokeWidth: Math.max(1, Math.round(2 * hoverP)),
        borderRadius: this.borderRadius + padW,
      });
    }

    const isActive = vp?.activeKey === this.key;
    const btnSize = 20;
    const btnR = 8;
    const half = btnSize / 2;
    const blue = '#1677ff';
    const white = '#ffffff';
    const drawPlus = (cx: number, cy: number) => {
      renderer.drawRect({
        x: cx - half,
        y: cy - half,
        width: btnSize,
        height: btnSize,
        fill: white,
        stroke: blue,
        strokeWidth: 1,
        borderRadius: btnR,
      });
      renderer.drawLine({ x1: cx - 5, y1: cy, x2: cx + 5, y2: cy, stroke: blue, strokeWidth: 2 });
      renderer.drawLine({ x1: cx, y1: cy - 5, x2: cx, y2: cy + 5, stroke: blue, strokeWidth: 2 });
    };
    if (isActive) {
      drawPlus(size.width / 2, -24 + half);
      drawPlus(size.width / 2, size.height + 4 + half);
      const parentContainer = this.parent;
      let hasIncoming = false;
      if (parentContainer) {
        for (const c of parentContainer.children) {
          if (c.type === CustomComponentType.Connector) {
            const to = (c as any).toKey as string;
            if (to === this.key) {
              hasIncoming = true;
              break;
            }
          }
        }
      }
      const isRoot = !hasIncoming;
      let showLeft = false;
      let showRight = false;
      if (isRoot) {
        showLeft = true;
        showRight = true;
      } else if (this.prefSide === Side.Left) {
        showLeft = true;
      } else {
        showRight = true;
      }
      if (showLeft) {
        drawPlus(-6 - half, size.height / 2);
      }
      if (showRight) {
        drawPlus(size.width + 6 + half, size.height / 2);
      }
    }

    const vpCollapsed = Array.isArray((vp as any)?.collapsedKeys)
      ? ((vp as any).collapsedKeys as string[])
      : [];
    const isCollapsed = vpCollapsed.includes(this.key);

    const children = this.children.filter((c) => c.type === CustomComponentType.MindMapNode);
    if (!isCollapsed && children.length > 0) {
    }
  }

  /**
   * 事件迁移：节点级指针与双击事件由 InteractionModule 迁移至此
   * - 绑定在组件实例上（类方法），通过统一事件系统按命中分发
   * - 保持拖拽与激活/编辑行为一致，避免 window 级别监听
   */
  onPointerDown(e: any): boolean | void {
    const vp = this.findViewport();
    if (!vp) {
      return;
    }
    const worldX = (e.x - vp.tx) / vp.scale;
    const worldY = (e.y - vp.ty) / vp.scale;
    const hit = this.hitToolbar(worldX, worldY);
    if (hit) {
      this.handleToolbarAction(hit, e?.nativeEvent);
      return false;
    }
    const pos = this.getAbsolutePosition();
    this.dragState = { startX: worldX, startY: worldY, origDx: pos.dx, origDy: pos.dy };
    this.clickCandidate = { startX: e.x, startY: e.y };
    return false;
  }

  onPointerMove(e: any): boolean | void {
    const vp = this.findViewport();
    if (!vp) {
      return;
    }
    const worldX = (e.x - vp.tx) / vp.scale;
    const worldY = (e.y - vp.ty) / vp.scale;
    // 更新拖拽
    if (!this.dragState) {
      // 非拖拽时更新 hover 命中（流畅切换）
      const pos = this.getAbsolutePosition();
      const sz = this.renderObject.size;
      const inside =
        worldX >= pos.dx &&
        worldY >= pos.dy &&
        worldX <= pos.dx + sz.width &&
        worldY <= pos.dy + sz.height;
      const runtime = this.findRuntimeFromNative(e?.nativeEvent);
      if (inside) {
        MindMapNode.setHoveredKey(this.key, runtime ?? null);
      } else if (MindMapNode.currentHoverKey === this.key) {
        MindMapNode.setHoveredKey(null, runtime ?? null);
      }
      return false;
    }
    const dx = worldX - this.dragState.startX;
    const dy = worldY - this.dragState.startY;
    this.renderObject.offset = { dx: this.dragState.origDx + dx, dy: this.dragState.origDy + dy };
    this.requestRerenderFromNative(e?.nativeEvent);
    if (this.clickCandidate) {
      const d = Math.hypot(e.x - this.clickCandidate.startX, e.y - this.clickCandidate.startY);
      if (d > 3) {
        this.clickCandidate = null;
      }
    }
    return false;
  }

  onPointerUp(_e: any): boolean | void {
    const vp = this.findViewport();
    const ds = this.dragState;
    if (!vp) {
      this.dragState = null;
      this.clickCandidate = null;
      return;
    }
    const moved =
      !!ds &&
      (Math.abs((this.renderObject.offset?.dx ?? 0) - ds.origDx) > 0.5 ||
        Math.abs((this.renderObject.offset?.dy ?? 0) - ds.origDy) > 0.5);
    this.dragState = null;
    if (moved) {
      const off = this.renderObject.offset || { dx: 0, dy: 0 };
      this._onMoveNode?.(this.key, off.dx, off.dy);
      this.requestRerenderFromNative(_e?.nativeEvent);
      this.clickCandidate = null;
    } else if (this.clickCandidate) {
      if (this._onSetActiveKey) {
        this._onSetActiveKey(this.key);
      } else {
        vp.setActiveKey(this.key);
      }
      this.clickCandidate = null;
      this.requestRerenderFromNative(_e?.nativeEvent);
    }
    return false;
  }

  onDblClick(e: any): boolean | void {
    const vp = this.findViewport();
    if (!vp) {
      return;
    }
    vp.setEditingKey(this.key);
    this.openInlineEditor(e?.nativeEvent);
    return false;
  }

  private requestRerenderFromNative(native?: Event): void {
    const runtime = this.findRuntimeFromNative(native);
    runtime?.rerender();
  }

  static setHoveredKey(key: string | null, runtime: Runtime | null): void {
    const prev = MindMapNode.currentHoverKey;
    if (key === prev) {
      return;
    }
    MindMapNode.currentHoverKey = key;
    const anim = MindMapNode.hoverAnim;
    const now = performance.now();
    const duration = 300;
    const start = now;
    if (prev) {
      anim.set(prev, anim.get(prev) ?? 1);
    }
    if (key) {
      anim.set(key, anim.get(key) ?? 0);
    }
    const step = () => {
      const t = performance.now() - start;
      const p = Math.max(0, Math.min(1, t / duration));
      if (prev) {
        const pv = anim.get(prev) ?? 1;
        anim.set(prev, Math.max(0, pv - p));
      }
      if (key) {
        const kv = anim.get(key) ?? 0;
        anim.set(key, Math.min(1, kv + p));
      }
      runtime?.rerender();
      if (t < duration) {
        MindMapNode.hoverAnimRaf = requestAnimationFrame(step);
      } else {
        MindMapNode.hoverAnimRaf = null;
        if (prev) {
          anim.delete(prev);
        }
        if (key) {
          anim.set(key, 1);
        }
      }
    };
    if (MindMapNode.hoverAnimRaf) {
      try {
        cancelAnimationFrame(MindMapNode.hoverAnimRaf);
      } catch {}
      MindMapNode.hoverAnimRaf = null;
    }
    MindMapNode.hoverAnimRaf = requestAnimationFrame(step);
  }

  static getHoverProgress(key: string): number {
    return MindMapNode.hoverAnim.get(key) ?? (MindMapNode.currentHoverKey === key ? 1 : 0);
  }

  private findRuntimeFromNative(native?: Event): Runtime | null {
    try {
      const me = native as MouseEvent | PointerEvent | TouchEvent | undefined;
      const x = (me as MouseEvent | PointerEvent | undefined)?.clientX;
      const y = (me as MouseEvent | PointerEvent | undefined)?.clientY;
      if (typeof x !== 'number' || typeof y !== 'number') {
        return null;
      }
      const els = document.elementsFromPoint(x, y);
      for (const el of els) {
        if (el instanceof HTMLCanvasElement) {
          const id = el.dataset.inkwellId || '';
          if (!id) {
            continue;
          }
          const rt = Runtime.getByCanvasId(id);
          if (rt) {
            return rt;
          }
        }
      }
    } catch {}
    return null;
  }

  private openInlineEditor(native?: Event): void {
    const vp = this.findViewport();
    if (!vp) {
      return;
    }
    const pos = this.getAbsolutePosition();
    const sz = this.renderObject.size;
    const runtime = this.findRuntimeFromNative(native);
    const container = runtime?.getContainer() ?? document.body;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.title || '';
    input.style.position = 'absolute';
    input.style.left = `${Math.round(vp.tx + pos.dx * vp.scale)}px`;
    input.style.top = `${Math.round(vp.ty + pos.dy * vp.scale)}px`;
    input.style.width = `${Math.round(sz.width * vp.scale)}px`;
    input.style.height = '28px';
    input.style.border = '1px solid #1677ff';
    input.style.borderRadius = '8px';
    input.style.padding = '4px 8px';
    input.style.zIndex = '10000';
    input.style.background = '#ffffff';
    input.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
    container.appendChild(input);
    input.focus();
    input.select();
    const cleanup = () => {
      input.remove();
      const vp2 = this.findViewport();
      vp2?.setEditingKey(null);
      runtime?.rerender();
    };
    const confirm = () => {
      const v = input.value;
      this.title = v;
      cleanup();
    };
    const cancel = () => {
      cleanup();
    };
    input.addEventListener('keydown', (ke) => {
      if (ke.key === 'Enter') {
        confirm();
      } else if (ke.key === 'Escape') {
        cancel();
      }
    });
    input.addEventListener('blur', () => {
      confirm();
    });
  }

  private hitToolbar(
    x: number,
    y: number,
  ): { type: 'addAbove' | 'addBelow' | 'addChildLeft' | 'addChildRight'; key: string } | null {
    const vp = this.findViewport();
    if (!vp) {
      return null;
    }
    const isActive = vp.activeKey === this.key;
    if (!isActive) {
      return null;
    }
    const p = this.getAbsolutePosition();
    const s = this.renderObject.size;
    const inside = (rx: number, ry: number, rw: number, rh: number) => {
      const M = 2;
      return x >= rx - M && y >= ry - M && x <= rx + rw + M && y <= ry + rh + M;
    };
    const top = { x: p.dx + s.width / 2 - 10, y: p.dy - 24, w: 20, h: 20 };
    const bottom = { x: p.dx + s.width / 2 - 10, y: p.dy + s.height + 4, w: 20, h: 20 };
    const right = { x: p.dx + s.width + 6, y: p.dy + s.height / 2 - 10, w: 20, h: 20 };
    const left = { x: p.dx - 26, y: p.dy + s.height / 2 - 10, w: 20, h: 20 };
    let showLeft = false;
    let showRight = false;
    const parentContainer = this.parent;
    let hasIncoming = false;
    if (parentContainer) {
      for (const c of parentContainer.children) {
        if ((c as any).type === 'Connector') {
          const to = (c as any).toKey as string;
          if (to === this.key) {
            hasIncoming = true;
            break;
          }
        }
      }
    }
    const isRoot = !hasIncoming;
    if (isRoot) {
      showLeft = true;
      showRight = true;
    } else if (this.prefSide === Side.Left) {
      showLeft = true;
    } else {
      showRight = true;
    }
    if (inside(top.x, top.y, top.w, top.h)) {
      return { type: 'addAbove', key: this.key };
    }
    if (inside(bottom.x, bottom.y, bottom.w, bottom.h)) {
      return { type: 'addBelow', key: this.key };
    }
    if (showRight && inside(right.x, right.y, right.w, right.h)) {
      return { type: 'addChildRight', key: this.key };
    }
    if (showLeft && inside(left.x, left.y, left.w, left.h)) {
      return { type: 'addChildLeft', key: this.key };
    }
    return null;
  }

  private handleToolbarAction(
    hit: { type: 'addAbove' | 'addBelow' | 'addChildLeft' | 'addChildRight'; key: string },
    native?: Event,
  ): void {
    if (hit.type === 'addAbove') {
      this._onAddSibling?.(hit.key, -1);
    } else if (hit.type === 'addBelow') {
      this._onAddSibling?.(hit.key, 1);
    } else if (hit.type === 'addChildLeft') {
      this._onAddChildSide?.(hit.key, Side.Left);
    } else if (hit.type === 'addChildRight') {
      this._onAddChildSide?.(hit.key, Side.Right);
    }
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    void childrenSizes;
    const textLen = this.title ? this.title.length : 0;
    const estTextW = Math.max(40, textLen * 9);
    const estTextH = 20;
    let width = this.width ?? estTextW + this.padding * 2;
    let height = this.height ?? estTextH + this.padding * 2;
    width = Math.max(constraints.minWidth, Math.min(width, constraints.maxWidth));
    height = Math.max(constraints.minHeight, Math.min(height, constraints.maxHeight));
    return { width, height };
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
    void childIndex;
    void childSize;
    return { dx: 0, dy: 0 };
  }

  private findViewport(): Viewport | null {
    let p = this.parent;
    while (p) {
      if (p instanceof Viewport) {
        return p as Viewport;
      }
      p = p.parent;
    }
    return null;
  }
}
export type MindMapNodeProps = Omit<MindMapNodeData, 'type' | 'children'> &
  WidgetProps & { children?: never };
export const MindMapNodeElement: React.FC<MindMapNodeProps> = () => null;
