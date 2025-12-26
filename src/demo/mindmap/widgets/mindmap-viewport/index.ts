import { SCALE_CONFIG } from '../../constants';
import { DeleteCommand, RedoCommand, UndoCommand } from '../../helpers/shortcut/commands/history';
import {
  MoveDownCommand,
  MoveLeftCommand,
  MoveRightCommand,
  MoveUpCommand,
} from '../../helpers/shortcut/commands/navigation';
import { PreventBrowserZoomCommand } from '../../helpers/shortcut/commands/system';
import { ViewportTransformCommand } from '../../helpers/shortcut/commands/view';
import { HistoryManager } from '../../helpers/shortcut/history/manager';
import { ShortcutManager } from '../../helpers/shortcut/manager';
import { CustomComponentType } from '../../type';

import type { SelectionData } from '../../type';
import type { BuildContext } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Widget } from '@/core/base';
import { findWidget } from '@/core/helper/widget-selector';
import { Viewport, type ViewportProps } from '@/core/viewport/viewport';

export interface MindMapViewportProps extends ViewportProps {
  selectedKeys?: string[];
  selectionRect?: { x: number; y: number; width: number; height: number } | null;
  activeKey?: string | null;
  editingKey?: string | null;
  collapsedKeys?: string[];

  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteSelection?: () => SelectionData | void;
  onRestoreSelection?: (data: SelectionData) => void;
  onSetSelectedKeys?: (keys: string[]) => void;
  onActiveKeyChange?: (key: string | null) => void;
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

/**
 * 视口（Viewport）
 * 模块功能说明：
 * - 提供思维导图画布的平移与缩放（含双指捏合）交互
 * - 管理选中、悬停、编辑状态并通过回调与外部控制器通信
 * - 统一将屏幕坐标转换为世界坐标以便命中测试与框选
 */
export class MindMapViewport extends Viewport<MindMapViewportProps> {
  private _selectedKeys: string[] = [];
  private _selectionRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;
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

  private pointers: Map<number, { x: number; y: number; clientX: number; clientY: number }> =
    new Map();

  private selectAllActive: boolean = false;

  private shortcutManager: ShortcutManager;
  public historyManager: HistoryManager;

  constructor(data: MindMapViewportProps) {
    // 注入默认缩放限制
    const propsWithDefaults = {
      minScale: SCALE_CONFIG.MIN_SCALE,
      maxScale: SCALE_CONFIG.MAX_SCALE,
      ...data,
    };
    super(propsWithDefaults);
    this.shortcutManager = new ShortcutManager();
    this.historyManager = new HistoryManager();
    this.registerDefaultShortcuts();
    this.initMindMap(data);
  }

  private initMindMap(data: MindMapViewportProps): void {
    this._selectedKeys = data.selectedKeys ?? [];
    this._selectionRect = data.selectionRect ?? null;
    this._activeKey = data.activeKey ?? null;
    this._editingKey = data.editingKey ?? null;
    this._collapsedKeys = data.collapsedKeys ?? [];
  }

  private registerDefaultShortcuts() {
    this.shortcutManager.register(UndoCommand);
    this.shortcutManager.register(RedoCommand);
    this.shortcutManager.register(DeleteCommand);
    this.shortcutManager.register(MoveLeftCommand);
    this.shortcutManager.register(MoveRightCommand);
    this.shortcutManager.register(MoveUpCommand);
    this.shortcutManager.register(MoveDownCommand);
    this.shortcutManager.register(PreventBrowserZoomCommand);
  }

  createElement(data: MindMapViewportProps): Widget<MindMapViewportProps> {
    super.createElement(data);
    this.initMindMap(data);
    return this;
  }

  // --- 重写 Viewport 方法以集成 HistoryManager ---

  public getWorldXY(e: { x: number; y: number } | InkwellEvent): { x: number; y: number } {
    return super.getWorldXY(e);
  }

  /**
   * 执行缩放，重写以支持撤销/重做记录
   */
  protected executeZoom(
    targetScale: number,
    cx: number,
    cy: number,
    addToHistory: boolean = true,
  ): void {
    // 计算新的 tx, ty (逻辑与 Viewport.executeZoom 相同，但我们需要这些值来创建 Command)
    const contentX = (cx - this._tx) / this._scale + this._scrollX;
    const contentY = (cy - this._ty) / this._scale + this._scrollY;
    const s = targetScale;
    const tx = cx - (contentX - this._scrollX) * s;
    const ty = cy - (contentY - this._scrollY) * s;

    if (addToHistory) {
      const cmd = new ViewportTransformCommand(
        this,
        { scale: this.scale, tx: this.tx, ty: this.ty },
        { scale: s, tx, ty },
      );
      this.historyManager.execute(cmd);
    } else {
      this.setTransform(s, tx, ty);
    }

    // Viewport.executeZoom 也会调用 setTransform，但我们这里通过 Command 间接调用 setTransform
    // 所以不需要调用 super.executeZoom，否则会重复设置
    // 但 Command 执行最终会调用 this.setTransform
  }

  // --- 获取器 ---

