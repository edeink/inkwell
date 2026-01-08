/** @jsxImportSource @/utils/compiler */
import { Container, Positioned, Stack, Wrap } from '../../../core';
import Runtime from '../../../runtime';
import { measureNextPaint, type Timings } from '../../metrics/collector';

export async function buildLayoutWidgetScene(
  stageEl: HTMLElement,
  runtime: Runtime,
  count: number,
): Promise<Timings> {
  const w = stageEl.clientWidth || 800;
  const h = stageEl.clientHeight || 600;

  const DEPTH = 20;
  const chains = Math.ceil(count / DEPTH);

  const tBuild0 = performance.now();

  // 递归构建函数，模拟组件树深度嵌套
  const buildChain = (depth: number, color: string, key: string) => {
    if (depth <= 0) {
      // 叶子节点：尝试设置大尺寸（100x100），但会被父容器约束
      // DOM 对应：width: 100%; height: 100%;
      return <Container key={key} width={100} height={100} color={color} />;
    }

    // 交替使用 Container (Flex模拟) 和 Stack (Positioned)
    if (depth % 2 === 0) {
      // 偶数层级：模拟 DOM 的 Flex 容器 (display: flex)
      // DOM: padding: 1px; justify-content: center; align-items: center;
      // Widget: 使用 Container 设置 padding。
      // 注意：DOM 中子节点是 absolute 的 (Odd节点)，或者是 100% 尺寸的 (Leaf)。
      // 移除 Center 组件，确保 Stack (Odd节点) 能正确填充父容器空间。
      // 如果使用 Center，Stack 在无非定位子节点时可能会塌缩导致无法显示或不居中。
      return (
        <Container key={key} padding={1}>
          {buildChain(depth - 1, color, `${key}-c`)}
        </Container>
      );
    } else {
      // 奇数层级：模拟 DOM 的 Absolute 容器 (position: absolute)
      // DOM: position: absolute; top/left/right/bottom: 1px;
      // Widget: 使用 Stack + Positioned 模拟绝对定位和拉伸效果。
      return (
        <Stack key={key}>
          <Positioned top={1} left={1} right={1} bottom={1}>
            <Container border={{ width: 1, color: 'rgba(0,0,0,0.1)' }}>
              {buildChain(depth - 1, color, `${key}-p`)}
            </Container>
          </Positioned>
        </Stack>
      );
    }
  };

  const tree = (
    <Container width={w} height={h} color="#fff">
      <Wrap spacing={2} runSpacing={2}>
        {Array.from({ length: chains }).map((_, i) => (
          <Container key={`chain-${i}`} width={50} height={50}>
            {buildChain(DEPTH, i % 2 ? '#4caf50' : '#2196f3', `root-${i}`)}
          </Container>
        ))}
      </Wrap>
    </Container>
  );

  const tBuild1 = performance.now();
  runtime.render(tree);

  const paintMs = await measureNextPaint();

  return {
    buildMs: tBuild1 - tBuild0,
    layoutMs: 0,
    paintMs,
  };
}
