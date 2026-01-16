/** @jsxImportSource @/utils/compiler */
import { Container, StatefulWidget, Text, Wrap, type WidgetProps } from '../../../core';
import Runtime from '../../../runtime';
import { measureNextPaint, type Timings } from '../../metrics/collector';
import { BENCHMARK_CONFIG } from '../../utils/config';
import { getThemeColor } from '../../utils/theme';

interface StateTextBenchmarkProps extends WidgetProps {
  count: number;
  width: number;
  height: number;
  side: number;
  gap: number;
  textColor: string;
}

interface StateTextBenchmarkState {
  selectedIndices: Set<number>;
  [key: string]: unknown;
}

class StateTextBenchmarkWidget extends StatefulWidget<
  StateTextBenchmarkProps,
  StateTextBenchmarkState
> {
  state: StateTextBenchmarkState = {
    selectedIndices: new Set(),
  };

  updateSelection(indices: Set<number>) {
    this.setState({ selectedIndices: indices });
  }

  render() {
    const { count, width, height, side, gap, textColor } = this.props;
    const { selectedIndices } = this.state;

    return (
      <Container width={width} height={height}>
        <Wrap spacing={gap} runSpacing={gap}>
          {Array.from({ length: count }).map((_, i) => (
            <Container key={String(i)} width={side} height={side} color="#ccc" alignment="center">
              <Text
                text={selectedIndices.has(i) ? 'B' : 'A'}
                style={{ fontSize: 12, color: textColor }}
              />
            </Container>
          ))}
        </Wrap>
      </Container>
    );
  }
}

export async function buildStateTextWidgetScene(
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

  const textColor = getThemeColor('--ink-demo-text-primary');

  const tBuild0 = performance.now();

  const element = (
    <StateTextBenchmarkWidget
      key="root"
      count={count}
      width={w}
      height={h}
      side={side}
      gap={GAP}
      textColor={textColor}
    />
  );

  const tBuild1 = performance.now();
  runtime.render(element);

  const paintMs = await measureNextPaint();

  const rootWidget = runtime.getRootWidget() as StateTextBenchmarkWidget;
  const frames = BENCHMARK_CONFIG.STATE.FRAMES;
  const BATCH_SIZE = BENCHMARK_CONFIG.STATE.BATCH_SIZE;

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

      rootWidget.updateSelection(nextIndices);

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
