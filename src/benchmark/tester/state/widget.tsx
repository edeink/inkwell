/** @jsxImportSource @/utils/compiler */
import { Container, Wrap } from '../../../core';
import Runtime from '../../../runtime';
import { measureNextPaint, type Timings } from '../../metrics/collector';

export async function buildStateWidgetScene(
  stageEl: HTMLElement,
  runtime: Runtime,
  count: number,
): Promise<Timings> {
  const w = stageEl.clientWidth || 800;
  const h = stageEl.clientHeight || 600;

  // 1. 自适应布局算法 (与 DOM 版本保持一致)
  // 确保在不同屏幕尺寸下表现一致
  const minW = 300;
  const minH = 200;
  const effW = Math.max(w, minW);
  const effH = Math.max(h, minH);

  // 2. 动态内容缩放逻辑
  // 确保当内容超出时，自动缩小方块大小以适应容器
  const MIN_ITEM_SIZE = 4;
  const MARGIN = 1;
  const GAP = MARGIN * 2; // DOM margin: 1px 导致间距为 2px

  // 计算最佳边长：(side + GAP)^2 * count <= effW * effH
  // 保持缩放算法和阈值与 DOM 版本一致
  let side = Math.floor(Math.sqrt((effW * effH) / count)) - GAP;

  // 3. 智能分页/滚动策略
  // 最小尺寸阈值限制
  if (side < MIN_ITEM_SIZE) {
    side = MIN_ITEM_SIZE;
  }

  const tBuild0 = performance.now();

  // 渲染函数：接收选中索引集合，全量重新构建 Widget 树
  // 框架需要 Diff 出只有部分节点发生了变化
  const renderTree = (selectedIndices: Set<number>) => (
    <Container width={w} height={h} color="#fff">
      {/* 
        Wrap 组件模拟 DOM 的 flex-wrap: wrap
        spacing/runSpacing 设置为 2px 以匹配 DOM 的 margin: 1px 产生的间距
      */}
      <Wrap spacing={GAP} runSpacing={GAP}>
        {Array.from({ length: count }).map((_, i) => (
          <Container
            key={String(i)}
            width={side}
            height={side}
            color={selectedIndices.has(i) ? 'red' : '#ccc'}
          />
        ))}
      </Wrap>
    </Container>
  );

  const tBuild1 = performance.now();
  // 初始渲染：无选中
  runtime.render(renderTree(new Set()));

  const paintMs = await measureNextPaint();

  // 状态更新循环
  const frames = 100;
  const BATCH_SIZE = 20; // 批量更新节点数量

  // 辅助函数：执行批量更新并监控性能
  // 包含原子性保障（一次 render）和简单的回滚模拟
  const performBatchUpdate = (indices: Set<number>) => {
    const start = performance.now();
    try {
      // 原子性：一次 render 调用更新整个树的状态
      runtime.render(renderTree(indices));
      const end = performance.now();
      // 性能监控：记录更新耗时 (可选: 发送给分析服务)
      // console.log(`Batch update of ${indices.size} nodes took ${end - start}ms`);
    } catch (e) {
      console.error('Update failed, rolling back to empty state', e);
      // 回滚机制：恢复到安全状态 (此处简化为清空选中)
      runtime.render(renderTree(new Set()));
    }
  };

  for (let f = 0; f < frames; f++) {
    // 生成批量随机索引
    const nextIndices = new Set<number>();
    for (let k = 0; k < BATCH_SIZE; k++) {
      nextIndices.add(Math.floor(Math.random() * count));
    }

    performBatchUpdate(nextIndices);

    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  return {
    buildMs: tBuild1 - tBuild0,
    layoutMs: 0,
    paintMs,
  };
}
