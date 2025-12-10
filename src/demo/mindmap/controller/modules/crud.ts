import { CustomComponentType, Side } from '../../custom-widget/type';

import { HistoryModule } from './history';
import { LayoutModule } from './layout';
import { moveNode as moveImpl } from './move';

import type { MindmapController } from '../index';
import type { Widget } from '@/core/base';

import { Widget as WidgetCtor } from '@/core/base';

export class CrudModule {
  private controller: MindmapController;
  private history: HistoryModule;
  private layout: LayoutModule;

  constructor(controller: MindmapController, history: HistoryModule, layout: LayoutModule) {
    this.controller = controller;
    this.history = history;
    this.layout = layout;
  }
  addSibling(key: string, dir: -1 | 1): void {
    const layout = this.getLayout();
    if (!layout) {
      return;
    }
    const inConnectorMode = layout.children.some((c) => c.type === CustomComponentType.Connector);
    const newKey = this.generateKey('n');
    const data = { type: CustomComponentType.MindMapNode, key: newKey, title: '新节点' } as any;
    const node = WidgetCtor.createWidget(data);
    if (!node) {
      return;
    }
    if (!inConnectorMode) {
      const parent = this.findParentOfKey(this.controller.runtime.getRootWidget(), key);
      if (!parent) {
        return;
      }
      node.parent = parent;
      const childNodeIndices: number[] = [];
      for (let i = 0; i < parent.children.length; i++) {
        if (parent.children[i].type === CustomComponentType.MindMapNode) {
          childNodeIndices.push(i);
        }
      }
      const idxInNodeList = childNodeIndices.findIndex((i) => parent.children[i].key === key);
      if (idxInNodeList < 0) {
        return;
      }
      const refChildIndex = childNodeIndices[idxInNodeList];
      const insertAt = dir > 0 ? refChildIndex + 1 : refChildIndex;
      parent.children.splice(insertAt, 0, node);
    } else {
      node.parent = layout;
      const nodes = this.listNodeChildren(layout);
      const idx = nodes.findIndex((n) => n.key === key);
      if (idx < 0) {
        return;
      }
      let insertPos = 0;
      let count = 0;
      for (let i = 0; i < layout.children.length; i++) {
        if (layout.children[i].type === CustomComponentType.MindMapNode) {
          if (count === idx) {
            insertPos = i + (dir > 0 ? 1 : 0);
            break;
          }
          count++;
        }
      }
      layout.children.splice(insertPos, 0, node);
      const parentKey = this.findParentKeyFor(layout, key) ?? 'root';
      const connData = {
        type: CustomComponentType.Connector,
        key: this.generateKey('e'),
        fromKey: parentKey,
        toKey: newKey,
      } as any;
      const conn = WidgetCtor.createWidget(connData);
      if (conn) {
        conn.parent = layout;
        layout.children.push(conn);
      }
      this.layout.markAffected([parentKey]);
    }
    this.controller.runtime.rerender();
    this.controller.runtime.rebuild();
  }

  addChild(key: string): void {
    const layout = this.getLayout();
    if (!layout) {
      return;
    }
    const newKey = this.generateKey('n');
    const data = { type: CustomComponentType.MindMapNode, key: newKey, title: '新节点' } as any;
    const node = WidgetCtor.createWidget(data);
    if (!node) {
      return;
    }
    const inConnectorMode = layout.children.some((c) => c.type === CustomComponentType.Connector);
    if (!inConnectorMode) {
      const parentNode = this.findByKey(this.controller.runtime.getRootWidget(), key);
      if (!parentNode) {
        return;
      }
      node.parent = parentNode;
      parentNode.children.push(node);
    } else {
      node.parent = layout;
      const insertPos = layout.children.length;
      layout.children.splice(insertPos, 0, node);
      const connData = {
        type: CustomComponentType.Connector,
        key: this.generateKey('e'),
        fromKey: key,
        toKey: newKey,
      } as any;
      const conn = WidgetCtor.createWidget(connData);
      if (conn) {
        conn.parent = layout;
        layout.children.push(conn);
      }
      this.layout.markAffected([key]);
    }
    this.controller.runtime.rebuild();
  }

