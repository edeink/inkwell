import { SCALE_CONFIG } from '../../config/constants';

import type { Viewport } from '../../custom-widget/viewport';
import type { MindmapController } from '../index';
import type { Widget } from '@/core/base';

export class ViewModule {
  private controller: MindmapController;
  private _scale: number;
  private _tx: number;
  private _ty: number;
  private onViewChange: ((scale: number, tx: number, ty: number) => void) | null = null;
  private listeners: Set<(scale: number, tx: number, ty: number) => void> = new Set();

  constructor(
    controller: MindmapController,
    onViewChange?: (scale: number, tx: number, ty: number) => void,
  ) {
    this.controller = controller;
    const vp = controller.viewport as Viewport;
    this._scale = vp.scale;
    this._tx = vp.tx;
    this._ty = vp.ty;
    this.onViewChange = onViewChange ?? null;
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

  syncFromViewport(): void {
    const vp = this.controller.viewport as Viewport;
    this._scale = vp.scale;
    this._tx = vp.tx;
    this._ty = vp.ty;
    this.notifyListeners();
  }

  setPosition(tx: number, ty: number): void {
    this._tx = tx;
    this._ty = ty;
    this.apply();
  }

  zoomAt(newScale: number, cx: number, cy: number): void {
    const x = (cx - this._tx) / this._scale;
    const y = (cy - this._ty) / this._scale;
    this._scale = newScale;
    this._tx = cx - x * this._scale;
    this._ty = cy - y * this._scale;
    this.apply();
  }

  addChangeListener(fn: (scale: number, tx: number, ty: number) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  removeChangeListener(fn: (scale: number, tx: number, ty: number) => void): void {
    this.listeners.delete(fn);
  }

  clampScale(s: number): number {
    return Math.max(SCALE_CONFIG.MIN_SCALE, Math.min(SCALE_CONFIG.MAX_SCALE, s));
  }

  apply(): void {
    const vp = this.controller.viewport as Viewport;
    vp.setTransform(this._scale, this._tx, this._ty);
    this.resetCanvasTransform();
    this.notifyListeners();
  }

  notifyListeners(): void {
    this.onViewChange?.(this._scale, this._tx, this._ty);
    for (const fn of this.listeners) {
      try {
        fn(this._scale, this._tx, this._ty);
      } catch {}
    }
    this.dispatchViewChangeEvent();
    try {
      this.controller.viewport.markNeedsLayout();
    } catch {}
    try {
      const ctx = this.controller.getPluginContext();
      for (const p of this.controller.getPlugins()) {
        p.onViewChange?.(ctx, this._scale, this._tx, this._ty);
      }
    } catch {}
  }

  scheduleRender(): void {}

  setActiveKey(key: string | null): void {
    this.controller.viewport.setActiveKey(key);
    try {
      this.controller.viewport.markNeedsLayout();
    } catch {}
    this.dispatchActiveChangeEvent(key);
  }

  findNodeAtPoint(widget: Widget | null, x: number, y: number): Widget | null {
    if (!widget) {
      return null;
    }
    for (let i = widget.children.length - 1; i >= 0; i--) {
      const child = widget.children[i];
      const hit = this.findNodeAtPoint(child, x, y);
      if (hit) {
        return hit;
      }
    }
    const pos = widget.getAbsolutePosition();
    const sz = widget.renderObject.size;
    const isNode = widget.type === 'MindMapNode';
    if (isNode && x >= pos.dx && y >= pos.dy && x <= pos.dx + sz.width && y <= pos.dy + sz.height) {
      return widget;
    }
    return null;
  }

  private resetCanvasTransform(): void {
    const raw = this.controller.runtime
      .getRenderer()
      ?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    if (!raw || !canvas) {
      return;
    }
    const styleW = parseFloat(canvas.style.width || '0') || canvas.width;
    const resolution = styleW > 0 ? canvas.width / styleW : 1;
    raw.setTransform(resolution, 0, 0, resolution, 0, 0);
  }

  private dispatchViewChangeEvent(): void {
    const raw = this.controller.runtime
      .getRenderer()
      ?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    const target: EventTarget | null = canvas ?? this.controller.runtime.container;
    try {
      target?.dispatchEvent(
        new CustomEvent('inkwell:viewchange', {
          detail: { scale: this._scale, tx: this._tx, ty: this._ty },
        }),
      );
    } catch {}
  }

  private dispatchActiveChangeEvent(key: string | null): void {
    const raw = this.controller.runtime
      .getRenderer()
      ?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    const target: EventTarget | null = canvas ?? this.controller.runtime.container;
    try {
      target?.dispatchEvent(
        new CustomEvent('inkwell:activechange', {
          detail: { activeKey: key },
        }),
      );
    } catch {}
  }
}
