import { SCALE_CONFIG } from './config/constants';
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
  private panState: { startX: number; startY: number; origTx: number; origTy: number } | null =
    null;
  private pinchState: {
    id1: number;
    id2: number;
    startD: number;
    startScale: number;
    cx: number;
    cy: number;
  } | null = null;
  private pointers: Map<number, { x: number; y: number }> = new Map();
  private renderScheduled: boolean = false;
  private onViewChange: ((scale: number, tx: number, ty: number) => void) | null = null;
  private viewChangeListeners: Set<(scale: number, tx: number, ty: number) => void> = new Set();
  private zoomRafScheduled: boolean = false;
  private pendingZoom: { scale: number; cx: number; cy: number } | null = null;
  private lastPanTs: number = 0;
  private lastPanX: number = 0;
  private lastPanY: number = 0;

  constructor(
    runtime: Runtime,
    viewport: Viewport,
    onViewChange?: (scale: number, tx: number, ty: number) => void,
  ) {
    this.runtime = runtime;
    this.viewport = viewport;
    this.viewScale = viewport.scale;
    this.viewTx = viewport.tx;
    this.viewTy = viewport.ty;
    this.onViewChange = onViewChange ?? null;
    this.attach();
  }

  /**
   * 设置视图平移位置（不改变缩放），并应用到 Viewport
   */
  setViewPosition(tx: number, ty: number): void {
    this.viewTx = tx;
    this.viewTy = ty;
    this.applyView();
  }

  /**
   * 注册视图变更回调，返回取消订阅函数
   */
  addViewChangeListener(fn: (scale: number, tx: number, ty: number) => void): () => void {
    this.viewChangeListeners.add(fn);
    return () => {
      this.viewChangeListeners.delete(fn);
    };
  }

  /**
   * 取消注册视图变更回调
   */
  removeViewChangeListener(fn: (scale: number, tx: number, ty: number) => void): void {
    this.viewChangeListeners.delete(fn);
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
    const getWorldXY = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.viewTx) / this.viewScale;
      const y = (e.clientY - rect.top - this.viewTy) / this.viewScale;
      return { x, y };
    };
    const onDown = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const { x, y } = getWorldXY(e);
      this.pointers.set(e.pointerId, { x, y });
      if (this.pointers.size === 2) {
        const [aId, bId] = Array.from(this.pointers.keys());
        const a = this.pointers.get(aId)!;
        const b = this.pointers.get(bId)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        this.pinchState = { id1: aId, id2: bId, startD: d, startScale: this.viewScale, cx, cy };
        this.dragging = null;
        this.panState = null;
        this.selectionRect = null;
        return;
      }
      if (e.shiftKey) {
        this.selectionRect = { x, y, width: 0, height: 0 };
        this.viewport.setSelectionRect(this.selectionRect);
        this.scheduleRender();
        return;
      }
      const hit = this.findNodeAtPoint(this.runtime.getRootWidget(), x, y);
      if (hit) {
        const pos = hit.getAbsolutePosition();
        this.dragging = { widget: hit, startX: x, startY: y, origDx: pos.dx, origDy: pos.dy };
        this.panState = null;
      } else {
        this.dragging = null;
        this.panState = { startX: x, startY: y, origTx: this.viewTx, origTy: this.viewTy };
      }
    };
    const onMove = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const { x, y } = getWorldXY(e);
      if (this.pinchState) {
        this.pointers.set(e.pointerId, { x, y });
        const a = this.pointers.get(this.pinchState.id1);
        const b = this.pointers.get(this.pinchState.id2);
        if (a && b) {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dNow = Math.hypot(dx, dy);
          const s = this.clampScale(this.pinchState.startScale * (dNow / this.pinchState.startD));
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;
          this.zoomAt(s, cx, cy);
        }
        return;
      }
      if (this.dragging) {
        const dx = x - this.dragging.startX;
        const dy = y - this.dragging.startY;
        const offset = { dx: this.dragging.origDx + dx, dy: this.dragging.origDy + dy };
        this.dragging.widget.renderObject.offset = offset;
        this.scheduleRender();
        return;
      }
      if (this.panState) {
        const dx = (x - this.panState.startX) * this.viewScale;
        const dy = (y - this.panState.startY) * this.viewScale;
        this.viewTx = this.panState.origTx + dx;
        this.viewTy = this.panState.origTy + dy;
        // 记录最近一次平移用于惯性计算
        this.lastPanTs = performance.now();
        this.lastPanX = this.viewTx;
        this.lastPanY = this.viewTy;
        this.applyView();
        return;
      }
      if (this.selectionRect) {
        this.selectionRect.width = x - this.selectionRect.x;
        this.selectionRect.height = y - this.selectionRect.y;
        this.viewport.setSelectionRect(this.selectionRect);
        this.scheduleRender();
      }
    };
    const onUp = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (
        this.pinchState &&
        (e.pointerId === this.pinchState.id1 || e.pointerId === this.pinchState.id2)
      ) {
        this.pinchState = null;
      }
      if (this.dragging) {
        this.pushHistorySnapshot();
        this.dragging = null;
      }
      if (this.panState) {
        // 惯性滑动（可选）：根据最近的速度收敛到停止
        const endTs = performance.now();
        const dt = Math.max(1, endTs - this.lastPanTs);
        const vx = (this.viewTx - this.lastPanX) / dt; // px/ms
        const vy = (this.viewTy - this.lastPanY) / dt;
        this.panState = null;
        const speed = Math.hypot(vx, vy);
        if (speed > 0.05) {
          let curVx = vx;
          let curVy = vy;
          const decay = 0.92; // 每帧速度衰减
          const step = () => {
            // 以当前速度推进位置
            this.viewTx += curVx * 16; // 约每帧 16ms
            this.viewTy += curVy * 16;
            this.applyView();
            // 衰减速度
            curVx *= decay;
            curVy *= decay;
            if (Math.hypot(curVx, curVy) > 0.01) {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        }
      }
      if (this.selectionRect) {
        const r = this.normalizeRect(this.selectionRect);
        this.selectedKeys = new Set(this.collectKeysInRect(r));
        this.selectionRect = null;
        this.viewport.setSelectionRect(null);
        this.viewport.setSelectedKeys(Array.from(this.selectedKeys));
        this.scheduleRender();
      }
    };
    const onWheel = (e: WheelEvent) => {
      // 禁用浏览器默认缩放（包括触控板 pinch 会触发 ctrlKey）
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
      const scaleDelta = e.deltaY < 0 ? 1.06 : 0.94;
      const rect = target.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const s = this.clampScale(this.viewScale * scaleDelta);
      // 使用 rAF 合并高频 wheel 事件，保证 60fps 平滑
      this.pendingZoom = { scale: s, cx, cy };
      if (!this.zoomRafScheduled) {
        this.zoomRafScheduled = true;
        requestAnimationFrame(() => {
          const pz = this.pendingZoom;
          if (pz) {
            this.zoomAt(pz.scale, pz.cx, pz.cy);
          }
          this.pendingZoom = null;
          this.zoomRafScheduled = false;
        });
      }
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
      } else if (
        // 禁用浏览器默认缩放快捷键（Ctrl/Cmd + '+', '-', '=' 或 '0'）
        ctrl &&
        (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')
      ) {
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        this.setViewPosition(this.viewTx + 20, this.viewTy);
      } else if (e.key === 'ArrowRight') {
        this.setViewPosition(this.viewTx - 20, this.viewTy);
      } else if (e.key === 'ArrowUp') {
        this.setViewPosition(this.viewTx, this.viewTy + 20);
      } else if (e.key === 'ArrowDown') {
        this.setViewPosition(this.viewTx, this.viewTy - 20);
      }
    };
    target.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    target.addEventListener('wheel', onWheel, { passive: false });
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
    this.runtime.rerender();
  }

  /** 重做一次位置变更 */
  redo(): void {
    if (this.future.length === 0) {
      return;
    }
    const next = this.future.pop()!;
    this.history.push(this.snapshotPositions());
    this.applyPositions(next);
    this.runtime.rerender();
  }

  private clampScale(s: number): number {
    return Math.max(SCALE_CONFIG.MIN_SCALE, Math.min(SCALE_CONFIG.MAX_SCALE, s));
  }

  zoomAt(newScale: number, cx: number, cy: number): void {
    const x = (cx - this.viewTx) / this.viewScale;
    const y = (cy - this.viewTy) / this.viewScale;
    this.viewScale = newScale;
    this.viewTx = cx - x * this.viewScale;
    this.viewTy = cy - y * this.viewScale;
    this.applyView();
  }

  private applyView(): void {
    // 移除 clampPan 的限制效果，允许视图自由缩放/平移
    this.viewport.setTransform(this.viewScale, this.viewTx, this.viewTy);
    this.resetCanvasTransform();
    this.onViewChange?.(this.viewScale, this.viewTx, this.viewTy);
    for (const fn of this.viewChangeListeners) {
      try {
        fn(this.viewScale, this.viewTx, this.viewTy);
      } catch {
        void 0;
      }
    }
    this.dispatchViewChangeEvent();
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.renderScheduled) {
      return;
    }
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.runtime.rerender();
      this.renderScheduled = false;
    });
  }

  private resetCanvasTransform(): void {
    const raw = this.runtime.getRenderer()?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    if (!raw || !canvas) {
      return;
    }
    const styleW = parseFloat(canvas.style.width || '0') || canvas.width;
    const resolution = styleW > 0 ? canvas.width / styleW : 1;
    raw.setTransform(resolution, 0, 0, resolution, 0, 0);
  }

  private dispatchViewChangeEvent(): void {
    const raw = this.runtime.getRenderer()?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    const target: EventTarget | null = canvas ?? this.runtime.getContainer();
    try {
      target?.dispatchEvent(
        new CustomEvent('inkwell:viewchange', {
          detail: { scale: this.viewScale, tx: this.viewTx, ty: this.viewTy },
        }),
      );
    } catch {
      void 0;
    }
  }
}
