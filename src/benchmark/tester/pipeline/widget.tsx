/** @jsxImportSource @/utils/compiler */
import { Container, Positioned, SizedBox, Stack } from '../../../core';
import Runtime from '../../../runtime';
import { measureNextPaint, type Timings } from '../../metrics/collector';
import { BENCHMARK_CONFIG } from '../../utils/config';

export async function buildPipelineWidgetScene(
  stageEl: HTMLElement,
  runtime: Runtime,
  count: number,
  frames: number = BENCHMARK_CONFIG.PIPELINE.FRAMES,
): Promise<Timings> {
  const w = stageEl.clientWidth || 800;
  const h = stageEl.clientHeight || 600;

  const tBuild0 = performance.now();

  // 渲染帧生成函数
  const renderFrame = (time: number) => (
    <SizedBox width={w} height={h}>
      <Stack>
        {Array.from({ length: count }).map((_, i) => {
          const x = (Math.sin(time + i * 0.05) * 0.4 + 0.5) * (w - 10);
          const y = (Math.cos(time + i * 0.07) * 0.4 + 0.5) * (h - 10);

          return (
            <Positioned key={`p-${i}`} left={x} top={y}>
              <Container
                key={`c-${i}`}
                width={6}
                height={6}
                color={i % 2 ? '#ff0055' : '#00ccff'}
                borderRadius={3}
              />
            </Positioned>
          );
        })}
      </Stack>
    </SizedBox>
  );

  const tBuild1 = performance.now();
  runtime.render(renderFrame(0));

  const paintMs = await measureNextPaint();

  // 执行动画循环以测试渲染管线吞吐量
  const startTime = performance.now();

  await new Promise<void>((resolve) => {
    let f = 0;
    const loop = () => {
      if (f >= frames) {
        resolve();
        return;
      }
      const time = (performance.now() - startTime) / 1000;
      runtime.render(renderFrame(time));

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
