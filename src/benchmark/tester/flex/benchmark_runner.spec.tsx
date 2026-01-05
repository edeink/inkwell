/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, describe, it, vi } from 'vitest';

import Runtime from '../../../runtime';

import { createFlexDomNodes } from './dom';
import { buildFlexWidgetScene, updateFlexWidgetScene } from './widget';

import { testLogger } from '@/utils/test-logger';

describe('Flex 性能基准测试运行器', () => {
  let container: HTMLElement;
  let runtime: Runtime;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeAll(async () => {
    // Mock Canvas getContext
    HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
      if (contextId === '2d') {
        return {
          clearRect: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          scale: vi.fn(),
          translate: vi.fn(),
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          measureText: vi.fn(() => ({ width: 0 })),
          fillText: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
        } as unknown as CanvasRenderingContext2D;
      }
      return null;
    }) as any;

    // 设置容器
    container = document.createElement('div');
    container.id = 'benchmark-stage';
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    // 创建运行时
    runtime = await Runtime.create('benchmark-stage', { renderer: 'canvas2d' });
  });

  afterAll(() => {
    if (runtime) {
      runtime.destroy();
    }
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('运行性能基准测试', async () => {
    const counts = [100, 1000, 5000];

    testLogger.log('--- Flex 基准测试结果 ---');
    testLogger.log('数量  | 类型   | 构建 (ms)  | 布局 (ms)   | 绘制 (ms)  | 总计 (ms)');
    testLogger.log('------|--------|------------|-------------|------------|-----------');

    for (const count of counts) {
      // DOM 基准测试
      const domTimings = await createFlexDomNodes(container, count);
      const domTotal = domTimings.buildMs + domTimings.layoutMs + domTimings.paintMs;
      testLogger.log(
        `${count.toString().padEnd(5)} | DOM    | ${domTimings.buildMs.toFixed(2).padEnd(10)} | ${domTimings.layoutMs.toFixed(2).padEnd(11)} | ${domTimings.paintMs.toFixed(2).padEnd(10)} | ${domTotal.toFixed(2)}`,
      );

      // 清理 DOM
      while (container && container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Widget 基准测试
      // 我们需要确保运行时容器已清理/重置
      // Runtime.create 通常会挂载到元素上。
      // buildFlexWidgetScene 使用 runtime.container

      const widgetTimings = await buildFlexWidgetScene(container, runtime, count);
      const widgetTotal = widgetTimings.buildMs + widgetTimings.layoutMs + widgetTimings.paintMs;
      testLogger.log(
        `${count.toString().padEnd(5)} | Widget | ${widgetTimings.buildMs.toFixed(2).padEnd(10)} | ${widgetTimings.layoutMs.toFixed(2).padEnd(11)} | ${widgetTimings.paintMs.toFixed(2).padEnd(10)} | ${widgetTotal.toFixed(2)}`,
      );

      // Widget 更新基准测试
      const updateTimings = await updateFlexWidgetScene(container, runtime, count);
      const updateTotal = updateTimings.buildMs + updateTimings.layoutMs + updateTimings.paintMs;
      testLogger.log(
        `${count.toString().padEnd(5)} | Update | ${updateTimings.buildMs.toFixed(2).padEnd(10)} | ${updateTimings.layoutMs.toFixed(2).padEnd(11)} | ${updateTimings.paintMs.toFixed(2).padEnd(10)} | ${updateTotal.toFixed(2)}`,
      );
    }
    testLogger.log('------------------------------');
  }, 30000);
});
