import { type WidgetProps } from '../base';

import { StatelessWidget } from './stateless';

// 有状态组件：以泛型 S 提供类型安全的状态集合
export abstract class StatefulWidget<
  TData extends WidgetProps = WidgetProps,
  S extends Record<string, unknown> = Record<string, unknown>,
> extends StatelessWidget<TData> {
  protected state: S = {} as S;
  private _lastStateSnapshot: S | null = null;

  public setState(partial: Partial<S>): void {
    const prev = this.state;
    const next = {
      ...(prev as Record<string, unknown>),
      ...(partial as Record<string, unknown>),
    } as S;
    this._lastStateSnapshot = prev;
    this.state = next;
    this.markDirty();
  }

  protected didStateChange(): boolean {
    const prev = (this._lastStateSnapshot ?? this.state) as Record<string, unknown>;
    const cur = this.state as Record<string, unknown>;
    return this.shallowDiff(prev, cur);
  }
}
