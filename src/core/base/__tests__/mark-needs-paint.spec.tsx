/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Widget } from '@/core/base';
import { PipelineOwner } from '@/core/pipeline/owner';

class TestWidget extends Widget {
  updateLayer(): void {
    return;
  }
}

function buildTree(): { root: TestWidget; child: TestWidget } {
  const root = new TestWidget({});
  const child = new TestWidget({});
  root.children = [child];
  child.parent = root;
  root.depth = 0;
  child.depth = 1;
  return { root, child };
}

describe('markNeedsPaint 与 RepaintBoundary 传播规则', () => {
  it('当节点是 RepaintBoundary 时，不向父链冒泡', () => {
    const owner = new PipelineOwner();
    const { root, child } = buildTree();

    child.isRepaintBoundary = true;
    child.owner = owner;

    (root as any)._needsPaint = false;
    (child as any)._needsPaint = false;

    child.markNeedsPaint();

    expect((child as any)._needsPaint).toBe(true);
    expect((root as any)._needsPaint).toBe(false);
    expect(owner.isScheduledForPaint(child)).toBe(true);
  });

  it('当节点不是 RepaintBoundary 时，继续向上传播', () => {
    const { root, child } = buildTree();

    child.isRepaintBoundary = false;

    (root as any)._needsPaint = false;
    (child as any)._needsPaint = false;

    child.markNeedsPaint();

    expect((child as any)._needsPaint).toBe(true);
    expect((root as any)._needsPaint).toBe(true);
  });
});
