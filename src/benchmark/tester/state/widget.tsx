/** @jsxImportSource @/utils/compiler */
import { Container, StatefulWidget, Wrap, type WidgetProps } from '../../../core';
import Runtime from '../../../runtime';
import { measureNextPaint, type Timings } from '../../metrics/collector';
import { BENCHMARK_CONFIG } from '../../utils/config';

interface StateBenchmarkProps extends WidgetProps {
  count: number;
  width: number;
  height: number;
  side: number;
  gap: number;
}

interface StateBenchmarkState {
  selectedIndices: Set<number>;
  [key: string]: unknown;
}

class StateBenchmarkWidget extends StatefulWidget<StateBenchmarkProps, StateBenchmarkState> {
  state: StateBenchmarkState = {
    selectedIndices: new Set(),
  };

  updateSelection(indices: Set<number>) {
    this.setState({ selectedIndices: indices });
  }

  render() {
    const { count, width, height, side, gap } = this.props;
    const { selectedIndices } = this.state;

    return (
      <Container width={width} height={height} color="#fff">
        {/* 
          Wrap 组件模拟 DOM 的 flex-wrap: wrap
          spacing/runSpacing 设置为 2px 以匹配 DOM 的 margin: 1px 产生的间距
        */}
        <Wrap spacing={gap} runSpacing={gap}>
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
  }
}

export async function buildStateWidgetScene(
  stageEl: HTMLElement,
  runtime: Runtime,
  count: number,
): Promise<Timings> {
  const w = stageEl.clientWidth || 800;
  const h = stageEl.clientHeight || 600;

  // 1. 自适应布局算法 (与 DOM 版本保持一致)
  // 确保在不同屏幕尺寸下表现一致
  const minW = BENCHMARK_CONFIG.STATE.MIN_WIDTH;
  const minH = BENCHMARK_CONFIG.STATE.MIN_HEIGHT;
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

  const element = (
    <StateBenchmarkWidget key="root" count={count} width={w} height={h} side={side} gap={GAP} />
  );

  const tBuild1 = performance.now();
  // 初始渲染：无选中
  runtime.render(element);

  const paintMs = await measureNextPaint();

  const rootWidget = runtime.getRootWidget() as StateBenchmarkWidget;

  // 状态更新循环
  const frames = BENCHMARK_CONFIG.STATE.FRAMES;
  const BATCH_SIZE = BENCHMARK_CONFIG.STATE.BATCH_SIZE; // 批量更新节点数量

  // 辅助函数：执行批量更新并监控性能
  // 使用 setState 触发组件更新
  const performBatchUpdate = (indices: Set<number>) => {
    try {
      if (rootWidget) {
        rootWidget.updateSelection(indices);
      }
    } catch (e) {
      console.error('Update failed', e);
    }
  };

  await new Promise<void>((resolve) => {
    let f = 0;
    const loop = () => {
      if (f >= frames) {
        resolve();
        return;
      }

      // 生成批量随机索引
      const nextIndices = new Set<number>();
      for (let k = 0; k < BATCH_SIZE; k++) {
        nextIndices.add(Math.floor(Math.random() * count));
      }

      performBatchUpdate(nextIndices);

      f++;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  return {
    buildMs: tBuild1 - tBuild0,
    layoutMs: 0,
    paintMs,
  };
}
