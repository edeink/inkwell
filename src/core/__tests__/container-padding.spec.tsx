import { describe, expect, it } from 'vitest';

import { Container, type ContainerProps } from '../container';
import { type PaddingArray } from '../padding';

describe('Container Padding/Margin Array Support', () => {
  it('应支持 padding 为数组类型', () => {
    const props: ContainerProps = {
      type: 'Container',
      padding: [10, 20], // [vertical, horizontal]
    };
    const container = new Container(props);
    expect(container.padding).toEqual({ top: 10, right: 20, bottom: 10, left: 20 });
  });

  it('应支持 margin 为数组类型', () => {
    const props: ContainerProps = {
      type: 'Container',
      margin: [5, 15, 25, 35], // [top, right, bottom, left]
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
});
