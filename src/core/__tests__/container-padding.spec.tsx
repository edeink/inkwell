import { describe, expect, it } from 'vitest';

import { Widget } from '../base';
import { Container, type ContainerProps } from '../container';
import { WidgetRegistry } from '../registry';
import { Text } from '../text';

import '@/core/registry';

describe('Container Padding/Margin 数组支持', () => {
  it('应支持 padding 为数组类型', () => {
    const props: ContainerProps = {
      type: 'Container',
      padding: [10, 20], // [垂直, 水平]
    };
    const container = new Container(props);
    expect(container.padding).toEqual({ top: 10, right: 20, bottom: 10, left: 20 });
  });

  it('应支持 margin 为数组类型', () => {
    const props: ContainerProps = {
      type: 'Container',
      margin: [5, 15, 25, 35], // [上, 右, 下, 左]
    };
    const container = new Container(props);
    expect(container.margin).toEqual({ top: 5, right: 15, bottom: 25, left: 35 });
  });

  it('应支持 padding 和 margin 混合类型', () => {
    const props: ContainerProps = {
      type: 'Container',
      padding: 10,
      margin: [20],
    };
    const container = new Container(props);
    expect(container.padding).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
    expect(container.margin).toEqual({ top: 20, right: 20, bottom: 20, left: 20 });
  });

  it('createElement 更新时应正确处理数组类型', () => {
    const container = new Container({ type: 'Container', padding: [10] });
    expect(container.padding).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });

    container.createElement({ type: 'Container', padding: [10, 20, 30] });
    expect(container.padding).toEqual({ top: 10, right: 20, bottom: 30, left: 20 });
  });

  it('对象池复用时不应残留旧 padding/margin', () => {
    WidgetRegistry.registerType('Container', Container);
    WidgetRegistry.registerType('Text', Text);
    Widget._pool.delete('Container');

    const root = new Container({
      type: 'Container',
      children: [
        {
          type: 'Container',
          key: 'c1',
          padding: 10,
          margin: [1, 2, 3, 4],
        },
      ],
    } as any);
    root.createElement(root.data as any);

    const c1 = root.children[0] as any;
    expect(c1.padding).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
    expect(c1.margin).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });

    root.createElement({
      type: 'Container',
      children: [{ type: 'Text', key: 't1', text: 'x' }],
    } as any);
    root.createElement({
      type: 'Container',
      children: [{ type: 'Container', key: 'c2' }],
    } as any);

    const c2 = root.children[0] as any;
    expect(c2).toBe(c1);
    expect(c2.padding).toBeUndefined();
    expect(c2.margin).toBeUndefined();

    root.dispose();
    Widget._pool.delete('Container');
  });
});
