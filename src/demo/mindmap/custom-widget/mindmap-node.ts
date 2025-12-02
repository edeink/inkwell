import React from 'react';

import { CustomComponentType } from './type';
import { Viewport } from './viewport';

import type {
  BoxConstraints,
  BuildContext,
  JSXComponentProps,
  Offset,
  Size,
  WidgetData,
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
    renderer.drawRect({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      fill: this.color,
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
    const vp = this.findViewport();
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

export type MindMapNodeProps = Omit<MindMapNodeData, 'type' | 'children'> & JSXComponentProps;
export const MindMapNodeElement: React.FC<MindMapNodeProps> = () => null;
