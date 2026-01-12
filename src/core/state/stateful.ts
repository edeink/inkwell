import { Widget, type WidgetCompactProps, type WidgetProps } from '../base';

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

    // 优化：如果 partial 为空或无变化，直接返回
    if (!partial || Object.keys(partial).length === 0) {
      return;
    }

    const next = {
      ...(prev as Record<string, unknown>),
      ...(partial as Record<string, unknown>),
    } as S;

    // 简单检查是否真的变化（浅比较）
    let changed = false;
    for (const key in partial) {
      if (partial[key] !== prev[key]) {
        changed = true;
        break;
      }
    }

    if (!changed) {
      return;
    }

    this._lastStateSnapshot = prev;
    this.state = next;
    this.markDirty();
  }

  createElement(data: TData): Widget<TData> {
    // 如果组件已经挂载（非首次创建），我们需要在 render 之前处理属性更新
    // 这样 didUpdateWidget 可以根据新属性更新 state，从而影响 render 结果
    if (this._isBuilt) {
      const oldProps = this.props as unknown as TData;
      // 预先更新 props，以便 didUpdateWidget 可以访问新属性
      this.props = {
        ...data,
        children: data.children ?? [],
      } as unknown as WidgetCompactProps<TData>;

      // 调用生命周期方法
      // 注意：BaseWidget.createElement 也会调用一次 didUpdateWidget
      // 但我们需要在 render 之前调用它，所以这里会重复调用
      // 只要 didUpdateWidget 实现是幂等的（通常是比较 props），这就不是问题
      this.didUpdateWidget(oldProps);
      // 优化：标记已处理 didUpdateWidget，防止 Widget.createElement 再次调用
      this._suppressDidUpdateWidget = true;
    }

    return super.createElement(data);
  }

  protected didStateChange(): boolean {
    const prev = (this._lastStateSnapshot ?? this.state) as Record<string, unknown>;
    const cur = this.state as Record<string, unknown>;
    return this.shallowDiff(prev, cur);
  }
}
