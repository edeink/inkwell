/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, describe, it } from 'vitest';

import Runtime from '../../../runtime';

import { createFlexDomNodes } from './dom';
import { buildFlexWidgetScene, updateFlexWidgetScene } from './widget';

describe('Flex 性能基准测试运行器', () => {
  let container: HTMLElement;
  let runtime: Runtime;

  beforeAll(async () => {
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
    runtime.destroy();
    document.body.removeChild(container);
  });

  it('运行性能基准测试', async () => {
    const counts = [100, 1000, 5000];

    console.log('--- Flex 基准测试结果 ---');
    console.log('数量  | 类型   | 构建 (ms)  | 布局 (ms)   | 绘制 (ms)  | 总计 (ms)');
    console.log('------|--------|------------|-------------|------------|-----------');

    for (const count of counts) {
      // DOM 基准测试
      const domTimings = await createFlexDomNodes(container, count);
      const domTotal = domTimings.buildMs + domTimings.layoutMs + domTimings.paintMs;
      console.log(
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
      console.log(
        `${count.toString().padEnd(5)} | Widget | ${widgetTimings.buildMs.toFixed(2).padEnd(10)} | ${widgetTimings.layoutMs.toFixed(2).padEnd(11)} | ${widgetTimings.paintMs.toFixed(2).padEnd(10)} | ${widgetTotal.toFixed(2)}`,
      );

      // Widget 更新基准测试
      const updateTimings = await updateFlexWidgetScene(container, runtime, count);
      const updateTotal = updateTimings.buildMs + updateTimings.layoutMs + updateTimings.paintMs;
      console.log(
        `${count.toString().padEnd(5)} | Update | ${updateTimings.buildMs.toFixed(2).padEnd(10)} | ${updateTimings.layoutMs.toFixed(2).padEnd(11)} | ${updateTimings.paintMs.toFixed(2).padEnd(10)} | ${updateTotal.toFixed(2)}`,
      );
    }
    console.log('------------------------------');
  }, 30000);
});
