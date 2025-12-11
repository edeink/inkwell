import { StatelessWidget } from './stateless';

import type { WidgetData } from '../base';

// 有状态组件：以泛型 S 提供类型安全的状态集合
export abstract class StatefulWidget<
  TData extends WidgetData = WidgetData,
  S extends Record<string, unknown> = Record<string, unknown>,
> extends StatelessWidget<TData> {
  constructor(data: TData) {
    super(data);
  }

  public setState(partial: Partial<S>): void {
    const prev = this.state as S;
    const next = { ...prev, ...partial } as S;
    if (!this.shouldComponentUpdate(next, prev)) {
      return;
    }
    this.state = next;
    // 状态更新后触发增量重建
    this.scheduleUpdate();
  }

  protected shouldComponentUpdate(next: S, prev: S): boolean {
    const ka = Object.keys(next);
    const kb = Object.keys(prev);
    if (ka.length !== kb.length) {
      return true;
    }
    for (const k of ka) {
      if ((next as Record<string, unknown>)[k] !== (prev as Record<string, unknown>)[k]) {
        return true;
      }
    }
    return false;
  }

  protected scheduleUpdate(): void {
    super.scheduleUpdate();
  }
}
