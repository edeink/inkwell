import React from 'react';

import { CustomComponentType } from './type';

import type {
  BoxConstraints,
  BuildContext,
  Offset,
  Size,
  WidgetData,
  WidgetProps,
} from '@/core/base';
import type { ConnectorStyle } from '@/demo/mindmap/helpers/connection-drawer';

import { Widget } from '@/core/base';
import { createWidget as createExternalWidget } from '@/core/registry';

export interface ConnectorStyleProviderData extends WidgetData {
  strokeWidth?: number;
  strokeColor?: string;
  dashArray?: string;
  style?: ConnectorStyle;
}

export class ConnectorStyleProvider extends Widget<ConnectorStyleProviderData> {
  strokeWidth?: number;
  strokeColor?: string;
  dashArray?: string;
  style?: ConnectorStyle;

  static {
    Widget.registerType(CustomComponentType.ConnectorStyleProvider, ConnectorStyleProvider);
  }

  constructor(data: ConnectorStyleProviderData) {
    super(data);
    this.init(data);
  }

  private init(data: ConnectorStyleProviderData): void {
    this.strokeWidth = data.strokeWidth;
    this.strokeColor = data.strokeColor;
    this.dashArray = data.dashArray;
    this.style = data.style;
  }

  createElement(data: ConnectorStyleProviderData): Widget<ConnectorStyleProviderData> {
    super.createElement(data);
    this.init(data);
    return this;
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    return Widget.createWidget(childData) ?? createExternalWidget(childData.type, childData);
  }

  protected paintSelf(_context: BuildContext): void {}

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const w = childrenSizes.length ? Math.max(...childrenSizes.map((s) => s.width)) : 0;
    const h = childrenSizes.length ? Math.max(...childrenSizes.map((s) => s.height)) : 0;
    const width = Math.max(constraints.minWidth, Math.min(w, constraints.maxWidth));
    const height = Math.max(constraints.minHeight, Math.min(h, constraints.maxHeight));
    return { width: isFinite(width) ? width : 0, height: isFinite(height) ? height : 0 };
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

export type ConnectorStyleProviderProps = Omit<ConnectorStyleProviderData, 'type' | 'children'> &
  WidgetProps;
export const ConnectorStyleProviderElement: React.FC<ConnectorStyleProviderProps> = () => null;
