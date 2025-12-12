import { type WidgetData } from '../base';

import { StatelessWidget } from './stateless';

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
    if (
      !this.shouldComponentUpdate(
        next as unknown as Record<string, unknown>,
        prev as unknown as Record<string, unknown>,
      )
    ) {
      return;
    }
    this.state = next;
    const children = super.compileChildrenFromRender();
    this.props = { ...(this.props as TData), children } as TData;
    this.data = this.props as TData;
    this.buildChildren(children);
    this.markNeedsLayout();
    this.scheduleUpdate();
  }
}
