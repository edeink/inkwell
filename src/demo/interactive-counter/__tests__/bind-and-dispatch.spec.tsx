/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { InteractiveCounterDemo } from '../widgets/interactive-counter-demo';

import { EventRegistry } from '@/core/events';
import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';

describe('Stateful Template 事件绑定', () => {
  it('Container onClick 通过 JSON 绑定后应注册到指定运行时', async () => {
    // 创建容器
    const container = document.createElement('div');
    container.id = 'test-canvas';
    document.body.appendChild(container);

    // 1. 创建 Runtime
    const runtime = await Runtime.create('test-canvas', { renderer: 'canvas2d' });

    // 2. 实例化模板
    const root = new InteractiveCounterDemo({ type: 'InteractiveCounterDemo' });
    root.createElement(root.data);
    const btn = findWidget(root as any, '#counter-btn') as any;
    const handlers = EventRegistry.getHandlers(String(btn.key), 'click');
    expect(handlers.length).toBeGreaterThan(0);
  });
});
