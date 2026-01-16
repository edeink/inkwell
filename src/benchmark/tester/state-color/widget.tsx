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
      <Container width={width} height={height}>
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

  const minW = BENCHMARK_CONFIG.STATE.MIN_WIDTH;
  const minH = BENCHMARK_CONFIG.STATE.MIN_HEIGHT;
  const effW = Math.max(w, minW);
  const effH = Math.max(h, minH);

  const MIN_ITEM_SIZE = 4;
  const MARGIN = 1;
  const GAP = MARGIN * 2;

  let side = Math.floor(Math.sqrt((effW * effH) / count)) - GAP;

  if (side < MIN_ITEM_SIZE) {
    side = MIN_ITEM_SIZE;
  }

  const tBuild0 = performance.now();

  const element = (
    <StateBenchmarkWidget key="root" count={count} width={w} height={h} side={side} gap={GAP} />
  );

  const tBuild1 = performance.now();
  runtime.render(element);

  const paintMs = await measureNextPaint();

  const rootWidget = runtime.getRootWidget() as StateBenchmarkWidget;
  const frames = BENCHMARK_CONFIG.STATE.FRAMES;
  const BATCH_SIZE = BENCHMARK_CONFIG.STATE.BATCH_SIZE;

  const performBatchUpdate = (indices: Set<number>) => {
    try {
      if (rootWidget) {
        rootWidget.updateSelection(indices);
      }
    } catch (e) {
      console.error('更新失败', e);
    }
  };

  await new Promise<void>((resolve) => {
    let f = 0;
    const loop = () => {
      if (f >= frames) {
        resolve();
        return;
      }

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
