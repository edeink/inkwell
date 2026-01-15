/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Container, Positioned, Stack } from '@/core';
import { createBoxConstraints } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { StatelessWidget } from '@/core/state/stateless';
import { compileElement } from '@/utils/compiler/jsx-compiler';

import '@/core/registry';

class PositionedWrapper extends StatelessWidget<{
  left: number;
  top: number;
  width: number;
  height: number;
}> {
  protected render() {
    const { left, top, width, height } = this.props;
    return (
      <Positioned left={left} top={top} width={width} height={height}>
        <Container />
      </Positioned>
    );
  }
}

describe('Stack Positioned 穿透布局', () => {
  it('应支持 Stack -> StatelessWidget(render) -> Positioned 等价布局', () => {
    const jsx = (
      <Stack>
        <Container width={80} height={80} />
        <PositionedWrapper left={10} top={20} width={30} height={40} />
      </Stack>
    );
    const json = compileElement(jsx);
    const root = WidgetRegistry.createWidget(json)!;
    root.createElement(json);

    const constraints = createBoxConstraints({
      minWidth: 0,
      maxWidth: Infinity,
      minHeight: 0,
      maxHeight: Infinity,
    });
    root.layout(constraints);

    expect(root.renderObject.size.width).toBe(80);
    expect(root.renderObject.size.height).toBe(80);

    const wrapper = root.children[1] as unknown as PositionedWrapper;
    expect(wrapper.renderObject.offset).toEqual({ dx: 10, dy: 20 });
  });

  it('穿透组件应与直接 Positioned 的 offset 一致', () => {
    const jsx = (
      <Stack>
        <Positioned left={10} top={20} width={30} height={40}>
          <Container />
        </Positioned>
        <PositionedWrapper left={10} top={20} width={30} height={40} />
      </Stack>
    );
    const json = compileElement(jsx);
    const root = WidgetRegistry.createWidget(json)!;
    root.createElement(json);

    const constraints = createBoxConstraints({
      minWidth: 0,
      maxWidth: 200,
      minHeight: 0,
      maxHeight: 200,
    });
    root.layout(constraints);

    const direct = root.children[0] as Positioned;
    const wrapper = root.children[1] as unknown as PositionedWrapper;
    expect(direct.renderObject.offset).toEqual(wrapper.renderObject.offset);
  });
});
