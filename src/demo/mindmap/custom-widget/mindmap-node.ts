import React from 'react';

import { CustomComponentType } from './type';
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

export interface MindMapNodeData extends WidgetData {
  title: string;
  width?: number;
  height?: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
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
  private childOffsets: Offset[] = [];

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
  }

  createElement(data: MindMapNodeData): Widget<MindMapNodeData> {
    super.createElement(data);
    this.init(data);
    return this;
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
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

    const hoverP = vp?.hoverAnim?.[this.key] ?? (vp?.hoveredKey === this.key ? 1 : 0);
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
      drawPlus(size.width + 6 + half, size.height / 2);
    }

    const vpCollapsed = Array.isArray((vp as any)?.collapsedKeys)
      ? ((vp as any).collapsedKeys as string[])
      : [];
    const isCollapsed = vpCollapsed.includes(this.key);

    const children = this.children.filter((c) => c.type === CustomComponentType.MindMapNode);
    if (!isCollapsed && children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childSize = child.renderObject.size;
        const off = this.childOffsets[i] || { dx: 0, dy: 0 };
        const sx = size.width;
        const sy = size.height / 2;
        const tx = off.dx;
        const ty = off.dy + childSize.height / 2;
        const mx = (sx + tx) / 2;
        renderer.drawPath({
          points: [
            { x: sx, y: sy },
            { x: mx, y: sy },
            { x: mx, y: ty },
            { x: tx, y: ty },
          ],
          stroke: '#8c8c8c',
          strokeWidth: 1.5,
        });
      }
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

export type MindMapNodeProps = Omit<MindMapNodeData, 'type' | 'children'> & WidgetProps;
export const MindMapNodeElement: React.FC<MindMapNodeProps> = () => null;
