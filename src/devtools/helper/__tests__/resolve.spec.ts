/**
 * resolveHitWidget 工具函数测试
 *
 * 验证命中节点向上回溯与 overlay 分支支持。
 * 注意事项：使用模拟 Widget 树。
 * 潜在副作用：无。
 */
import { describe, expect, it } from 'vitest';

import { resolveHitWidget } from '../resolve';

import type { Widget } from '@/core/base';

function createMockWidget(key: string, children: any[] = []): Widget {
  const w = {
    key,
    type: 'Mock',
    children,
    parent: null,
    data: {},
  } as unknown as Widget;
  children.forEach((c) => {
    c.parent = w;
  });
  return w;
}

describe('resolveHitWidget', () => {
  it('命中节点在树中可达时应直接返回命中节点', () => {
    const child = createMockWidget('child');
    const root = createMockWidget('root', [child]);

    const result = resolveHitWidget(root, child);
    expect(result).toBe(child);
  });

  it('命中节点不可达但父节点可达时应返回父节点', () => {
    const parent = createMockWidget('parent');
    const root = createMockWidget('root', [parent]);

    const hiddenChild = createMockWidget('hidden');
    hiddenChild.parent = parent;

    const result = resolveHitWidget(root, hiddenChild);
    expect(result).toBe(parent);
  });

  it('应支持向上回溯多层父节点直到找到可达节点', () => {
    const valid = createMockWidget('valid');
    const root = createMockWidget('root', [valid]);

    const hidden1 = createMockWidget('h1');
    hidden1.parent = valid;
    const hidden2 = createMockWidget('h2');
    hidden2.parent = hidden1;

    const result = resolveHitWidget(root, hidden2);
    expect(result).toBe(valid);
  });

  it('overlayRoot 可达时应支持返回 overlay 树内节点', () => {
    const overlayChild = createMockWidget('overlay-child');
    const overlayRoot = createMockWidget('overlay-root', [overlayChild]);
    const root = createMockWidget('root');

    const result = resolveHitWidget(root, overlayChild, overlayRoot);
    expect(result).toBe(overlayChild);
  });

  it('整条父链都不可达时应回退到原始命中节点', () => {
    const root = createMockWidget('root');
    const detached = createMockWidget('detached');

    const result = resolveHitWidget(root, detached);
    expect(result).toBe(detached);
  });

  it('应支持空输入', () => {
    const root = createMockWidget('root');
    expect(resolveHitWidget(root, null)).toBe(null);
  });
});
