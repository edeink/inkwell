import { describe, expect, it } from 'vitest';

import { Widget } from '../base';
import { registerWidget } from '../registry';

import { getMetricsReport, resetMetrics } from '@/utils/perf';

class PerfItem extends Widget {
  paintSelf() {}
}
registerWidget('PerfItem', PerfItem);

describe('性能优化', () => {
  it('性能测试：buildChildren 与 对象池复用', () => {
    resetMetrics();

    const root = new PerfItem({ type: 'PerfItem', key: 'root' });
    const count = 5000;
    const childrenData: any[] = [];
    for (let i = 0; i < count; i++) {
      childrenData.push({ type: 'PerfItem', key: i });
    }

    // 首次构建
    const start = performance.now();
    root.createElement({ type: 'PerfItem', key: 'root', children: childrenData });
    const firstBuild = performance.now() - start;
    console.log(`首次构建 (${count} items): ${firstBuild.toFixed(2)}ms`);

    // 更新：完全复用
    const updateStart = performance.now();
    root.createElement({ type: 'PerfItem', key: 'root', children: [...childrenData] });
    const updateTime = performance.now() - updateStart;
    console.log(`完全复用更新 (${count} items): ${updateTime.toFixed(2)}ms`);

    // 更新：部分复用 (删除一半，新增一半)
    const partialData = childrenData.slice(0, count / 2);
    for (let i = 0; i < count / 2; i++) {
      partialData.push({ type: 'PerfItem', key: `new-${i}` });
    }
    const partialStart = performance.now();
    root.createElement({ type: 'PerfItem', key: 'root', children: partialData });
    const partialTime = performance.now() - partialStart;
    console.log(`部分更新 (${count} items): ${partialTime.toFixed(2)}ms`);

    // 再次完全构建 (触发对象池回收后的复用?)
    // buildChildren 逻辑会销毁未使用的节点。
    // 在 "部分更新" 中，我们移除了 count/2 个节点。它们应该在对象池中。
    // 现在如果我们把它们加回来：
    const fullStart = performance.now();
    root.createElement({ type: 'PerfItem', key: 'root', children: childrenData }); // 重新添加原始 keys
    const fullTime = performance.now() - fullStart;
    console.log(`从对象池恢复 (${count} items): ${fullTime.toFixed(2)}ms`);

    console.log('--- 性能监控报告 ---');
    console.log(getMetricsReport());

    const allowed = Math.max(firstBuild * 2, firstBuild + 5);
    expect(updateTime).toBeLessThan(allowed);
  });
});
