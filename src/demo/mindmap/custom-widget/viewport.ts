import { SCALE_CONFIG } from '../config/constants';

import { CustomComponentType } from './type';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Widget } from '@/core/base';
import { findWidget } from '@/core/helper/widget-selector';

export interface ViewportProps extends WidgetProps {
  scale?: number;
  tx?: number;
  ty?: number;
  selectedKeys?: string[];
  selectionRect?: { x: number; y: number; width: number; height: number } | null;
  width?: number;
  height?: number;
  activeKey?: string | null;
  editingKey?: string | null;
  collapsedKeys?: string[];
  // 新增属性：以世界坐标单位控制 children 层偏移
  scrollX?: number;
  scrollY?: number;
  // 新增事件：滚动更新回调，外部据此更新 scrollX/scrollY
  onScroll?: (scrollX: number, scrollY: number) => void;
  // 新增事件：视图变换回调（缩放/平移）
  onViewChange?: (view: { scale: number; tx: number; ty: number }) => void;
  onZoomAt?: (scale: number, cx: number, cy: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteSelection?: () => void;
  onSetSelectedKeys?: (keys: string[]) => void;
}

function pointerIdOf(native?: Event): number {
  const p = native as PointerEvent | undefined;
  if (p && typeof p.pointerId === 'number') {
    return p.pointerId;
  }
  const t = native as TouchEvent | undefined;
  if (t && t.changedTouches && t.changedTouches.length > 0) {
    return t.changedTouches[0].identifier;
  }
  return -1;
}

function clampScale(s: number): number {
  const min = SCALE_CONFIG.MIN_SCALE;
  const max = SCALE_CONFIG.MAX_SCALE;
  return Math.max(min, Math.min(max, s));
}

/**
 * 视口（Viewport）
 * 模块功能说明：
 * - 提供思维导图画布的平移与缩放（含双指捏合）交互
 * - 管理选中、悬停、编辑状态并通过回调与外部控制器通信
 * - 统一将屏幕坐标转换为世界坐标以便命中测试与框选
 */
export class Viewport extends Widget<ViewportProps> {
  private _scale: number = 1;
  private _tx: number = 0;
  private _ty: number = 0;
  // children 层偏移（世界坐标），用于将平移作用于子元素而非视口自身
  private _contentTx: number = 0;
  private _contentTy: number = 0;
  private _selectedKeys: string[] = [];
  private _selectionRect: { x: number; y: number; width: number; height: number } | null = null;
  width?: number;
  height?: number;
  private _activeKey: string | null = null;
  private _editingKey: string | null = null;
  private _collapsedKeys: string[] = [];
  private pinchState: {
    id1: number;
    id2: number;
    startD: number;
    startScale: number;
    cx: number;
    cy: number;
  } | null = null;
  private pointers: Map<number, { x: number; y: number }> = new Map();
  private _onScroll?: (scrollX: number, scrollY: number) => void;
  private _onViewChange?: (view: { scale: number; tx: number; ty: number }) => void;
  private _onZoomAt?: (scale: number, cx: number, cy: number) => void;
  private _onUndo?: () => void;
  private _onRedo?: () => void;
  private _onDeleteSelection?: () => void;
  private _onSetSelectedKeys?: (keys: string[]) => void;
  private selectAllActive: boolean = false;
  private wheelPending: { dx: number; dy: number } | null = null;
  private wheelRaf: number | null = null;

  constructor(data: ViewportProps) {
    super(data);
    this.init(data);
  }

  private init(data: ViewportProps): void {
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
    this._activeKey = (data.activeKey ?? this._activeKey) as string | null;
    this._editingKey = (data.editingKey ?? this._editingKey) as string | null;
    this._collapsedKeys = (data.collapsedKeys ?? this._collapsedKeys) as string[];
    this._contentTx = (data.scrollX ?? this._contentTx) as number;
    this._contentTy = (data.scrollY ?? this._contentTy) as number;
    this._onScroll = data.onScroll;
    this._onViewChange = data.onViewChange;
    this._onZoomAt = data.onZoomAt;
    this._onUndo = data.onUndo;
    this._onRedo = data.onRedo;
    this._onDeleteSelection = data.onDeleteSelection;
    this._onSetSelectedKeys = data.onSetSelectedKeys;
  }

