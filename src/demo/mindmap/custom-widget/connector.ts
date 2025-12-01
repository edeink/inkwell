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
import { elbowRoute } from '@/demo/mindmap/lib/route';

export type ConnectorStyle = 'straight' | 'elbow';

export interface ConnectorData extends WidgetData {
  fromKey: string;
  toKey: string;
  color?: string;
  strokeWidth?: number;
  style?: ConnectorStyle;
}

/**
 * Connector（节点连接线）
 * 支持直线 straight 与折线 elbow 两种风格。根据节点的绝对坐标绘制连接线，
 * 以 Viewport 坐标系为准，不额外叠加偏移。
 */
export class Connector extends Widget<ConnectorData> {
  fromKey: string = '';
  toKey: string = '';
  color: string = '#8c8c8c';
  strokeWidth: number = 1.5;
  style: ConnectorStyle = 'elbow';

  static {
    Widget.registerType(CustomComponentType.Connector, Connector);
  }

  constructor(data: ConnectorData) {
    super(data);
    this.init(data);
  }

  private init(data: ConnectorData): void {
    this.fromKey = data.fromKey;
    this.toKey = data.toKey;
    this.color = (data.color ?? this.color) as string;
    this.strokeWidth = (data.strokeWidth ?? this.strokeWidth) as number;
    this.style = (data.style ?? this.style) as ConnectorStyle;
  }

  createElement(data: ConnectorData): Widget<ConnectorData> {
    super.createElement(data);
    this.init(data);
    return this;
  }

  protected createChildWidget(_childData: WidgetData): Widget | null {
    return null;
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const root = this.getRoot();
    const a = root ? this.getRectByKey(root, this.fromKey) : null;
    const b = root ? this.getRectByKey(root, this.toKey) : null;
    if (!a || !b) {
      return;
    }
    const sx = a.x + a.width;
    const sy = a.y + a.height / 2;
    const tx = b.x;
    const ty = b.y + b.height / 2;
    if (this.style === 'straight') {
      renderer.drawLine({
        x1: sx,
        y1: sy,
        x2: tx,
        y2: ty,
        stroke: this.color,
        strokeWidth: this.strokeWidth,
      });
    } else {
      const pts = elbowRoute(a, b);
      renderer.drawPath({ points: pts, stroke: this.color, strokeWidth: this.strokeWidth });
    }
  }

  private getRoot(): Widget | null {
    let p: Widget | null = this.parent;
    while (p && p.parent) {
      p = p.parent;
    }
    return p ?? this;
  }

  private getRectByKey(
    root: Widget,
    key: string,
  ): { x: number; y: number; width: number; height: number } | null {
    const walk = (w: Widget): Widget | null => {
      if (w.key === key) {
        return w;
      }
      for (const c of w.children) {
        const r = walk(c);
        if (r) {
          return r;
        }
      }
      return null;
    };
    const hit = walk(root);
    if (!hit) {
      return null;
    }
    const p = hit.getAbsolutePosition();
    const s = hit.renderObject.size;
    return { x: p.dx, y: p.dy, width: s.width, height: s.height };
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    void childrenSizes;
    const w = Math.max(constraints.minWidth, Math.min(constraints.maxWidth, constraints.maxWidth));
    const h = Math.max(
      constraints.minHeight,
      Math.min(constraints.maxHeight, constraints.maxHeight),
    );
    return { width: w, height: h };
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

  protected positionChild(_childIndex: number, _childSize: Size): Offset {
    return { dx: 0, dy: 0 };
  }
}

export type ConnectorProps = Omit<ConnectorData, 'type' | 'children'> & JSXComponentProps;
export const ConnectorElement: React.FC<ConnectorProps> = () => null;
