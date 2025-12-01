import { Viewport } from './custom-widget/viewport';

import type { Widget } from '@/core/base';

import Runtime from '@/runtime';

/**
 * Mindmap 控制器（交互逻辑）
 * 负责拖拽、框选、缩放、视图平移及撤销/重做等交互逻辑。
 * 通过 Runtime 和 Viewport 实现对渲染与坐标系的统一控制。
 */
export class MindmapController {
  runtime: Runtime;
  viewport: Viewport;
  selectedKeys: Set<string> = new Set();
  selectionRect: { x: number; y: number; width: number; height: number } | null = null;
  dragging: {
    widget: Widget;
    startX: number;
    startY: number;
    origDx: number;
    origDy: number;
  } | null = null;
  viewScale: number;
  viewTx: number;
  viewTy: number;
  history: Array<Record<string, { dx: number; dy: number }>> = [];
  future: Array<Record<string, { dx: number; dy: number }>> = [];

  constructor(runtime: Runtime, viewport: Viewport) {
    this.runtime = runtime;
    this.viewport = viewport;
    this.viewScale = viewport.scale;
    this.viewTx = viewport.tx;
    this.viewTy = viewport.ty;
    this.attach();
  }

  /**
   * 绑定事件处理函数至容器/窗口
   * - pointerdown/move/up：拖拽与框选
   * - wheel：缩放（以指针位置为中心）
   * - keydown：方向键平移、撤销/重做
   */
  private attach(): void {
    const raw = this.runtime.getRenderer()?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    const target = canvas ?? this.runtime.getContainer();
    if (!target) {
      return;
    }
    const onDown = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.viewTx) / this.viewScale;
      const y = (e.clientY - rect.top - this.viewTy) / this.viewScale;
      const hit = this.findNodeAtPoint(this.runtime.getRootWidget(), x, y);
      if (hit) {
        const pos = hit.getAbsolutePosition();
        this.dragging = { widget: hit, startX: x, startY: y, origDx: pos.dx, origDy: pos.dy };
      } else {
        this.selectionRect = { x, y, width: 0, height: 0 };
      }
    };
    const onMove = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.viewTx) / this.viewScale;
      const y = (e.clientY - rect.top - this.viewTy) / this.viewScale;
      if (this.dragging) {
        const dx = x - this.dragging.startX;
        const dy = y - this.dragging.startY;
        const offset = { dx: this.dragging.origDx + dx, dy: this.dragging.origDy + dy };
        this.dragging.widget.renderObject.offset = offset;
        this.runtime.rebuild();
      } else if (this.selectionRect) {
        this.selectionRect.width = x - this.selectionRect.x;
        this.selectionRect.height = y - this.selectionRect.y;
        this.viewport.selectionRect = this.selectionRect;
        this.runtime.rebuild();
      }
    };
    const onUp = () => {
      if (this.dragging) {
        this.pushHistorySnapshot();
        this.dragging = null;
      }
      if (this.selectionRect) {
        const r = this.normalizeRect(this.selectionRect);
        this.selectedKeys = new Set(this.collectKeysInRect(r));
        this.selectionRect = null;
        this.viewport.selectionRect = null;
        this.viewport.selectedKeys = Array.from(this.selectedKeys);
        this.runtime.rebuild();
      }
    };
    const onWheel = (e: WheelEvent) => {
      const scaleDelta = e.deltaY < 0 ? 1.05 : 0.95;
      const rect = target.getBoundingClientRect();
      const cx = (e.clientX - rect.left - this.viewTx) / this.viewScale;
      const cy = (e.clientY - rect.top - this.viewTy) / this.viewScale;
      this.viewScale *= scaleDelta;
      this.viewTx = e.clientX - rect.left - cx * this.viewScale;
      this.viewTy = e.clientY - rect.top - cy * this.viewScale;
      this.viewport.scale = this.viewScale;
      this.viewport.tx = this.viewTx;
      this.viewport.ty = this.viewTy;
      this.runtime.rebuild();
    };
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        this.undo();
      } else if (
        (ctrl && e.key.toLowerCase() === 'y') ||
        (ctrl && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        this.redo();
      } else if (e.key === 'ArrowLeft') {
        this.viewTx += 20;
        this.viewport.tx = this.viewTx;
        this.runtime.rebuild();
      } else if (e.key === 'ArrowRight') {
        this.viewTx -= 20;
        this.viewport.tx = this.viewTx;
        this.runtime.rebuild();
      } else if (e.key === 'ArrowUp') {
        this.viewTy += 20;
        this.viewport.ty = this.viewTy;
        this.runtime.rebuild();
      } else if (e.key === 'ArrowDown') {
        this.viewTy -= 20;
        this.viewport.ty = this.viewTy;
        this.runtime.rebuild();
      }
    };
    target.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    target.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
  }

  /**
   * 在逻辑坐标系中查找命中的节点
   * @param widget 根节点
   * @param x 逻辑坐标 X
   * @param y 逻辑坐标 Y
   */
  private findNodeAtPoint(widget: Widget | null, x: number, y: number): Widget | null {
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

  /**
   * 归一化矩形，确保宽高为正值
   */
  private normalizeRect(r: { x: number; y: number; width: number; height: number }) {
    const x = r.width >= 0 ? r.x : r.x + r.width;
    const y = r.height >= 0 ? r.y : r.y + r.height;
    const w = Math.abs(r.width);
    const h = Math.abs(r.height);
    return { x, y, width: w, height: h };
  }

  /**
   * 收集与矩形相交的节点 key 列表
   */
  private collectKeysInRect(r: { x: number; y: number; width: number; height: number }): string[] {
    const out: string[] = [];
    const root = this.runtime.getRootWidget();
    const walk = (w: Widget) => {
      const p = w.getAbsolutePosition();
      const s = w.renderObject.size;
      const isNode = w.type === 'MindMapNode';
      if (
        isNode &&
        p.dx < r.x + r.width &&
        p.dx + s.width > r.x &&
        p.dy < r.y + r.height &&
        p.dy + s.height > r.y
      ) {
        out.push(w.key);
      }
      for (const c of w.children) {
        walk(c);
      }
    };
    if (root) {
      walk(root);
    }
    return out;
  }

  /**
   * 采集当前所有节点位置快照
   */
  private snapshotPositions(): Record<string, { dx: number; dy: number }> {
    const m: Record<string, { dx: number; dy: number }> = {};
    const root = this.runtime.getRootWidget();
    const walk = (w: Widget) => {
      m[w.key] = { dx: w.renderObject.offset.dx, dy: w.renderObject.offset.dy };
      for (const c of w.children) {
        walk(c);
      }
    };
    if (root) {
      walk(root);
    }
    return m;
  }

  /**
   * 推入一次历史快照（用于撤销）
   */
  private pushHistorySnapshot(): void {
    this.history.push(this.snapshotPositions());
    this.future = [];
  }

  /**
   * 应用位置映射到当前组件树
   */
  private applyPositions(map: Record<string, { dx: number; dy: number }>): void {
    const root = this.runtime.getRootWidget();
    const walk = (w: Widget) => {
      const p = map[w.key];
      if (p) {
        w.renderObject.offset.dx = p.dx;
        w.renderObject.offset.dy = p.dy;
      }
      for (const c of w.children) {
        walk(c);
      }
    };
    if (root) {
      walk(root);
    }
  }

  /** 撤销一次位置变更 */
  undo(): void {
    if (this.history.length === 0) {
      return;
    }
    const last = this.history.pop()!;
    this.future.push(this.snapshotPositions());
    this.applyPositions(last);
    this.runtime.rebuild();
  }

  /** 重做一次位置变更 */
  redo(): void {
    if (this.future.length === 0) {
      return;
    }
    const next = this.future.pop()!;
    this.history.push(this.snapshotPositions());
    this.applyPositions(next);
    this.runtime.rebuild();
  }
}