  get selectedKeys(): string[] {
    return this._selectedKeys;
  }
  get selectionRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
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

  // --- Business Actions ---

  public async undo(): Promise<void> {
    const success = await this.historyManager.undo();
    if (!success) {
      this.data.onUndo?.();
    }
  }

  public async redo(): Promise<void> {
    const success = await this.historyManager.redo();
    if (!success) {
      this.data.onRedo?.();
    }
  }

  /**
   * 兼容旧 API：设置位置
   */
  setPosition(tx: number, ty: number): void {
    this.setTransform(this.scale, tx, ty);
  }

  setSelectedKeys(keys: string[]): void {
    this._selectedKeys = Array.from(keys);
    this.data.onSetSelectedKeys?.(this._selectedKeys);
    // 通知子节点重绘
    const root = this as unknown as Widget;
    const update = (w: Widget): void => {
      if (w.type === CustomComponentType.MindMapNode) {
        w.markDirty();
      }
      for (const c of w.children as Widget[]) {
        update(c);
      }
    };
    for (const c of root.children) {
      update(c);
    }
  }

  setSelectionRect(rect: { x: number; y: number; width: number; height: number } | null): void {
    this._selectionRect = rect ? { ...rect } : null;
    this.markNeedsLayout();
  }

  setActiveKey(key: string | null): void {
    if (this._activeKey === key) {
      return;
    }
    if (key) {
      this.setSelectedKeys([]);
    }
    this._activeKey = key ?? null;
    this.data.onActiveKeyChange?.(this._activeKey);

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

  public deleteSelection(): SelectionData | void {
    return this.data.onDeleteSelection?.();
  }

  public restoreSelection(data: SelectionData): void {
    this.data.onRestoreSelection?.(data);
  }

  // --- 交互处理程序 ---

  onPointerDown(e: InkwellEvent): boolean | void {
    const world = this.getWorldXY(e);
    const pid = pointerIdOf(e?.nativeEvent);
    const pe = e?.nativeEvent as PointerEvent | undefined;
    this.pointers.set(pid, {
      ...world,
      clientX: pe?.clientX ?? 0,
      clientY: pe?.clientY ?? 0,
    });

    // 捏合缩放逻辑
    if (this.tryStartPinch()) {
      this._selectionRect = null;
      return false;
    }

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
      if (this.activeKey) {
        this.setActiveKey(null);
      }
      return false;
    }

    return false;
  }

  onPointerMove(e: InkwellEvent): boolean | void {
    const world = this.getWorldXY(e);
    const pid = pointerIdOf(e?.nativeEvent);
    const pe = e?.nativeEvent as PointerEvent | undefined;

    if (this.pointers.has(pid)) {
      this.pointers.set(pid, {
        ...world,
        clientX: pe?.clientX ?? 0,
        clientY: pe?.clientY ?? 0,
      });
    }

    if (this.updatePinchZoom()) {
      return false;
    }
    if (this.selectAllActive) {
      return false;
    }
    if (this._selectionRect) {
      this._selectionRect.width = world.x - this._selectionRect.x;
      this._selectionRect.height = world.y - this._selectionRect.y;
      const r = this.normalizeRect(this._selectionRect);
      const selected = this.collectKeysInRect(r);
      this.setSelectedKeys(selected);
      this.markNeedsLayout();
      return false;
    }
  }

  onPointerUp(e: InkwellEvent): boolean | void {
    const pid = pointerIdOf(e?.nativeEvent);
    if (pid !== -1) {
      this.pointers.delete(pid);
    }
    if (this.stopPinchIfPointer(pid)) {
      return false;
    }
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
      this.setActiveKey(null);
      this.markNeedsLayout();
      e.stopPropagation();
    }
  }

  onWheel(e: InkwellEvent): boolean | void {
    const we = e?.nativeEvent as WheelEvent | undefined;
    if (we && (we.ctrlKey || we.metaKey)) {
      we.preventDefault();
    }
    // 平移处理
    if (we && !(we.ctrlKey || we.metaKey)) {
      const dx = we.deltaX || 0;
      const dy = we.deltaY || 0;
      const nextScrollX = this._scrollX + dx / this.scale;
      const nextScrollY = this._scrollY + dy / this.scale;
      this.scrollTo(nextScrollX, nextScrollY);
      return false;
    }
    // 缩放处理
    const scaleDelta = we && we.deltaY < 0 ? 1.06 : 0.94;
    const { x: cx, y: cy } = we ? this.getLocalCoords(we) : { x: 0, y: 0 };
    const s = this.clampScale(this.scale * scaleDelta);
    // MindMap 期望有显式的 onZoomAt 处理程序，或者我们直接调用 executeZoom
    if (this.data.onZoomAt) {
      this.data.onZoomAt(s, cx, cy);
    } else {
      this.executeZoom(s, cx, cy, false);
    }
    return false;
  }

