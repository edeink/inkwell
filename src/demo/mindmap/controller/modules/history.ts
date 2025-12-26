import { CustomComponentType } from '../../type';
import { Connector } from '../../widgets/connector';

import type { MindmapController } from '../index';
import type { Widget } from '@/core/base';

import { findWidget } from '@/core/helper/widget-selector';

/**
 * 撤销/重做历史模块
 * 管理位置快照与结构变更的历史栈，提供撤销/重做与批量删除的能力。
 */
export class HistoryModule {
  private controller: MindmapController;
  private history: Array<Record<string, { dx: number; dy: number }>> = [];
  private future: Array<Record<string, { dx: number; dy: number }>> = [];
  private structHistory: Array<{
    ops: Array<{ parent: Widget; index: number; widget: Widget }>;
    activeKeyBefore: string | null;
  }> = [];
  private structFuture: Array<{
    ops: Array<{ parent: Widget; index: number; widget: Widget }>;
    activeKeyBefore: string | null;
  }> = [];

  constructor(controller: MindmapController) {
    this.controller = controller;
  }

  hasStructHistory(): boolean {
    return this.structHistory.length > 0;
  }

  hasStructFuture(): boolean {
    return this.structFuture.length > 0;
  }

  pushSnapshot(): void {
    this.history.push(this.snapshotPositions());
    this.future = [];
  }

  undo(): void {
    if (this.history.length === 0) {
      return;
    }
    const last = this.history.pop()!;
    this.future.push(this.snapshotPositions());
    this.applyPositions(last);
    this.controller.runtime.rerender();
  }

  redo(): void {
    if (this.future.length === 0) {
      return;
    }
    const next = this.future.pop()!;
    this.history.push(this.snapshotPositions());
    this.applyPositions(next);
    this.controller.runtime.rerender();
  }

  undoStruct(): void {
    if (this.structHistory.length === 0) {
      return;
    }
    const last = this.structHistory.pop()!;
    this.structFuture.push({
      ops: last.ops,
      activeKeyBefore: this.controller.viewport.activeKey ?? null,
    });
    this.applyStructuralInsertOps(last.ops);
    this.controller.viewport.setActiveKey(last.activeKeyBefore);
    this.controller.runtime.rerender();
  }

  redoStruct(): void {
    if (this.structFuture.length === 0) {
      return;
    }
    const next = this.structFuture.pop()!;
    this.structHistory.push({
      ops: next.ops,
      activeKeyBefore: this.controller.viewport.activeKey ?? null,
    });
    this.applyStructuralDeleteOps(next.ops);
    this.controller.viewport.setActiveKey(null);
    this.controller.runtime.rerender();
  }

  deleteWithUndo(ops: Array<{ parent: Widget; index: number; widget: Widget }>): void {
    if (!ops.length) {
      return;
    }
    const activeBefore = this.controller.viewport.activeKey ?? null;
    this.applyStructuralDeleteOps(ops);
    this.structHistory.push({ ops, activeKeyBefore: activeBefore });
    this.structFuture = [];
    this.controller.viewport.setActiveKey(null);
    this.controller.viewport.setSelectedKeys([]);
    this.controller.runtime.rerender();
  }

  collectDeletionOpsNestedMode(
    key: string,
  ): Array<{ parent: Widget; index: number; widget: Widget }> {
    const root = this.controller.runtime.getRootWidget();
    const parent = this.findParentOfKey(root, key);
    const node = findWidget(root, `#${key}`) as Widget | null;
    if (!parent || !node) {
      return [];
    }
    const idx = parent.children.findIndex((c) => c === node);
    if (idx < 0) {
      return [];
    }
    return [{ parent, index: idx, widget: node }];
  }

  collectDeletionOpsConnectorMode(
    layout: Widget,
    key: string,
  ): Array<{ parent: Widget; index: number; widget: Widget }> {
    const childrenMap = new Map<string, string[]>();
    for (const c of layout.children) {
      if (c instanceof Connector) {
        const from = c.fromKey as string;
        const to = c.toKey as string;
        const arr = childrenMap.get(from) || [];
        arr.push(to);
        childrenMap.set(from, arr);
      }
    }
    const toDelete = new Set<string>();
    const dfs = (k: string) => {
      toDelete.add(k);
      const arr = childrenMap.get(k) || [];
      for (const c of arr) {
        if (!toDelete.has(c)) {
          dfs(c);
        }
      }
    };
    dfs(key);
    const ops: Array<{ parent: Widget; index: number; widget: Widget }> = [];
    for (let i = 0; i < layout.children.length; i++) {
      const ch = layout.children[i];
      if (
        (ch.type === CustomComponentType.MindMapNode ||
          ch.type === CustomComponentType.MindMapNodeToolbar) &&
        toDelete.has(ch.key)
      ) {
        ops.push({ parent: layout, index: i, widget: ch });
      } else if (ch instanceof Connector) {
        const from = ch.fromKey as string;
        const to = ch.toKey as string;
        if (toDelete.has(from) || toDelete.has(to)) {
          ops.push({ parent: layout, index: i, widget: ch });
        }
      }
    }
    return ops;
  }

  private snapshotPositions(): Record<string, { dx: number; dy: number }> {
    const m: Record<string, { dx: number; dy: number }> = {};
    const root = this.controller.runtime.getRootWidget();
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

  private applyPositions(map: Record<string, { dx: number; dy: number }>): void {
    const root = this.controller.runtime.getRootWidget();
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

  private applyStructuralDeleteOps(
    ops: Array<{ parent: Widget; index: number; widget: Widget }>,
  ): void {
    const delMap = new Map<Widget, number[]>();
    for (const op of ops) {
      const arr = delMap.get(op.parent) || [];
      arr.push(op.index);
      delMap.set(op.parent, arr);
    }
    for (const [parent, arr] of delMap) {
      arr.sort((a, b) => b - a);
      for (const idx of arr) {
        if (idx >= 0 && idx < parent.children.length) {
          parent.children.splice(idx, 1);
        }
      }
    }
  }

  private applyStructuralInsertOps(
    ops: Array<{ parent: Widget; index: number; widget: Widget }>,
  ): void {
    const insMap = new Map<Widget, Array<{ index: number; widget: Widget }>>();
    for (const op of ops) {
      const arr = insMap.get(op.parent) || [];
      arr.push({ index: op.index, widget: op.widget });
      insMap.set(op.parent, arr);
    }
    for (const [parent, arr] of insMap) {
      arr.sort((a, b) => a.index - b.index);
      for (const it of arr) {
        it.widget.parent = parent;
        parent.children.splice(it.index, 0, it.widget);
      }
    }
  }

  private findParentOfKey(widget: Widget | null, key: string): Widget | null {
    if (!widget) {
      return null;
    }
    for (const c of widget.children) {
      if (c.key === key) {
        return widget;
      }
      const r = this.findParentOfKey(c, key);
      if (r) {
        return r;
      }
    }
    return null;
  }
}
