import { Widget } from '../base';

import type { WidgetData } from '../base';

import Runtime from '@/runtime';

export abstract class StatelessWidget<TData extends WidgetData = WidgetData> extends Widget<TData> {
  private _prevData: TData | null = null;

  createElement(data: TData): Widget<TData> {
    const prev = (this._prevData ?? this.data) as TData;
    const next = data;
    const changed = !this.shallowEqual(prev, next);
    super.createElement(data);
    this._prevData = next;
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
    const rt = this.findRuntime();
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

  private findRuntime(): Runtime | null {
    // 自下而上查找树根并匹配已注册的画布与运行时
    const findRoot = (self: Widget): Widget | null => {
      let cur: Widget | null = self;
      while (cur && cur.parent) {
        cur = cur.parent;
      }
      return cur;
    };
    const root = findRoot(this);
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
}