  onKeyDown(e: InkwellEvent): boolean | void {
    const ke = e?.nativeEvent as KeyboardEvent | undefined;
    if (!ke) {
      return;
    }
    const handled = this.shortcutManager.handle({
      viewport: this,
      event: e,
      nativeEvent: ke,
    });
    if (handled) {
      e.stopPropagation();
      return false;
    }
    return false;
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const rect = this.selectionRect;
    if (rect) {
      const r = this.normalizeRect(rect);
      renderer.drawRect({
        x: r.x - this._scrollX,
        y: r.y - this._scrollY,
        width: r.width,
        height: r.height,
        fill: 'rgba(24,144,255,0.12)',
        stroke: '#1890ff',
        strokeWidth: 1,
      });
    }
  }

  // --- 辅助方法 (捏合缩放 & 框选) ---

  private tryStartPinch(): boolean {
    if (this.pointers.size !== 2) {
      return false;
    }
    const pts = Array.from(this.pointers.entries());
    const p1 = pts[0];
    const p2 = pts[1];

    const t1 = p1[1];
    const t2 = p2[1];

    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    const d = Math.sqrt(dx * dx + dy * dy);

    // 计算相对于视口组件的中心点
    // 我们需要将客户端坐标转换为本地坐标以便进行缩放操作
    // 由于无法直接访问 DOM 节点，我们使用存储的世界坐标进行逆向计算
    // 之前的方法使用 getBoundingClientRect 进行调整，但这里我们使用已经计算好的世界坐标

    // 重新从世界坐标计算本地坐标
    const w1 = t1;
    const w2 = t2;

    const centerWorldX = (w1.x + w2.x) / 2;
    const centerWorldY = (w1.y + w2.y) / 2;

    // 将世界坐标中心点转换为本地坐标中心点
    const localCx = (centerWorldX - this._scrollX) * this.scale + this._tx;
    const localCy = (centerWorldY - this._scrollY) * this.scale + this._ty;

    this.pinchState = {
      id1: p1[0],
      id2: p2[0],
      startD: d,
      startScale: this.scale,
      cx: localCx,
      cy: localCy,
    };
    return true;
  }

  private updatePinchZoom(): boolean {
    if (!this.pinchState) {
      return false;
    }
    if (this.pointers.size < 2) {
      return false;
    }

    const p1 = this.pointers.get(this.pinchState.id1);
    const p2 = this.pointers.get(this.pinchState.id2);

    if (p1 && p2) {
      const dx = p1.clientX - p2.clientX;
      const dy = p1.clientY - p2.clientY;
      const d = Math.sqrt(dx * dx + dy * dy);
      const scale = this.pinchState.startScale * (d / this.pinchState.startD);
      const s = this.clampScale(scale);

      // 使用原始中心点 (pinchState.cx, cy)
      // 传入 false 以跳过历史记录
      this.executeZoom(s, this.pinchState.cx, this.pinchState.cy, false);
      return true;
    }
    return false;
  }

  private stopPinchIfPointer(pid: number): boolean {
    if (this.pinchState && (pid === this.pinchState.id1 || pid === this.pinchState.id2)) {
      this.pinchState = null;
      return true;
    }
    return false;
  }

  private normalizeRect(r: { x: number; y: number; width: number; height: number }) {
    const x = r.width >= 0 ? r.x : r.x + r.width;
    const y = r.height >= 0 ? r.y : r.y + r.height;
    const w = Math.abs(r.width);
    const h = Math.abs(r.height);
    return { x, y, width: w, height: h };
  }

  private collectKeysInRect(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): string[] {
    const res: string[] = [];
    const root = this as unknown as Widget;

    const getWidgetBounds = (
      w: Widget,
    ): { x: number; y: number; width: number; height: number } | null => {
      if (!w.renderObject) {
        return null;
      }
      let x = 0;
      let y = 0;
      let curr: Widget | null = w;
      // 计算相对于视口（根节点）的位置
      while (curr && curr !== root) {
        if (curr.renderObject) {
          x += curr.renderObject.offset.dx;
          y += curr.renderObject.offset.dy;
        }
        curr = curr.parent;
      }
      return {
        x,
        y,
        width: w.renderObject.size.width,
        height: w.renderObject.size.height,
      };
    };

    const traverse = (w: Widget) => {
      if (w.type === CustomComponentType.MindMapNode && w.key) {
        const bounds = getWidgetBounds(w);
        if (bounds) {
          // 检查相交
          const intersect = !(
            bounds.x > rect.x + rect.width ||
            bounds.x + bounds.width < rect.x ||
            bounds.y > rect.y + rect.height ||
            bounds.y + bounds.height < rect.y
          );
          if (intersect) {
            res.push(w.key);
          }
        }
      }
      for (const c of w.children as Widget[]) {
        traverse(c);
      }
    };

    for (const c of root.children as Widget[]) {
      traverse(c);
    }
    return res;
  }

  // 需要恢复 collectAllNodeKeys 方法
  private collectAllNodeKeys(): string[] {
    const res: string[] = [];
    const root = this as unknown as Widget;
    const traverse = (w: Widget) => {
      if (w.type === CustomComponentType.MindMapNode && w.key) {
        res.push(w.key);
      }
      for (const c of w.children as Widget[]) {
        traverse(c);
      }
    };
    traverse(root);
    return res;
  }
}
