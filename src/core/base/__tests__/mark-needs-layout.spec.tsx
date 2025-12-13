/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import type Runtime from '@/runtime';

import { Container } from '@/core';
import { Widget, createBoxConstraints } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function buildSimpleTree(): { root: Widget; inner: Widget } {
  const el = (
    <Container key="root" width={200} height={200}>
      <Container key="inner" width={120} height={120} />
    </Container>
  );
  const data = compileElement(el);
  const root = WidgetRegistry.createWidget(data)!;
  root.layout(createBoxConstraints());
  const inner = root.children[0];
  return { root, inner };
}

function attachFakeRuntime(root: Widget, onRebuild: () => void): { runtime: Runtime } {
  const runtime = {
    rebuild: vi.fn(() => onRebuild()),
    tick: vi.fn(() => runtime.rebuild()),
  } as unknown as Runtime;
  root.__runtime = runtime;
  return { runtime };
}

describe('markNeedsLayout 基本与传播', () => {
  it('单节点标记后在下一帧触发布局', async () => {
    const { root, inner } = buildSimpleTree();
    const calls: { rebuild: number } = { rebuild: 0 };
    const { runtime } = attachFakeRuntime(root, () => {
      calls.rebuild++;
    });
    inner.markNeedsLayout();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 1));
    expect(runtime.rebuild.mock.calls.length).toBe(1);
    expect(calls.rebuild).toBe(1);
  });

  it('向上递归标记父节点', () => {
    const { root, inner } = buildSimpleTree();
    root.__runtime = { tick: () => void 0 };
    inner.markNeedsLayout();
    expect((inner as unknown as { _needsLayout: boolean })._needsLayout).toBe(true);
    expect((root as unknown as { _needsLayout: boolean })._needsLayout).toBe(true);
  });

  it('并发多次调用仅调度一次', async () => {
    const { root, inner } = buildSimpleTree();
    const { runtime } = attachFakeRuntime(root, () => void 0);
    inner.markNeedsLayout();
    inner.markNeedsLayout();
    inner.markNeedsLayout();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 1));
    expect(runtime.rebuild.mock.calls.length).toBe(1);
  });
});
