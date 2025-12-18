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

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const layout = findWidget(this.root, CustomComponentType.MindMapLayout) as Widget | null;
    const nodeA = findWidget(layout, `MindMapNode#${this.fromKey}`) as Widget | null;
    const nodeB = findWidget(layout, `MindMapNode#${this.toKey}`) as Widget | null;

    const rectA = nodeA ? this.getRectFromNode(nodeA) : null;
    const rectB = nodeB ? this.getRectFromNode(nodeB) : null;
    if (!rectA || !rectB) {
      return;
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

    const dashStr = this.dashArray || '';
    const dash = dashStr
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    const theme = getTheme();
    const stroke = this.color ?? theme.connectorColor;
    const sw = this.strokeWidth;
    const aCenterX = a.x + a.width / 2;
    const bCenterX = b.x + b.width / 2;
    const left = aCenterX <= bCenterX ? a : b;
    const right = left === a ? b : a;
    const pts = connectorPathFromRects({
      left,
      right,
      style: this.style,
      samples: DEFAULT_CONNECTOR_OPTIONS.samples,
      margin: DEFAULT_CONNECTOR_OPTIONS.margin,
      elbowRadius: DEFAULT_CONNECTOR_OPTIONS.elbowRadius,
      arcSegments: DEFAULT_CONNECTOR_OPTIONS.arcSegments,
    });
    renderer.drawPath({ points: pts, stroke, strokeWidth: sw, dash });
  }

  public getBounds(): { x: number; y: number; width: number; height: number } | null {
    const layout = findWidget(this.root, CustomComponentType.MindMapLayout) as Widget | null;
    const nodeA = findWidget(layout, `MindMapNode#${this.fromKey}`) as Widget | null;
    const nodeB = findWidget(layout, `MindMapNode#${this.toKey}`) as Widget | null;

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
    const pts = connectorPathFromRects({
      left,
      right,
      style: this.style,
      samples: DEFAULT_CONNECTOR_OPTIONS.samples,
      margin: DEFAULT_CONNECTOR_OPTIONS.margin,
      elbowRadius: DEFAULT_CONNECTOR_OPTIONS.elbowRadius,
      arcSegments: DEFAULT_CONNECTOR_OPTIONS.arcSegments,
    });
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
