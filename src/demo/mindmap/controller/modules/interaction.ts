import { Side } from '../../custom-widget/type';

import type { MindmapController } from '../index';
import type { ViewModule } from './view';
import type { Widget } from '@/core/base';

export const enum ToolbarAction {
  AddAbove = 'addAbove',
  AddBelow = 'addBelow',
  AddChild = 'addChild',
  AddChildLeft = 'addChildLeft',
  AddChildRight = 'addChildRight',
}

export class InteractionModule {
  private controller: MindmapController;
  private view: ViewModule;
  private dragging: {
    widget: Widget;
    startX: number;
    startY: number;
    origDx: number;
    origDy: number;
  } | null = null;
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
  private clickCandidate: { key: string; startX: number; startY: number } | null = null;
  private lastPanTs: number = 0;
  private lastPanX: number = 0;
  private lastPanY: number = 0;
  private selectionRect: { x: number; y: number; width: number; height: number } | null = null;

  constructor(controller: MindmapController, view: ViewModule) {
    this.controller = controller;
    this.view = view;
  }

  attach(): void {
    const raw = this.controller.runtime
      .getRenderer()
      ?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? null;
    const target = canvas ?? this.controller.runtime.getContainer();
    if (!target) {
      return;
    }
    const getWorldXY = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.view.tx) / this.view.scale;
      const y = (e.clientY - rect.top - this.view.ty) / this.view.scale;
      return { x, y };
    };
    const getWorldXYMouse = (e: MouseEvent) => {
      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.view.tx) / this.view.scale;
      const y = (e.clientY - rect.top - this.view.ty) / this.view.scale;
      return { x, y };
    };
    const onDown = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const { x, y } = getWorldXY(e);
      this.pointers.set(e.pointerId, { x, y });
      const toolbarHit = this.hitToolbar(x, y);
      if (toolbarHit) {
        this.handleToolbarAction(toolbarHit);
        return;
      }
      {
        const ctx = this.controller.getPluginContext();
        if (this.controller['eventsModule'].dispatchPointerDown(e, ctx, { x, y })) {
          return;
        }
      }
      if (this.pointers.size === 2) {
        const [aId, bId] = Array.from(this.pointers.keys());
        const a = this.pointers.get(aId)!;
        const b = this.pointers.get(bId)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        this.pinchState = { id1: aId, id2: bId, startD: d, startScale: this.view.scale, cx, cy };
        this.dragging = null;
        this.panState = null;
        this.selectionRect = null;
        return;
      }
      if (e.shiftKey) {
        this.selectionRect = { x, y, width: 0, height: 0 };
        this.controller.viewport.setSelectionRect(this.selectionRect);
        this.view.scheduleRender();
        return;
      }
      const hit = this.view.findNodeAtPoint(this.controller.runtime.getRootWidget(), x, y);
      if (hit) {
        const pos = hit.getAbsolutePosition();
        this.dragging = { widget: hit, startX: x, startY: y, origDx: pos.dx, origDy: pos.dy };
        this.clickCandidate = { key: hit.key, startX: x, startY: y };
        this.panState = null;
      } else {
        this.dragging = null;
        this.panState = { startX: x, startY: y, origTx: this.view.tx, origTy: this.view.ty };
      }
    };
    const onMove = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const { x, y } = getWorldXY(e);
      this.view.updateHover(x, y);
      {
        const ctx = this.controller.getPluginContext();
        if (this.controller['eventsModule'].dispatchPointerMove(e, ctx, { x, y })) {
          return;
        }
      }
      if (this.pinchState) {
        this.pointers.set(e.pointerId, { x, y });
        const a = this.pointers.get(this.pinchState.id1);
        const b = this.pointers.get(this.pinchState.id2);
        if (a && b) {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dNow = Math.hypot(dx, dy);
          const s = this.view.clampScale(
            this.pinchState.startScale * (dNow / this.pinchState.startD),
          );
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;
          this.view.zoomAt(s, cx, cy);
        }
        return;
      }
      if (this.dragging) {
        const dx = x - this.dragging.startX;
        const dy = y - this.dragging.startY;
        const offset = { dx: this.dragging.origDx + dx, dy: this.dragging.origDy + dy };
        this.dragging.widget.renderObject.offset = offset;
        this.view.scheduleRender();
        if (this.clickCandidate) {
          const d = Math.hypot(x - this.clickCandidate.startX, y - this.clickCandidate.startY);
          if (d > 3) {
            this.clickCandidate = null;
          }
        }
        return;
      }
      if (this.panState) {
        const dx = (x - this.panState.startX) * this.view.scale;
        const dy = (y - this.panState.startY) * this.view.scale;
        this.view.setPosition(this.panState.origTx + dx, this.panState.origTy + dy);
        this.lastPanTs = performance.now();
        this.lastPanX = this.view.tx;
        this.lastPanY = this.view.ty;
        return;
      }
      if (this.selectionRect) {
        this.selectionRect.width = x - this.selectionRect.x;
        this.selectionRect.height = y - this.selectionRect.y;
        this.controller.viewport.setSelectionRect(this.selectionRect);
        this.view.scheduleRender();
      }
    };
    const onUp = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      {
        const ctx = this.controller.getPluginContext();
        const world = getWorldXY(e);
        if (this.controller['eventsModule'].dispatchPointerUp(e, ctx, world)) {
          return;
        }
      }
      if (
        this.pinchState &&
        (e.pointerId === this.pinchState.id1 || e.pointerId === this.pinchState.id2)
      ) {
        this.pinchState = null;
      }
      if (this.dragging) {
        this.controller['historyModule'].pushSnapshot();
        this.dragging = null;
      }
      if (this.clickCandidate) {
        this.view.setActiveKey(this.clickCandidate.key);
        this.clickCandidate = null;
      }
      if (this.panState) {
        const endTs = performance.now();
        const dt = Math.max(1, endTs - this.lastPanTs);
        const vx = (this.view.tx - this.lastPanX) / dt;
        const vy = (this.view.ty - this.lastPanY) / dt;
        this.panState = null;
        const speed = Math.hypot(vx, vy);
        if (speed > 0.05) {
          let curVx = vx;
          let curVy = vy;
          const decay = 0.92;
          const step = () => {
            this.view.setPosition(this.view.tx + curVx * 16, this.view.ty + curVy * 16);
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
        const selected = new Set(this.collectKeysInRect(r));
        this.selectionRect = null;
        this.controller.viewport.setSelectionRect(null);
        this.controller.viewport.setSelectedKeys(Array.from(selected));
        this.view.scheduleRender();
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
      {
        const ctx = this.controller.getPluginContext();
        if (this.controller['eventsModule'].dispatchWheel(e, ctx)) {
          return;
        }
      }
      const scaleDelta = e.deltaY < 0 ? 1.06 : 0.94;
      const rect = target.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const s = this.view.clampScale(this.view.scale * scaleDelta);
      const pending = { scale: s, cx, cy };
      requestAnimationFrame(() => {
        this.view.zoomAt(pending.scale, pending.cx, pending.cy);
      });
    };
    const onKey = (e: KeyboardEvent) => {
      {
        const ctx = this.controller.getPluginContext();
        if (this.controller['eventsModule'].dispatchKeyDown(e, ctx)) {
          return;
        }
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (this.controller['historyModule'].hasStructHistory()) {
          this.controller['historyModule'].undoStruct();
        } else {
          this.controller['historyModule'].undo();
        }
      } else if (
        (ctrl && e.key.toLowerCase() === 'y') ||
        (ctrl && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        if (this.controller['historyModule'].hasStructFuture()) {
          this.controller['historyModule'].redoStruct();
        } else {
          this.controller['historyModule'].redo();
        }
      } else if (ctrl && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const editing = this.controller.viewport.editingKey;
        if (editing) {
          return;
        }
        this.controller['crudModule'].deleteSelectionWithUndo();
      } else if (e.key === 'ArrowLeft') {
        this.view.setPosition(this.view.tx + 20, this.view.ty);
      } else if (e.key === 'ArrowRight') {
        this.view.setPosition(this.view.tx - 20, this.view.ty);
      } else if (e.key === 'ArrowUp') {
        this.view.setPosition(this.view.tx, this.view.ty + 20);
      } else if (e.key === 'ArrowDown') {
        this.view.setPosition(this.view.tx, this.view.ty - 20);
      }
    };
    const onDblClick = (e: MouseEvent) => {
      const { x, y } = getWorldXYMouse(e);
      {
        const ctx = this.controller.getPluginContext();
        if (this.controller['eventsModule'].dispatchDblClick(e, ctx, { x, y })) {
          return;
        }
      }
      const hit = this.view.findNodeAtPoint(this.controller.runtime.getRootWidget(), x, y);
      if (hit) {
        this.startEditingNode(hit.key);
      }
    };
    target.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    target.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('dblclick', onDblClick);
  }

  private startEditingNode(key: string): void {
    this.controller.viewport.setEditingKey(key);
    const root = this.controller.runtime.getRootWidget();
    const node = this.view.findByKey(root, key);
    if (!node) {
      return;
    }
    const pos = node.getAbsolutePosition();
    const sz = node.renderObject.size;
    const container = this.controller.runtime.getContainer();
    if (!container) {
      return;
    }
    const input = document.createElement('input');
    input.type = 'text';
    input.value = (node as any).title || '';
    input.style.position = 'absolute';
    input.style.left = `${Math.round(this.view.tx + pos.dx * this.view.scale)}px`;
    input.style.top = `${Math.round(this.view.ty + pos.dy * this.view.scale)}px`;
    input.style.width = `${Math.round(sz.width * this.view.scale)}px`;
    input.style.height = '28px';
    input.style.border = '1px solid #1677ff';
    input.style.borderRadius = '8px';
    input.style.padding = '4px 8px';
    input.style.zIndex = '10000';
    input.style.background = '#ffffff';
    input.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
    container.appendChild(input);
    input.focus();
    input.select();
    const cleanup = () => {
      input.remove();
      this.controller.viewport.setEditingKey(null);
      this.controller.runtime.rerender();
    };
    const confirm = () => {
      const v = input.value;
      (node as any).title = v;
      cleanup();
    };
    const cancel = () => {
      cleanup();
    };
    input.addEventListener('keydown', (ke) => {
      if (ke.key === 'Enter') {
        confirm();
      } else if (ke.key === 'Escape') {
        cancel();
      }
    });
    input.addEventListener('blur', () => {
      confirm();
    });
  }

  private hitToolbar(
    x: number,
    y: number,
  ): {
    type: ToolbarAction;
    key: string;
  } | null {
    const key = this.controller.viewport.activeKey;
    if (!key) {
      return null;
    }
    const node = this.view.findByKey(this.controller.runtime.getRootWidget(), key);
    if (!node) {
      return null;
    }
    const p = node.getAbsolutePosition();
    const s = node.renderObject.size;
    const inside = (rx: number, ry: number, rw: number, rh: number) => {
      const M = 2;
      return x >= rx - M && y >= ry - M && x <= rx + rw + M && y <= ry + rh + M;
    };
    const top = { x: p.dx + s.width / 2 - 10, y: p.dy - 24, w: 20, h: 20 };
    const bottom = { x: p.dx + s.width / 2 - 10, y: p.dy + s.height + 4, w: 20, h: 20 };
    const right = { x: p.dx + s.width + 6, y: p.dy + s.height / 2 - 10, w: 20, h: 20 };
    const left = { x: p.dx - 26, y: p.dy + s.height / 2 - 10, w: 20, h: 20 };
    let showLeft = false;
    let showRight = false;
    const parentContainer = node.parent;
    let hasIncoming = false;
    let parentKey: string | null = null;
    if (parentContainer) {
      for (const c of parentContainer.children) {
        if ((c as any).type === 'Connector') {
          const to = (c as any).toKey as string;
          const from = (c as any).fromKey as string;
          if (to === key) {
            hasIncoming = true;
            parentKey = from;
            break;
          }
        }
      }
    }
    const isRoot = !hasIncoming;
    let parentNode: Widget | null = null;
    if (hasIncoming && parentContainer) {
      for (const c of parentContainer.children) {
        if ((c as any).type === 'MindMapNode' && (c as any).key === parentKey) {
          parentNode = c as Widget;
          break;
        }
      }
    }
    if (!parentNode && parentContainer && (parentContainer as any).type === 'MindMapNode') {
      parentNode = parentContainer as Widget;
    }
    if (isRoot) {
      showLeft = true;
      showRight = true;
    } else if (parentNode) {
      const ppos = parentNode.getAbsolutePosition();
      const pos = node.getAbsolutePosition();
      if (pos.dx < ppos.dx) {
        showLeft = true;
      } else {
        showRight = true;
      }
    }
    if (inside(top.x, top.y, top.w, top.h)) {
      return { type: ToolbarAction.AddAbove, key };
    }
    if (inside(bottom.x, bottom.y, bottom.w, bottom.h)) {
      return { type: ToolbarAction.AddBelow, key };
    }
    if (showRight && inside(right.x, right.y, right.w, right.h)) {
      return { type: ToolbarAction.AddChildRight, key };
    }
    if (showLeft && inside(left.x, left.y, left.w, left.h)) {
      return { type: ToolbarAction.AddChildLeft, key };
    }
    return null;
  }

  private handleToolbarAction(hit: { type: ToolbarAction; key: string }): void {
    if (hit.type === ToolbarAction.AddAbove) {
      this.controller['crudModule'].addSibling(hit.key, -1);
    } else if (hit.type === ToolbarAction.AddBelow) {
      this.controller['crudModule'].addSibling(hit.key, 1);
    } else if (hit.type === ToolbarAction.AddChild) {
      this.controller['crudModule'].addChild(hit.key);
    } else if (hit.type === ToolbarAction.AddChildLeft) {
      this.controller['crudModule'].addChildSide(hit.key, Side.Left);
    } else if (hit.type === ToolbarAction.AddChildRight) {
      this.controller['crudModule'].addChildSide(hit.key, Side.Right);
    }
  }

  private normalizeRect(r: { x: number; y: number; width: number; height: number }) {
    const x = r.width >= 0 ? r.x : r.x + r.width;
    const y = r.height >= 0 ? r.y : r.y + r.height;
    const w = Math.abs(r.width);
    const h = Math.abs(r.height);
    return { x, y, width: w, height: h };
  }

  private collectKeysInRect(r: { x: number; y: number; width: number; height: number }): string[] {
    const out: string[] = [];
    const root = this.controller.runtime.getRootWidget();
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
}
