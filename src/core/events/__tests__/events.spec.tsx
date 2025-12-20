/** @jsxImportSource @/utils/compiler */
import { afterEach, describe, expect, it } from 'vitest';

import { Container, Text } from '@/core';
import { createBoxConstraints } from '@/core/base';
import { EventRegistry, dispatchToTree } from '@/core/events';
import '@/core/registry';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function buildTree(
  props: {
    root?: Record<string, unknown>;
    inner?: Record<string, unknown>;
    leaf?: Record<string, unknown>;
  } = {},
) {
  const el = (
    <Container key="root" width={200} height={200} {...(props.root || {})}>
      <Container key="inner" width={120} height={120} {...(props.inner || {})}>
        <Text key="leaf" text="Hello" fontSize={16} {...(props.leaf || {})} />
      </Container>
    </Container>
  );
  const data = compileElement(el);
  const root = WidgetRegistry.createWidget(data)!;
  root.createElement(data);
  root.layout(createBoxConstraints());
  const inner = root.children[0];
  const leaf = inner.children[0];
  return { root, inner, leaf };
}

afterEach(() => {
  EventRegistry.clearAll();
});

describe('事件系统（JSX）', () => {
  it('基本点击事件冒泡：子→父顺序', () => {
    // 准备：仅注册冒泡阶段处理函数
    const calls: string[] = [];
    const { root, leaf } = buildTree({
      root: { onClick: () => calls.push('root') },
      inner: { onClick: () => calls.push('inner') },
      leaf: { onClick: () => calls.push('leaf') },
    });
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['leaf', 'inner', 'root']);
  });

  it('事件捕获阶段处理：捕获→目标→冒泡完整顺序', () => {
    // 准备：同时注册捕获与冒泡阶段处理函数
    const calls: string[] = [];
    const { root, leaf } = buildTree({
      root: {
        onClickCapture: () => calls.push('capture:root'),
        onClick: () => calls.push('bubble:root'),
      },
      inner: {
        onClickCapture: () => calls.push('capture:inner'),
        onClick: () => calls.push('bubble:inner'),
      },
      leaf: {
        onClickCapture: () => calls.push('target-capture:leaf'),
        onClick: () => calls.push('target-bubble:leaf'),
      },
    });
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual([
      'capture:root',
      'capture:inner',
      'target-capture:leaf',
      'target-bubble:leaf',
      'bubble:inner',
      'bubble:root',
    ]);
  });

  it('stopPropagation() 的效果：阻止向祖先冒泡', () => {
    // 在中间节点的冒泡阶段中调用 stopPropagation()
    const calls: string[] = [];
    const { root, leaf } = buildTree({
      root: { onClick: () => calls.push('root') },
      inner: {
        onClick: (e: { stopPropagation: () => void }) => {
          calls.push('inner');
          e.stopPropagation();
        },
      },
      leaf: { onClick: () => calls.push('leaf') },
    });
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['leaf', 'inner']);
  });

  it('preventDefault() 等价设计：返回 false 终止传播（捕获阶段）', () => {
    // 在根节点捕获阶段返回 false，终止后续阶段
    const calls: string[] = [];
    const { root, leaf } = buildTree({
      root: { onClickCapture: () => (calls.push('capture:root'), false) },
      inner: {
        onClickCapture: () => calls.push('capture:inner'),
        onClick: () => calls.push('bubble:inner'),
      },
      leaf: {
        onClickCapture: () => calls.push('target-capture:leaf'),
        onClick: () => calls.push('target-bubble:leaf'),
      },
    });
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['capture:root']);
  });

  it('preventDefault() 等价设计：返回 false 阻止向父级冒泡（目标阶段）', () => {
    // 在中间节点目标冒泡阶段返回 false，阻止继续向上
    const calls: string[] = [];
    const { root, leaf } = buildTree({
      root: { onClick: () => calls.push('root') },
      inner: { onClick: () => (calls.push('inner'), false) },
      leaf: { onClick: () => calls.push('leaf') },
    });
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['leaf', 'inner']);
  });

  it('多层级嵌套中的事件传递顺序（PointerDown）', () => {
    // 三层结构：root → inner → leaf，验证 pointerdown 捕获/冒泡顺序
    const calls: string[] = [];
    const { root, leaf } = buildTree({
      root: {
        onPointerDownCapture: () => calls.push('capture:root'),
        onPointerDown: () => calls.push('bubble:root'),
      },
      inner: {
        onPointerDownCapture: () => calls.push('capture:inner'),
        onPointerDown: () => calls.push('bubble:inner'),
      },
      leaf: {
        onPointerDownCapture: () => calls.push('target-capture:leaf'),
        onPointerDown: () => calls.push('target-bubble:leaf'),
      },
    });
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'pointerdown', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual([
      'capture:root',
      'capture:inner',
      'target-capture:leaf',
      'target-bubble:leaf',
      'bubble:inner',
      'bubble:root',
    ]);
  });

  it('父子组件间的事件传递：子触发，父在捕获与冒泡均收到', () => {
    // 子节点触发 mouseover，父节点在捕获和冒泡阶段都能收到
    const calls: string[] = [];
    const { root, leaf } = buildTree({
      root: {
        onMouseOverCapture: () => calls.push('capture:root'),
        onMouseOver: () => calls.push('bubble:root'),
      },
      inner: {},
      leaf: { onMouseOver: () => calls.push('leaf') },
    });
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'mouseover', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['capture:root', 'leaf', 'bubble:root']);
  });

  it('负向用例：事件类型不匹配时不触发处理', () => {
    // 仅注册 mousemove 处理，派发 click 应无调用
    const calls: string[] = [];
    const { root, leaf } = buildTree({
      root: { onMouseMove: () => calls.push('root') },
      inner: { onMouseMove: () => calls.push('inner') },
      leaf: { onMouseMove: () => calls.push('leaf') },
    });
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual([]);
  });
});
