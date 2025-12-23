import { Widget } from '../base';

import type { BoxConstraints, Size, WidgetCompactProps, WidgetProps } from '../base';

import { compileElement, type AnyElement } from '@/utils/compiler/jsx-compiler';

export abstract class StatelessWidget<
  TData extends WidgetProps = WidgetProps,
> extends Widget<TData> {
  protected abstract render(): AnyElement;

  protected computeNextChildrenData(): WidgetProps[] {
    const childrenData = compileElement(this.render());
    return [childrenData];
  }

  createElement(data: TData): Widget<TData> {
    // 无状态组件在创建时直接渲染并编译子节点
    this.props = { ...data, children: data.children ?? [] } as unknown as WidgetCompactProps;
    const childrenData = compileElement(this.render());
    super.createElement({ ...data, children: [childrenData] });
    this._dirty = false;
    return this;
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const w = childrenSizes.length > 0 ? childrenSizes[0].width : 0;
    const h = childrenSizes.length > 0 ? childrenSizes[0].height : 0;
    return { width: Math.min(w, constraints.maxWidth), height: Math.min(h, constraints.maxHeight) };
  }
}
