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
  hoveredKey?: string | null;
  activeKey?: string | null;
  editingKey?: string | null;
  hoverAnim?: Record<string, number>;
  collapsedKeys?: string[];
}

export class Viewport extends Widget<ViewportData> {
  private _scale: number = 1;
  private _tx: number = 0;
  private _ty: number = 0;
  private _selectedKeys: string[] = [];
  private _selectionRect: { x: number; y: number; width: number; height: number } | null = null;
  width?: number;
  height?: number;
  private _hoveredKey: string | null = null;
  private _activeKey: string | null = null;
  private _editingKey: string | null = null;
  private _hoverAnim: Record<string, number> = {};
  private _collapsedKeys: string[] = [];

  static {
    Widget.registerType(CustomComponentType.Viewport, Viewport);
  }

  constructor(data: ViewportData) {
    super(data);
    this.init(data);
  }

  private init(data: ViewportData): void {
    this._scale = (data.scale ?? this._scale) as number;
    this._tx = (data.tx ?? this._tx) as number;
    this._ty = (data.ty ?? this._ty) as number;
    this._selectedKeys = (data.selectedKeys ?? this._selectedKeys) as string[];
    this._selectionRect = (data.selectionRect ?? this._selectionRect) as {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
    this.width = data.width;
    this.height = data.height;
    this._hoveredKey = (data.hoveredKey ?? this._hoveredKey) as string | null;
    this._activeKey = (data.activeKey ?? this._activeKey) as string | null;
    this._editingKey = (data.editingKey ?? this._editingKey) as string | null;
    this._hoverAnim = (data.hoverAnim ?? this._hoverAnim) as Record<string, number>;
    this._collapsedKeys = (data.collapsedKeys ?? this._collapsedKeys) as string[];
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

  get scale(): number {
    return this._scale;
  }
  get tx(): number {
    return this._tx;
  }
  get ty(): number {
    return this._ty;
  }
  get selectedKeys(): string[] {
    return this._selectedKeys;
  }
  get selectionRect(): { x: number; y: number; width: number; height: number } | null {
    return this._selectionRect;
  }
  get hoveredKey(): string | null {
    return this._hoveredKey;
  }
  get activeKey(): string | null {
    return this._activeKey;
  }
  get editingKey(): string | null {
    return this._editingKey;
  }
  get hoverAnim(): Record<string, number> {
    return this._hoverAnim;
  }
  get collapsedKeys(): string[] {
    return this._collapsedKeys;
  }

  setTransform(scale: number, tx: number, ty: number): void {
    this._scale = scale;
    this._tx = tx;
    this._ty = ty;
  }

  setPosition(tx: number, ty: number): void {
    this._tx = tx;
    this._ty = ty;
  }

  setScale(scale: number): void {
    this._scale = scale;
  }

  setSelectedKeys(keys: string[]): void {
    this._selectedKeys = Array.from(keys);
  }

  setSelectionRect(rect: { x: number; y: number; width: number; height: number } | null): void {
    this._selectionRect = rect ? { ...rect } : null;
  }

  setHoveredKey(key: string | null): void {
    this._hoveredKey = key ?? null;
  }

  setActiveKey(key: string | null): void {
    this._activeKey = key ?? null;
  }

  setEditingKey(key: string | null): void {
    this._editingKey = key ?? null;
  }

  setHoverAnimProgress(map: Record<string, number>): void {
    this._hoverAnim = { ...map };
  }

  setCollapsedKeys(keys: string[]): void {
    this._collapsedKeys = Array.from(keys);
  }
}

export type ViewportProps = Omit<ViewportData, 'type' | 'children'> & JSXComponentProps;
export const ViewportElement: React.FC<ViewportProps> = () => null;
