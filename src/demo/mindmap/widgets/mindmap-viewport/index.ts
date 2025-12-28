import { throttle } from 'lodash-es';

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
import type { BoxConstraints, BuildContext, Size } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { RTree, type BBox } from '@/core/algorithm/r-tree';
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
  onEditingKeyChange?: (key: string | null) => void;
}

/**
 * 视口（Viewport）
 * 模块功能说明：
 * - 提供思维导图画布的平移与缩放（含双指捏合）交互
 * - 管理选中、悬停、编辑状态并通过回调与外部控制器通信
 * - 统一将屏幕坐标转换为世界坐标以便命中测试与框选
 */
export class MindMapViewport extends Viewport<MindMapViewportProps> {
  private _selectionRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;

  private pinchState: {
    startD: number;
    startScale: number;
    cx: number;
    cy: number;
  } | null = null;

  private selectAllActive: boolean = false;
  private _internalActiveKey: string | null = null;
  private _internalEditingKey: string | null = null;
  private _internalSelectedKeys: string[] = [];

  private shortcutManager: ShortcutManager;
  public historyManager: HistoryManager;

  private spatialIndex: RTree<{ key: string; rect: BBox }> | null = null;
  private handleSelectionMove: () => void;

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
    this.handleSelectionMove = throttle(() => this.updateSelection(), 64);
    this.registerDefaultShortcuts();
    this.initMindMap(data);
  }

  private initMindMap(data: MindMapViewportProps): void {
    if (data.selectionRect !== undefined) {
      this._selectionRect = data.selectionRect;
    }
    if (data.activeKey !== undefined) {
      this._internalActiveKey = data.activeKey;
    }
    if (data.editingKey !== undefined) {
      this._internalEditingKey = data.editingKey;
    }
    if (data.selectedKeys !== undefined) {
      this._internalSelectedKeys = data.selectedKeys;
    }
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

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.broadcastStateToNodes();
    return super.performLayout(constraints, childrenSizes);
  }

  // --- 业务操作 (Business Actions) ---

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

  get selectionRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    return this._selectionRect;
  }

  setSelectionRect(rect: { x: number; y: number; width: number; height: number } | null): void {
    this._selectionRect = rect ? { ...rect } : null;
    this.markDirty();
  }

  // --- 属性访问器 (Getters & Setters) ---

  get selectedKeys(): string[] {
    return this.data.selectedKeys ?? this._internalSelectedKeys;
  }

  setSelectedKeys(keys: string[]): void {
    if (this.data.onSetSelectedKeys) {
      this.data.onSetSelectedKeys(keys);
    }
    this._internalSelectedKeys = keys;
    this.broadcastStateToNodes();
    this.markNeedsLayout();
    this.markDirty();
  }

  get activeKey(): string | null {
    return this.data.activeKey !== undefined ? this.data.activeKey : this._internalActiveKey;
  }

  setActiveKey(key: string | null): void {
    if (this.data.onActiveKeyChange) {
      this.data.onActiveKeyChange(key);
    }
    this._internalActiveKey = key;
    this.broadcastStateToNodes();
    this.markDirty();

    // 副作用：置顶显示
    if (key) {
      const start = (this.parent as Widget) ?? (this as Widget);
      const t = findWidget(start, `#${key}`) as Widget | null;
      if (t) {
        t.markDirty();
        let p = t.parent;
        let container: Widget | null = null;
        while (p && p !== this) {
          if (p.data.type === 'MindMapNodeContainer') {
            container = p;
            break;
          }
          p = p.parent;
        }
        if (container) {
          container.bringToFront();
        }
      }
    }
  }

  get editingKey(): string | null {
    return this.data.editingKey !== undefined ? this.data.editingKey : this._internalEditingKey;
  }

  setEditingKey(key: string | null): void {
    if (this.data.onEditingKeyChange) {
      this.data.onEditingKeyChange(key);
    }
    this._internalEditingKey = key;
    this.markDirty();
  }

  get collapsedKeys(): string[] {
    return this.data.collapsedKeys ?? [];
  }

  setCollapsedKeys(keys: string[]): void {
    // TODO: 如果需要，提升状态
    void keys;
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
    const pe = e?.nativeEvent as PointerEvent | undefined;

    const ctrlLike = !!(pe && (pe.ctrlKey || pe.metaKey));
    const leftBtn = !!(pe && pe.buttons & 1);
    if (ctrlLike && leftBtn) {
      this.selectAllActive = true;
      const keys = this.collectAllNodeKeys();
      this.setSelectedKeys(keys);
      this.markDirty();
      return false;
    }
    if (leftBtn && !ctrlLike) {
      this.buildSpatialIndex();
      this._selectionRect = { x: world.x, y: world.y, width: 0, height: 0 };
      if (this.activeKey || this.editingKey) {
        this.setActiveKey(null);
        this.setEditingKey(null);
      }
      this.markDirty();
      return false;
    }

    return false;
  }

  onPointerMove(e: InkwellEvent): boolean | void {
    const world = this.getWorldXY(e);

    // 双指缩放处理
    const ne = e.nativeEvent as TouchEvent | undefined;
    if (ne && ne.touches && ne.touches.length === 2) {
      this.handlePinchMove(ne.touches);
      return false;
    } else {
      this.pinchState = null;
    }

    if (this.selectAllActive) {
      return false;
    }
    if (this._selectionRect) {
      this._selectionRect.width = world.x - this._selectionRect.x;
      this._selectionRect.height = world.y - this._selectionRect.y;
      this.handleSelectionMove();
      this.markDirty();
      return false;
    }
  }

  onPointerUp(e: InkwellEvent): boolean | void {
    // 简单处理：释放时清理状态
    this.pinchState = null;

    if (this.selectAllActive) {
      this.selectAllActive = false;
      return false;
    }
    if (this._selectionRect) {
      // 最终选区更新
      this.updateSelection();
      this._selectionRect = null;
      this.setSelectionRect(null);
      this.setActiveKey(null);
      this.markDirty();
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
      // rect 是世界坐标 (World Space)
      // paintSelf 在视口局部坐标系 (Viewport Local Space) 中绘制 (在应用 scale/tx 之前)
      // 转换 World -> Local: Local = (World - scroll) * scale + tx
      const x = (r.x - this._scrollX) * this._scale + this._tx;
      const y = (r.y - this._scrollY) * this._scale + this._ty;
      const width = r.width * this._scale;
      const height = r.height * this._scale;

      renderer.drawRect({
        x,
        y,
        width,
        height,
        fill: 'rgba(0,150,255,0.2)',
        stroke: '#0096ff',
        strokeWidth: 1,
      });
    }
  }

  // --- 辅助方法 (捏合缩放 & 框选) ---

  private handlePinchMove(touches: TouchList) {
    const t1 = touches[0];
    const t2 = touches[1];
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (!this.pinchState) {
      // 开始缩放
      // 计算两个手指的中心点（Canvas 像素坐标）
      const p1 = this.getLocalCoords(t1 as unknown as MouseEvent);
      const p2 = this.getLocalCoords(t2 as unknown as MouseEvent);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      this.pinchState = {
        startD: d,
        startScale: this.scale,
        cx,
        cy,
      };
    } else {
      // 更新缩放
      const scale = this.pinchState.startScale * (d / this.pinchState.startD);
      const s = this.clampScale(scale);
      // 使用原始中心点进行缩放
      this.executeZoom(s, this.pinchState.cx, this.pinchState.cy, false);
    }
  }

  private normalizeRect(r: { x: number; y: number; width: number; height: number }) {
    const x = r.width >= 0 ? r.x : r.x + r.width;
    const y = r.height >= 0 ? r.y : r.y + r.height;
    const w = Math.abs(r.width);
    const h = Math.abs(r.height);
    return { x, y, width: w, height: h };
  }

  private buildSpatialIndex(): void {
    const items: { item: { key: string; rect: BBox }; bbox: BBox }[] = [];
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
      // 计算相对于视口的位置（视觉空间）
      // 注意：这包括 Viewport 布局应用的滚动偏移 (-scrollX, -scrollY)
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
          // 将视觉空间坐标转换为世界空间坐标（逻辑空间）
          // 视觉坐标 = 世界坐标 - 滚动偏移
          // 世界坐标 = 视觉坐标 + 滚动偏移
          const worldX = bounds.x + this._scrollX;
          const worldY = bounds.y + this._scrollY;

          const bbox = {
            minX: worldX,
            minY: worldY,
            maxX: worldX + bounds.width,
            maxY: worldY + bounds.height,
          };
          items.push({
            item: { key: w.key, rect: bbox },
            bbox,
          });
        }
      }
      for (const c of w.children as Widget[]) {
        traverse(c);
      }
    };

    for (const c of root.children as Widget[]) {
      traverse(c);
    }

    this.spatialIndex = new RTree();
    this.spatialIndex.load(items);
  }

  private updateSelection() {
    if (!this._selectionRect || !this.spatialIndex) {
      return;
    }
    const r = this.normalizeRect(this._selectionRect);

    // 根据拖拽方向确定选择模式（宽度的正负）
    // 宽度 > 0: 左 -> 右 (包含模式 Contain)
    // 宽度 < 0: 右 -> 左 (相交模式 Intersect)
    const isContainMode = this._selectionRect.width > 0;

    const bbox: BBox = {
      minX: r.x,
      minY: r.y,
      maxX: r.x + r.width,
      maxY: r.y + r.height,
    };

    const candidates = this.spatialIndex.search(bbox);

    let finalKeys: string[] = [];

    if (isContainMode) {
      finalKeys = candidates
        .filter(
          (c) =>
            c.rect.minX >= bbox.minX &&
            c.rect.maxX <= bbox.maxX &&
            c.rect.minY >= bbox.minY &&
            c.rect.maxY <= bbox.maxY,
        )
        .map((c) => c.key);
    } else {
      finalKeys = candidates.map((c) => c.key);
    }

    this.setSelectedKeys(finalKeys);
  }

  private broadcastStateToNodes(): void {
    const root = this as unknown as Widget;
    const selectedSet = new Set(this.selectedKeys);
    const traverse = (w: Widget) => {
      if (w.type === CustomComponentType.MindMapNode && w.key) {
        const props = w.props;
        if (props) {
          const isActive = w.key === this.activeKey;
          const isSelected = selectedSet.has(w.key);

          let changed = false;
          if (props.active !== isActive) {
            props.active = isActive;
            changed = true;
          }
          if (props.selected !== isSelected) {
            props.selected = isSelected;
            changed = true;
          }

          if (changed) {
            w.markDirty();
          }
        }
      }
      for (const c of w.children as Widget[]) {
        traverse(c);
      }
    };
    traverse(root);
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
