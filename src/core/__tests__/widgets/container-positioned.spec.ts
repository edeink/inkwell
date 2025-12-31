import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Canvas2DRenderer } from '../../../renderer/canvas2d/canvas-2d-renderer';
import { Container } from '../../container';
import { Positioned } from '../../positioned';

import type { BoxConstraints } from '../../base';

describe('Container 在 Positioned 中的布局行为', () => {
  let renderer: Canvas2DRenderer;

  beforeEach(() => {
    renderer = new Canvas2DRenderer();
    // 模拟 ctx
    (renderer as any).ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      rect: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      fillText: vi.fn(),
    } as any;
  });

  it('Container 应该继承 Positioned 的紧约束尺寸', () => {
    // 场景：Positioned 指定了 width/height，内部 Container 未指定
    // 期望：Container 填满 Positioned

    const container = new Container({
      type: 'Container',
      color: 'red',
    });

    const positioned = new Positioned({
      type: 'Positioned',
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      child: container as any,
    });

    // 模拟 Stack 的布局过程
    // Stack 给予 Positioned 宽松约束
    const stackConstraints: BoxConstraints = {
      minWidth: 0,
      maxWidth: 500,
      minHeight: 0,
      maxHeight: 500,
    };

    // Positioned.layout 会调用 performLayout
    // 但在测试中我们更关注 getConstraintsForChild 的行为
    // 因为这决定了传递给 Container 的约束

    // 模拟 Positioned 的 layout 过程
    const pConstraints = positioned['getConstraintsForChild'](stackConstraints, 0);

    // 验证传递给 child 的约束是紧约束
    expect(pConstraints.minWidth).toBe(100);
    expect(pConstraints.maxWidth).toBe(100);
    expect(pConstraints.minHeight).toBe(100);
    expect(pConstraints.maxHeight).toBe(100);

    // 2. Container 布局
    // Container 接收到紧约束
    const cSize = container['performLayout'](pConstraints, []);

    // 验证 Container 尺寸
    expect(cSize.width).toBe(100);
    expect(cSize.height).toBe(100);
  });

  it('Container 应该在紧约束下正确处理 padding', () => {
    // 场景：Positioned 指定尺寸，Container 有 padding
    // 期望：Container 尺寸为 Positioned 尺寸，内容区域减小

    const container = new Container({
      type: 'Container',
      padding: { left: 10, right: 10, top: 10, bottom: 10 },
      child: new Container({ type: 'Container', color: 'blue' }) as any, // 子组件
    });

    const positioned = new Positioned({
      type: 'Positioned',
      width: 100,
      height: 100,
      child: container as any,
    });

    const stackConstraints: BoxConstraints = {
      minWidth: 0,
      maxWidth: 500,
      minHeight: 0,
      maxHeight: 500,
    };

    // 获取传递给 Container 的约束
    const pConstraints = positioned['getConstraintsForChild'](stackConstraints, 0);

    // 验证约束
    expect(pConstraints.minWidth).toBe(100);
    expect(pConstraints.maxWidth).toBe(100);

    // 获取 Container 传递给其子组件的约束
    // Container 需要先被实例化

    const cChildConstraints = container['getConstraintsForChild'](pConstraints);

    // 验证传递给内部子组件的约束（减去 padding）
    // 100 - 10(left) - 10(right) = 80
    expect(cChildConstraints.minWidth).toBe(80);
    expect(cChildConstraints.maxWidth).toBe(80);
    expect(cChildConstraints.minHeight).toBe(80);
    expect(cChildConstraints.maxHeight).toBe(80);
  });

  it('当 Positioned 未指定尺寸时，Container 应根据自身或内容决定尺寸', () => {
    // 场景：Positioned 只有 left/top，没有 width/height
    // Container 指定了 width/height

    const container = new Container({
      type: 'Container',
      width: 50,
      height: 50,
    });

    const positioned = new Positioned({
      type: 'Positioned',
      left: 10,
      top: 10,
      child: container as any,
    });

    const stackConstraints: BoxConstraints = {
      minWidth: 0,
      maxWidth: 500,
      minHeight: 0,
      maxHeight: 500,
    };

    // Positioned 传递给 child 的约束应该是宽松的（0-500）
    const pConstraints = positioned['getConstraintsForChild'](stackConstraints, 0);

    expect(pConstraints.minWidth).toBe(0);
    expect(pConstraints.maxWidth).toBe(500);

    // Container 布局
    const cSize = container['performLayout'](pConstraints, []);

    expect(cSize.width).toBe(50);
    expect(cSize.height).toBe(50);
  });
});
