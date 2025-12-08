/** @jsxImportSource @/utils/compiler */
import { afterEach, describe, expect, it } from 'vitest';

import { Container, Text } from '@/core';
import { Widget, createBoxConstraints } from '@/core/base';
import { EventRegistry, dispatchToTree } from '@/core/events';
import '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function createRuntimeTag(id: string): any {
  return { id } as any;
}

function buildTreeWithRuntime(rt: any) {
  const el = (
    <Container key="root" width={200} height={200}>
      <Container key="inner" width={120} height={120}>
        <Text key="leaf" text="Hello" fontSize={16} />
      </Container>
    </Container>
  );
  EventRegistry.setCurrentRuntime(rt);
  const data = compileElement(el);
  EventRegistry.setCurrentRuntime(null);
  const root = Widget.createWidget(data)!;
  root.layout(createBoxConstraints());
  const inner = root.children[0];
  const leaf = inner.children[0];
  return { root, inner, leaf };
}

afterEach(() => {
  EventRegistry.clearAll();
});

describe('事件处理器按 canvas 实例隔离', () => {
  it('不同实例的 handlers 互不影响', () => {
    const rtA = createRuntimeTag('A');
    const rtB = createRuntimeTag('B');
    const key = 'K';
    const type = 'click';
    const a = { called: 0 };
    const b = { called: 0 };
    EventRegistry.register(
      key,
      type,
      () => {
        a.called++;
      },
      { capture: false },
      rtA,
    );
    EventRegistry.register(
      key,
      type,
      () => {
        b.called++;
      },
      { capture: false },
      rtB,
    );
    const listA = EventRegistry.getHandlers(key, type, rtA);
    const listB = EventRegistry.getHandlers(key, type, rtB);
    expect(listA.length).toBe(1);
    expect(listB.length).toBe(1);
  });

  it('单个实例下 handlers 正常触发', () => {
    const rtA = createRuntimeTag('A');
    const { root, leaf } = buildTreeWithRuntime(rtA);
    EventRegistry.setCurrentRuntime(rtA);
    let calls = 0;
    EventRegistry.register(String(leaf.key), 'click', () => {
      calls++;
    });
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toBe(1);
  });

  it('移除实例后清理其 handlers', () => {
    const rtA = createRuntimeTag('A');
    const rtB = createRuntimeTag('B');
    const key = 'K2';
    const type = 'click';
    EventRegistry.register(key, type, () => {}, { capture: false }, rtA);
    EventRegistry.register(key, type, () => {}, { capture: false }, rtB);
    EventRegistry.clearRuntime(rtA);
    const listA = EventRegistry.getHandlers(key, type, rtA);
    const listB = EventRegistry.getHandlers(key, type, rtB);
    expect(listA.length).toBe(0);
    expect(listB.length).toBe(1);
  });
});