  addChildSide(key: string, side: Side): void {
    const layout = this.getLayout();
    if (!layout) {
      return;
    }
    const newKey = this.generateKey('n');
    const data = {
      type: CustomComponentType.MindMapNode,
      key: newKey,
      title: '新节点',
      prefSide: side,
    } as any;
    const node = WidgetCtor.createWidget(data);
    if (!node) {
      return;
    }
    const inConnectorMode = layout.children.some((c) => c.type === CustomComponentType.Connector);
    if (!inConnectorMode) {
      const parentNode = this.findByKey(this.controller.runtime.getRootWidget(), key);
      if (!parentNode) {
        return;
      }
      node.parent = parentNode;
      parentNode.children.push(node);
    } else {
      node.parent = layout;
      layout.children.splice(layout.children.length, 0, node);
      const conn = WidgetCtor.createWidget({
        type: CustomComponentType.Connector,
        key: this.generateKey('e'),
        fromKey: key,
        toKey: newKey,
      } as any);
      if (conn) {
        conn.parent = layout;
        layout.children.push(conn);
      }
      this.layout.markAffected([key]);
    }
    this.controller.runtime.rebuild();
  }

  moveNode(key: string, dx: number, dy: number): void {
    moveImpl(this.controller, key, dx, dy);
  }

  deleteSelectionWithUndo(): void {
    const layout = this.getLayout();
    if (!layout) {
      return;
    }
    const keys: string[] = [];
    const active = (this.controller as any)['activeKey'] as string | null;
    if (active) {
      keys.push(active);
    } else if (
      Array.isArray(this.controller.viewport.selectedKeys) &&
      this.controller.viewport.selectedKeys.length
    ) {
      keys.push(...this.controller.viewport.selectedKeys);
    }
    if (!keys.length) {
      return;
    }
    const inConnectorMode = layout.children.some((c) => c.type === CustomComponentType.Connector);
    const ops: Array<{ parent: Widget; index: number; widget: Widget }> = [];
    const seen = new Set<string>();
    const affectedParents = new Set<string>();
    for (const k of keys) {
      if (seen.has(k)) {
        continue;
      }
      const part = inConnectorMode
        ? this.history.collectDeletionOpsConnectorMode(layout, k)
        : this.history.collectDeletionOpsNestedMode(k);
      for (const op of part) {
        ops.push(op);
        seen.add(op.widget.key);
      }
      if (inConnectorMode) {
        const p = this.findParentKeyFor(layout, k);
        if (p) {
          affectedParents.add(p);
        }
      }
    }
    this.history.deleteWithUndo(ops);
    if (affectedParents.size) {
      this.layout.markAffected(Array.from(affectedParents));
    }
  }

  private getLayout(): Widget | null {
    const root = this.controller.runtime.getRootWidget();
    if (!root) {
      return null;
    }
    const stack: Widget[] = [...root.children];
    while (stack.length) {
      const cur = stack.shift()!;
      if (cur.type === CustomComponentType.MindMapLayout) {
        return cur;
      }
      for (const ch of cur.children) {
        stack.push(ch);
      }
    }
    return null;
  }

  private listNodeChildren(layout: Widget): Widget[] {
    const out: Widget[] = [];
    for (const c of layout.children) {
      if (c.type === CustomComponentType.MindMapNode) {
        out.push(c);
      }
    }
    return out;
  }

  private findParentKeyFor(layout: Widget, childKey: string): string | null {
    let parent: string | null = null;
    for (const c of layout.children) {
      if (c.type === CustomComponentType.Connector) {
        const from = (c as any).fromKey as string;
        const to = (c as any).toKey as string;
        if (to === childKey) {
          parent = from;
          break;
        }
      }
    }
    return parent;
  }

  private findByKey(widget: Widget | null, key: string): Widget | null {
    if (!widget) {
      return null;
    }
    if (widget.key === key) {
      return widget;
    }
    for (const c of widget.children) {
      const r = this.findByKey(c, key);
      if (r) {
        return r;
      }
    }
    return null;
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

  private generateKey(prefix: string = 'node'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
