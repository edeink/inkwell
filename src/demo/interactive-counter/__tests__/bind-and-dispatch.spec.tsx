/** @jsxImportSource @/utils/compiler */
import { afterEach, describe, expect, it } from 'vitest';

import { InteractiveCounterDemo } from '../app';

import { EventRegistry } from '@/core/events';
import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';

describe('Stateful Template 事件绑定', () => {
  let runtime: Runtime | null = null;
  let container: HTMLElement | null = null;

  afterEach(() => {
    if (runtime) {
      runtime.destroy();
      runtime = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it('Container onClick 通过 JSON 绑定后应注册到指定运行时', async () => {
    // 创建容器
    container = document.createElement('div');
    container.id = 'test-canvas';
    document.body.appendChild(container);

    // 1. 创建 Runtime
    runtime = await Runtime.create('test-canvas', { renderer: 'canvas2d' });

    // 2. 实例化模板
    const root = new InteractiveCounterDemo({
      theme: Themes.light,
    });
    // 必须绑定 runtime，否则事件绑定会因为没有 runtime 而跳过注册
    (root as any)._runtime = runtime;

    root.createElement(root.data);
    // 由于 ClassButton 修复了双重触发问题，Container 不再绑定 onClick
    // 这里检查 ClassButton (key="class-btn") 是否绑定了事件
    const btn = findWidget(root as any, '#class-btn') as any;
    const handlers = EventRegistry.getHandlers(String(btn.eventKey), 'click', runtime);
    expect(handlers.length).toBeGreaterThan(0);
  });
});
