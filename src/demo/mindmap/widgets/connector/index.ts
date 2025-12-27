import { getTheme } from '../../constants/theme';
import { CustomComponentType } from '../../type';

import type { BuildContext, WidgetProps } from '@/core/base';

import { Widget } from '@/core/base';
import { invert, transformPoint } from '@/core/helper/transform';
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
    // 处理线段长度为 0 的情况
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
    void _childData;
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

    if (!nodeA || !nodeB) {
      return null;
    }

    const rectA = this.getRectFromNode(nodeA);
    const rectB = this.getRectFromNode(nodeB);

    const aCenterX = rectA.x + rectA.width / 2;
    const bCenterX = rectB.x + rectB.width / 2;
    const left = aCenterX <= bCenterX ? rectA : rectB;
    const right = left === rectA ? rectB : rectA;
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

    // 将点击坐标（绝对坐标）转换为本地坐标
    const local = this.globalToLocal({ x, y });
    const localX = local.x;
    const localY = local.y;

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
   * 从节点实例获取相对位置和尺寸
   */
  private getRectFromNode(node: Widget): { x: number; y: number; width: number; height: number } {
    const p = this.getLocalPositionOf(node);
    const s = node.renderObject.size;
    return { x: p.x, y: p.y, width: s.width, height: s.height };
  }

  private getLocalPositionOf(node: Widget): { x: number; y: number } {
    // 同层级优化：如果是兄弟节点，直接计算相对偏移，避免矩阵滞后问题
    if (this.parent && node.parent === this.parent) {
      return {
        x: node.renderObject.offset.dx - this.renderObject.offset.dx,
        y: node.renderObject.offset.dy - this.renderObject.offset.dy,
      };
    }

    // 默认回退：使用绝对坐标转换
    const nodeAbs = node.getAbsolutePosition();
    return this.globalToLocal({ x: nodeAbs.dx, y: nodeAbs.dy });
  }

  private globalToLocal(p: { x: number; y: number }): { x: number; y: number } {
    if (this._worldMatrix) {
      const inv = invert(this._worldMatrix);
      return transformPoint(inv, p);
    }
    // Fallback if matrix not ready
    const abs = this.getAbsolutePosition();
    return { x: p.x - abs.dx, y: p.y - abs.dy };
  }
}