  createElement(data: ViewportProps): Widget<ViewportProps> {
    super.createElement(data);
    this.init(data);
    return this;
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const rect = this.selectionRect;
    if (rect) {
      const r = this.normalizeRect(rect);
      renderer.drawRect({
        x: r.x + this._contentTx,
        y: r.y + this._contentTy,
        width: r.width,
        height: r.height,
        fill: 'rgba(24,144,255,0.12)',
        stroke: '#1890ff',
        strokeWidth: 1,
      });
    }
  }

  // 移除组件内部的 requestRender：统一使用基类 markNeedsLayout 调度下一 Tick

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

  protected positionChild(_childIndex: number, _childSize: Size): Offset {
    // children 层统一应用 scrollX/scrollY 的偏移
    return { dx: this._contentTx, dy: this._contentTy };
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
  get activeKey(): string | null {
    return this._activeKey;
  }
  get editingKey(): string | null {
    return this._editingKey;
  }
  get collapsedKeys(): string[] {
    return this._collapsedKeys;
  }

  setTransform(scale: number, tx: number, ty: number): void {
    const s = clampScale(scale);
    const nx = Number.isFinite(tx) ? tx : this._tx;
    const ny = Number.isFinite(ty) ? ty : this._ty;
    this._scale = s;
    this._tx = nx;
    this._ty = ny;
    this._onViewChange?.({ scale: s, tx: nx, ty: ny });
    this.markNeedsLayout();
  }

  setPosition(tx: number, ty: number): void {
    const nx = Number.isFinite(tx) ? tx : this._tx;
    const ny = Number.isFinite(ty) ? ty : this._ty;
    this._tx = nx;
    this._ty = ny;
    this._onViewChange?.({ scale: this._scale, tx: nx, ty: ny });
    this.markNeedsLayout();
  }

  setScale(scale: number): void {
    this._scale = clampScale(scale);
    this._onViewChange?.({ scale: this._scale, tx: this._tx, ty: this._ty });
    this.markNeedsLayout();
  }

  setSelectedKeys(keys: string[]): void {
    this._selectedKeys = Array.from(keys);
  }

  setSelectionRect(rect: { x: number; y: number; width: number; height: number } | null): void {
    this._selectionRect = rect ? { ...rect } : null;
  }

  setActiveKey(key: string | null): void {
    this._activeKey = key ?? null;
    const start = (this.parent as Widget) ?? (this as Widget);
    const t = findWidget(start, `#${this._activeKey ?? ''}`) as Widget | null;
    if (t) {
      const isNode = t.type === CustomComponentType.MindMapNode;
      const container = isNode && t.parent ? (t.parent as Widget) : t;
      container.bringToFront();
    }
    const root = this as unknown as Widget;
    const next = this._activeKey;
    const update = (w: Widget): void => {
      if (w.type === CustomComponentType.MindMapNode) {
        const data = w.data;
        w.createElement({ ...data, activeKey: next, active: w.key === next });
      } else if (w.type === CustomComponentType.MindMapNodeToolbar) {
        const data = w.data;
        w.createElement({ ...data, activeKey: next });
      }
      for (const c of w.children as Widget[]) {
        update(c);
      }
    };
    for (const c of root.children) {
      update(c);
    }
    this.markDirty();
  }

  setEditingKey(key: string | null): void {
    this._editingKey = key ?? null;
  }

  setCollapsedKeys(keys: string[]): void {
    this._collapsedKeys = Array.from(keys);
  }

  onPointerDown(e: InkwellEvent): boolean | void {
    const world = this.getWorldXY(e);
    const pid = pointerIdOf(e?.nativeEvent);
    this.pointers.set(pid, world);
    // Ctrl/Meta + 左键：进入全选模式（不触发平移/滚动）
    const pe = e?.nativeEvent as PointerEvent | undefined;
    const ctrlLike = !!(pe && (pe.ctrlKey || pe.metaKey));
    const leftBtn = !!(pe && pe.buttons & 1);
    if (ctrlLike && leftBtn) {
      this.selectAllActive = true;
      const keys = this.collectAllNodeKeys();
      this.setSelectedKeys(keys);
      this.markNeedsLayout();
      return false;
    }
    if (leftBtn && !ctrlLike) {
      this._selectionRect = { x: world.x, y: world.y, width: 0, height: 0 };
      return false;
    }
    // 若满足双指捏合（pinch）启动条件，优先开始缩放交互
    if (this.tryStartPinch(e?.nativeEvent)) {
      return false;
    }
    // 禁用单指拖动视口平移：保留为纯 pointer move（不设置 panState）
    return false;
  }

  onPointerMove(e: InkwellEvent): boolean | void {
    const world = this.getWorldXY(e);
    const pid = pointerIdOf(e?.nativeEvent);
    // 在捏合缩放期间更新两指位置并计算缩放比例
    if (this.updatePinchZoom(pid, world, e?.nativeEvent)) {
      return false;
    }
    // 全选模式下保持选择，不触发平移/滚动
    if (this.selectAllActive) {
      return false;
    }
    if (this._selectionRect) {
      this._selectionRect.width = world.x - this._selectionRect.x;
      this._selectionRect.height = world.y - this._selectionRect.y;
      this.markNeedsLayout();
      return false;
    }
  }

  onPointerUp(e: InkwellEvent): boolean | void {
    const pid = pointerIdOf(e?.nativeEvent);
    if (pid !== -1) {
      this.pointers.delete(pid);
    }
    // 当捏合参与指针抬起时，结束捏合缩放状态
    if (this.stopPinchIfPointer(pid)) {
      // 结束捏合后直接返回，避免误触发后续逻辑
      return false;
    }
    // 退出全选模式
    if (this.selectAllActive) {
      this.selectAllActive = false;
      return false;
    }
    if (this._selectionRect) {
      const r = this.normalizeRect(this._selectionRect);
      this._selectionRect = null;
      this.setSelectionRect(null);
      const selected = new Set(this.collectKeysInRect(r));
      this.setSelectedKeys(Array.from(selected));
      this._onSetSelectedKeys?.(this._selectedKeys);
      this.markNeedsLayout();
      return false;
    }
  }

  onWheel(e: InkwellEvent): boolean | void {
    const we = e?.nativeEvent as WheelEvent | undefined;
    if (we && (we.ctrlKey || we.metaKey)) {
      we.preventDefault();
    }
    // 触控板双指滚动：当未按下 Ctrl/Meta 时，按 wheel delta 平滑平移视口
    if (we && !(we.ctrlKey || we.metaKey)) {
      const dx = we.deltaX || 0;
      const dy = we.deltaY || 0;
      // 合并多次 wheel 事件到一帧
      const pending = this.wheelPending ?? { dx: 0, dy: 0 };
      pending.dx = dx;
      pending.dy = dy;
      this.wheelPending = pending;
      if (this.wheelRaf == null) {
        this.wheelRaf = requestAnimationFrame(() => {
          const p = this.wheelPending ?? { dx: 0, dy: 0 };
          this.wheelPending = null;
          this.wheelRaf = null;
          // 将滚轮平移作用于 children 层偏移（世界单位需除以缩放），通过 onScroll 通知外部
          const nextScrollX = this._contentTx + -p.dx / this.scale;
          const nextScrollY = this._contentTy + -p.dy / this.scale;
          this.setContentPosition(nextScrollX, nextScrollY);
          this._onScroll?.(nextScrollX, nextScrollY);
          this.markNeedsLayout();
        });
      }
      return false;
    }
    // 触控板捏合缩放（或 Ctrl/Meta 辅助缩放）：延迟到 rAF 中统一处理
    const scaleDelta = we && we.deltaY < 0 ? 1.06 : 0.94;
    const { x: cx, y: cy } = we ? this.getLocalCoords(we) : { x: 0, y: 0 };
    const s = clampScale(this.scale * scaleDelta);
    const pendingZoom = { scale: s, cx, cy };
    requestAnimationFrame(() => {
      this._onZoomAt?.(pendingZoom.scale, pendingZoom.cx, pendingZoom.cy);
    });
    return false;
  }

  onKeyDown(e: InkwellEvent): boolean | void {
    const ke = e?.nativeEvent as KeyboardEvent | undefined;
    if (!ke) {
      return;
    }
    const ctrlKey = ke.ctrlKey || ke.metaKey;
    if (ctrlKey && ke.key.toLowerCase() === 'z' && !ke.shiftKey) {
      this._onUndo?.();
    } else if (
      (ctrlKey && ke.key.toLowerCase() === 'y') ||
      (ctrlKey && ke.shiftKey && ke.key.toLowerCase() === 'z')
    ) {
      this._onRedo?.();
    } else if (ctrlKey && (ke.key === '+' || ke.key === '-' || ke.key === '=' || ke.key === '0')) {
      ke.preventDefault();
    } else if (ke.key === 'Delete' || ke.key === 'Backspace') {
      const editing = this.editingKey;
      if (editing) {
        return false;
      }
      this._onDeleteSelection?.();
    } else if (ke.key === 'ArrowLeft') {
      const nextScrollX = this._contentTx + 20 / this.scale;
      const nextScrollY = this._contentTy;
      this.setContentPosition(nextScrollX, nextScrollY);
      this._onScroll?.(nextScrollX, nextScrollY);
      this.markNeedsLayout();
    } else if (ke.key === 'ArrowRight') {
      const nextScrollX = this._contentTx - 20 / this.scale;
      const nextScrollY = this._contentTy;
      this.setContentPosition(nextScrollX, nextScrollY);
      this._onScroll?.(nextScrollX, nextScrollY);
      this.markNeedsLayout();
    } else if (ke.key === 'ArrowUp') {
      const nextScrollX = this._contentTx;
      const nextScrollY = this._contentTy + 20 / this.scale;
      this.setContentPosition(nextScrollX, nextScrollY);
      this._onScroll?.(nextScrollX, nextScrollY);
      this.markNeedsLayout();
    } else if (ke.key === 'ArrowDown') {
      const nextScrollX = this._contentTx;
      const nextScrollY = this._contentTy - 20 / this.scale;
      this.setContentPosition(nextScrollX, nextScrollY);
      this._onScroll?.(nextScrollX, nextScrollY);
      this.markNeedsLayout();
    }
    return false;
  }

  private getWorldXY(e: InkwellEvent): { x: number; y: number } {
    const x = (e.x - this.tx) / this.scale - this._contentTx;
    const y = (e.y - this.ty) / this.scale - this._contentTy;
    return { x, y };
  }

  private getLocalCoords(native: Event): { x: number; y: number } {
    const target = native.target as Element;
    const rect = target?.getBoundingClientRect?.() ?? { left: 0, top: 0 };

    let clientX = 0;
    let clientY = 0;

    const m = native as MouseEvent;
    if (typeof m.clientX === 'number') {
      clientX = m.clientX;
      clientY = m.clientY;
    } else {
      const t = (native as TouchEvent).changedTouches?.[0];
      if (t) {
        clientX = t.clientX;
        clientY = t.clientY;
      }
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  zoomAt(newScale: number, cx: number, cy: number): void {
    const x = (cx - this.tx) / this.scale - this._contentTx;
    const y = (cy - this.ty) / this.scale - this._contentTy;
    const s = clampScale(newScale);
    const tx = cx - (this._contentTx + x) * s;
    const ty = cy - (this._contentTy + y) * s;
    this.setTransform(s, tx, ty);
  }

  /**
   * 设置 children 层滚动偏移
   */
  setContentPosition(tx: number, ty: number): void {
    const nx = Number.isFinite(tx) ? tx : this._contentTx;
    const ny = Number.isFinite(ty) ? ty : this._contentTy;
    this._contentTx = nx;
    this._contentTy = ny;
    this.markNeedsLayout();
  }

  /**
   * 获取 children 层滚动偏移
   */
  getContentPosition(): { tx: number; ty: number } {
    return { tx: this._contentTx, ty: this._contentTy };
  }

  /**
   * 根据当前指针集合尝试启动捏合缩放
   * @param native 原生事件（用于读取 clientX/clientY）
   * @returns 是否成功启动捏合
   */
  private tryStartPinch(native?: Event): boolean {
    if (this.pointers.size === 2 && native) {
      const ids = Array.from(this.pointers.keys());
      const a = this.pointers.get(ids[0]);
      const b = this.pointers.get(ids[1]);
      if (!a || !b) {
        return false;
      }
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const { x: cx, y: cy } = this.getLocalCoords(native);
      this.pinchState = { id1: ids[0], id2: ids[1], startD: d, startScale: this.scale, cx, cy };
      this._selectionRect = null;
      return true;
    }
    return false;
  }

  /**
   * 在捏合缩放过程中更新指针位置并计算缩放比例
   * @param pid 指针ID（pointerId/touch identifier），-1 表示无效
   * @param world 世界坐标（已经扣除了视口平移与缩放）
   * @param native 原生事件（用于读取 clientX/clientY）
   * @returns 是否进行了捏合更新
   */
  private updatePinchZoom(pid: number, world: { x: number; y: number }, native?: Event): boolean {
    if (!this.pinchState || pid === -1) {
      return false;
    }
    this.pointers.set(pid, world);
    const a = this.pointers.get(this.pinchState.id1);
    const b = this.pointers.get(this.pinchState.id2);
    if (a && b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dNow = Math.hypot(dx, dy);
      const s = clampScale(this.pinchState.startScale * (dNow / this.pinchState.startD));
      const { x: cx, y: cy } = native ? this.getLocalCoords(native) : { x: 0, y: 0 };
      this._onZoomAt?.(s, cx, cy);
      return true;
    }
    return false;
  }

  /**
   * 若抬起的指针参与了捏合，结束捏合状态
   * @param pid 指针ID（-1 表示无效）
   * @returns 是否结束了捏合
   */
  private stopPinchIfPointer(pid: number): boolean {
    if (
      this.pinchState &&
      pid !== -1 &&
      (pid === this.pinchState.id1 || pid === this.pinchState.id2)
    ) {
      this.pinchState = null;
      return true;
    }
    return false;
  }

  private collectKeysInRect(r: { x: number; y: number; width: number; height: number }): string[] {
    const out: string[] = [];
    const root = this.parent;
    const walk = (w: Widget) => {
      const p = w.getAbsolutePosition();
      const s = w.renderObject.size;
      const isNode = w.type === CustomComponentType.MindMapNode;
      if (
        isNode &&
        p.dx < r.x + r.width &&
        p.dx + s.width > r.x &&
        p.dy < r.y + r.height &&
        p.dy + s.height > r.y
      ) {
        out.push(w.key as string);
      }
      for (const c of w.children) {
        walk(c);
      }
    };
    if (root) {
      walk(root as Widget);
    }
    return out;
  }

  private collectAllNodeKeys(): string[] {
    const out: string[] = [];
    const root = this.parent;
    const walk = (w: Widget) => {
      const isNode = w.type === CustomComponentType.MindMapNode;
      if (isNode) {
        out.push(w.key as string);
      }
      for (const c of w.children) {
        walk(c);
      }
    };
    if (root) {
      walk(root as Widget);
    }
    return out;
  }

  protected getSelfTransformSteps(): Array<
    | { t: 'translate'; x: number; y: number }
    | { t: 'scale'; sx: number; sy: number }
    | { t: 'rotate'; rad: number }
  > {
    const o = this.renderObject.offset;
    return [
      { t: 'translate', x: o.dx, y: o.dy },
      { t: 'translate', x: this.tx, y: this.ty },
      { t: 'scale', sx: this.scale, sy: this.scale },
    ];
  }
}
