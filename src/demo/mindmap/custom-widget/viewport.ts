import React from 'react';

import { CustomComponentType } from './type';

import type {
  BoxConstraints,
  BuildContext,
  JSXComponentProps,
  Offset,
  Size,
  WidgetData,
} from '@/core/base';

import { Widget } from '@/core/base';

export interface ViewportData extends WidgetData {
  scale?: number;
  tx?: number;
  ty?: number;
  selectedKeys?: string[];
  selectionRect?: { x: number; y: number; width: number; height: number } | null;
  width?: number;
  height?: number;
}

export class Viewport extends Widget<ViewportData> {
  scale: number = 1;
  tx: number = 0;
  ty: number = 0;
  selectedKeys: string[] = [];
  selectionRect: { x: number; y: number; width: number; height: number } | null = null;
  width?: number;
  height?: number;

  static {
    Widget.registerType(CustomComponentType.Viewport, Viewport);
  }

  constructor(data: ViewportData) {
    super(data);
    this.init(data);
  }

  private init(data: ViewportData): void {
    this.scale = (data.scale ?? this.scale) as number;
    this.tx = (data.tx ?? this.tx) as number;
    this.ty = (data.ty ?? this.ty) as number;
    this.selectedKeys = (data.selectedKeys ?? this.selectedKeys) as string[];
    this.selectionRect = (data.selectionRect ?? this.selectionRect) as {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
    this.width = data.width;
    this.height = data.height;
  }

  createElement(data: ViewportData): Widget<ViewportData> {
    super.createElement(data);
    this.init(data);
    return this;
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    return Widget.createWidget(childData);
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    renderer.translate(this.tx, this.ty);
    renderer.scale(this.scale, this.scale);
    const rect = this.selectionRect;
    if (rect) {
      const r = this.normalizeRect(rect);
      renderer.drawRect({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        fill: 'rgba(24,144,255,0.12)',
        stroke: '#1890ff',
        strokeWidth: 1,
      });
    }
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const childMaxW = childrenSizes.length ? Math.max(...childrenSizes.map((s) => s.width)) : 0;
    const childMaxH = childrenSizes.length ? Math.max(...childrenSizes.map((s) => s.height)) : 0;
    const w0 = this.width ?? childMaxW;
    const h0 = this.height ?? childMaxH;
    const w = Math.max(constraints.minWidth, Math.min(w0, constraints.maxWidth));
    const h = Math.max(constraints.minHeight, Math.min(h0, constraints.maxHeight));
    return { width: isFinite(w) ? w : 800, height: isFinite(h) ? h : 600 };
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

  private normalizeRect(r: { x: number; y: number; width: number; height: number }) {
    const x = r.width >= 0 ? r.x : r.x + r.width;
    const y = r.height >= 0 ? r.y : r.y + r.height;
    const w = Math.abs(r.width);
    const h = Math.abs(r.height);
    return { x, y, width: w, height: h };
  }
}

export type ViewportProps = Omit<ViewportData, 'type' | 'children'> & JSXComponentProps;
export const ViewportElement: React.FC<ViewportProps> = () => null;
