import { getTheme } from '../config/theme';

import { CustomComponentType } from './type';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from '@/core/base';

import { Widget } from '@/core/base';
import { findWidget } from '@/core/helper/widget-selector';
import {
  connectorPathFromRects,
  ConnectorStyle,
  DEFAULT_CONNECTOR_OPTIONS,
} from '@/demo/mindmap/helpers/connection-drawer';

export interface ConnectorProps extends WidgetProps {
  fromKey: string;
  toKey: string;
  color?: string;
  strokeWidth?: number;
  style?: ConnectorStyle;
  dashArray?: string;
}

function distanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) {
    // in case of 0 length line
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Connector（节点连接线）
 * 支持直线 straight 与折线 elbow 两种风格。根据节点的绝对坐标绘制连接线，
 * 以 Viewport 坐标系为准，不额外叠加偏移。
 */
export class Connector extends Widget<ConnectorProps> {
  fromKey: string = '';
  toKey: string = '';
  color?: string;
  strokeWidth: number = 1.5;
  style: ConnectorStyle = ConnectorStyle.Bezier;
  dashArray?: string;

  constructor(data: ConnectorProps) {
    super(data);
    this.init(data);
  }

  private init(data: ConnectorProps): void {
    this.fromKey = data.fromKey;
    this.toKey = data.toKey;
    this.color = data.color;
    this.strokeWidth = (data.strokeWidth ?? this.strokeWidth) as number;
    this.style = (data.style ?? this.style) as ConnectorStyle;
    this.dashArray = data.dashArray;
  }

  createElement(data: ConnectorProps): Widget<ConnectorProps> {
    super.createElement(data);
    this.init(data);
    return this;
  }

  protected createChildWidget(_childData: WidgetProps): Widget | null {
    return null;
  }

  private getPathPoints(): { x: number; y: number }[] | null {
    const layout = findWidget(this.root, CustomComponentType.MindMapLayout) as Widget | null;
    const nodeA = findWidget(
      layout,
      `${CustomComponentType.MindMapNode}#${this.fromKey}`,
    ) as Widget | null;
    const nodeB = findWidget(
      layout,
      `${CustomComponentType.MindMapNode}#${this.toKey}`,
    ) as Widget | null;

    const rectA = nodeA ? this.getRectFromNode(nodeA) : null;
    const rectB = nodeB ? this.getRectFromNode(nodeB) : null;
    if (!rectA || !rectB) {
      return null;
    }
    const layoutPos = layout ? layout.getAbsolutePosition() : { dx: 0, dy: 0 };
    const a = {
      ...rectA,
      x: rectA.x - layoutPos.dx,
      y: rectA.y - layoutPos.dy,
    };
    const b = {
      ...rectB,
      x: rectB.x - layoutPos.dx,
      y: rectB.y - layoutPos.dy,
    };

    const aCenterX = a.x + a.width / 2;
    const bCenterX = b.x + b.width / 2;
    const left = aCenterX <= bCenterX ? a : b;
    const right = left === a ? b : a;
    return connectorPathFromRects({
      left,
      right,
      style: this.style,
      samples: DEFAULT_CONNECTOR_OPTIONS.samples,
      margin: DEFAULT_CONNECTOR_OPTIONS.margin,
      elbowRadius: DEFAULT_CONNECTOR_OPTIONS.elbowRadius,
      arcSegments: DEFAULT_CONNECTOR_OPTIONS.arcSegments,
    });
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const pts = this.getPathPoints();
    if (!pts) {
      return;
    }

    const dashStr = this.dashArray || '';
    const dash = dashStr
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    const theme = getTheme();
    const stroke = this.color ?? theme.connectorColor;
    const sw = this.strokeWidth;

    renderer.drawPath({ points: pts, stroke, strokeWidth: sw, dash });
  }

  public getBounds(): { x: number; y: number; width: number; height: number } | null {
    const pts = this.getPathPoints();
    if (!pts) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const w = Math.max(maxX - minX, this.strokeWidth);
    const h = Math.max(maxY - minY, this.strokeWidth);
    return { x: minX, y: minY, width: w, height: h };
  }

  public hitTest(x: number, y: number): boolean {
    const pts = this.getPathPoints();
    if (!pts || pts.length < 2) {
      return false;
    }

    // hitTest 传入的是绝对坐标
    // pts 是相对于 MindMapLayout 的坐标（因为 paintSelf 逻辑中减去了 layoutPos）
    // 而 Connector 本身在 MindMapLayout 中 offset 是 0,0
    // 所以 Connector 的绝对坐标 = MindMapLayout 的绝对坐标
    const pos = this.getAbsolutePosition();
    const localX = x - pos.dx;
    const localY = y - pos.dy;

    // 增加点击判定范围
    const threshold = Math.max(this.strokeWidth, 6);

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      if (distanceToSegment(localX, localY, p1.x, p1.y, p2.x, p2.y) <= threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * 从节点实例获取绝对位置和尺寸
   */
  private getRectFromNode(node: Widget): { x: number; y: number; width: number; height: number } {
    const p = node.getAbsolutePosition();
    const s = node.renderObject.size;
    return { x: p.dx, y: p.dy, width: s.width, height: s.height };
  }

  protected performLayout(_constraints: BoxConstraints, childrenSizes: Size[]): Size {
    void childrenSizes;
    // 默认情况下，连接线不占用布局空间，仅用于绘制
    // 具体边界在 DevTools/命中测试中基于节点绝对位置动态计算
    return { width: 0, height: 0 };
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
