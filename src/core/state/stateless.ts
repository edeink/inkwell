import { Widget } from '../base';

import type { BoxConstraints, BuildContext, Size, WidgetData } from '../base';

import { EventRegistry } from '@/core/events/registry';
import Runtime from '@/runtime';
import { compileElement } from '@/utils/compiler/jsx-compiler';

export abstract class StatelessWidget<TData extends WidgetData = WidgetData> extends Widget<TData> {
  protected abstract render(): unknown;

  createElement(data: TData): Widget<TData> {
    const next = data;
    const children = this.compileChildrenFromRender();
    const nextWithChildren =
      children.length > 0
        ? ({ ...(next as unknown as WidgetData), children } as unknown as TData)
        : next;
    const changed = this.shouldWidgetUpdate(
      nextWithChildren as unknown as TData,
      this.state as Record<string, unknown>,
    );
    super.createElement(nextWithChildren);
    if (changed) {
      this.scheduleUpdate();
    }
    return this;
  }

  protected shallowEqual(a: WidgetData, b: WidgetData): boolean {
    const ka = Object.keys(a).filter((k) => k !== 'children');
    const kb = Object.keys(b).filter((k) => k !== 'children');
    if (ka.length !== kb.length) {
      return false;
    }
    for (const k of ka) {
      if (a[k] !== b[k]) {
        return false;
      }
    }
    return true;
  }

  protected scheduleUpdate(): void {
    const rt = this.resolveRuntime();
    if (rt) {
      try {
        // 绑定在根节点上的运行时将负责触发增量重建
        rt.tick([this]);
        return;
      } catch {}
    }
    let p = this.parent;
    while (p) {
      const fn = (p as unknown as { requestRender?: unknown }).requestRender;
      if (typeof fn === 'function') {
        try {
          fn.call(p);
        } catch {}
        break;
      }
      p = p.parent;
    }
  }

  protected resolveRuntime(): Runtime | null {
    // 自下而上查找树根并匹配已注册的画布与运行时
    const findRoot = (self: Widget): Widget | null => {
      let cur: Widget | null = self;
      while (cur && cur.parent) {
        cur = cur.parent;
      }
      return cur;
    };
    const root = findRoot(this);
    const rt0 = (root?.__runtime ?? null) as Runtime | null;
    if (rt0) {
      return rt0;
    }
    for (const rec of Runtime.listCanvas()) {
      const rt = rec.runtime;
      try {
        if (rt.getRootWidget() === root) {
          return rt;
        }
      } catch {}
    }
    return null;
  }

  protected compileChildrenFromRender(): WidgetData[] {
    const r = (this as unknown as { render?: () => unknown }).render;
    if (typeof r !== 'function') {
      return [];
    }
    const rt = this.resolveRuntime();
    EventRegistry.setCurrentRuntime(rt);
    const el = r.call(this);
    const json = compileElement(el as any);
    EventRegistry.setCurrentRuntime(null);
    return [json as unknown as WidgetData];
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    return Widget.createWidget(childData);
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const w = childrenSizes.length > 0 ? childrenSizes[0].width : 0;
    const h = childrenSizes.length > 0 ? childrenSizes[0].height : 0;
    return { width: Math.min(w, constraints.maxWidth), height: Math.min(h, constraints.maxHeight) };
  }

  protected paintSelf(_context: BuildContext): void {}

  protected shouldComponentUpdate(
    next: Record<string, unknown>,
    prev: Record<string, unknown>,
  ): boolean {
    const ka = Object.keys(next);
    const kb = Object.keys(prev);
    if (ka.length !== kb.length) {
      return true;
    }
    for (const k of ka) {
      if (next[k] !== prev[k]) {
        return true;
      }
    }
    return false;
  }
}
