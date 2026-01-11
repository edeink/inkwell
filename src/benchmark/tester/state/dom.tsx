import { measureNextPaint, type Timings } from '../../metrics/collector';

/**
 * 状态更新 DOM 测试
 * 模拟局部更新：在大量节点中只更新一个节点的状态
 * 基准：原生 DOM 直接操作 (O(1) 或 O(N) 取决于实现，这里使用直接操作模拟最佳性能)
 */
export async function createStateDomNodes(
  stage: HTMLElement,
  count: number,
  frames: number = 20,
  minW: number = 300,
  minH: number = 200,
): Promise<Timings> {
  const tBuild0 = performance.now();

  // 1. Adaptive Layout Algorithm
  // Use clientWidth/Height with fallbacks
  const w = stage.clientWidth || 800;
  const h = stage.clientHeight || 600;

  // Set min constraints
  const effW = Math.max(w, minW);
  const effH = Math.max(h, minH);

  // 2. Dynamic Content Scaling
  const MIN_ITEM_SIZE = 4;
  const MARGIN = 1;
  const GAP = MARGIN * 2;

  // Calculate optimal item side length to fit in the available area
  // (side + GAP)^2 * count <= effW * effH
  let side = Math.floor(Math.sqrt((effW * effH) / count)) - GAP;

  // 3. Intelligent Pagination/Scrolling
  // Prioritize compressing item size, but clamp to threshold
  if (side < MIN_ITEM_SIZE) {
    side = MIN_ITEM_SIZE;
    // Overflow handled by CSS overflow-y: auto
  }

  const root = document.createElement('div');
  root.style.cssText = `
    display: flex; 
    flex-wrap: wrap; 
    width: 100%; 
    height: 100%; 
    min-width: ${minW}px; 
    min-height: ${minH}px;
    align-content: flex-start;
    overflow-y: auto; 
    overflow-x: hidden;
  `;

  const items: HTMLDivElement[] = [];
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.style.cssText = `width: ${side}px; height: ${side}px; margin: ${MARGIN}px; background: #ccc;`;
    root.appendChild(div);
    items.push(div);
  }

  const tBuild1 = performance.now();
  stage.appendChild(root);

  const tLayout0 = performance.now();
  void root.offsetHeight;
  const tLayout1 = performance.now();

  const paintMs = await measureNextPaint();

  // 模拟状态更新循环
  const BATCH_SIZE = 20; // 批量更新节点数量，与 Widget 版本一致
  let currentSelection = new Set<number>();

  await new Promise<void>((resolve) => {
    let f = 0;
    function loop() {
      if (f >= frames) {
        resolve();
        return;
      }

      // 生成批量随机索引
      const nextSelection = new Set<number>();
      for (let k = 0; k < BATCH_SIZE; k++) {
        nextSelection.add(Math.floor(Math.random() * count));
      }

      // 批量更新 DOM 状态
      // 策略：Diff 更新，仅操作发生变化的节点，模拟最佳性能实践

      // 1. 重置不再选中的节点 (Previous - Next)
      for (const idx of currentSelection) {
        if (!nextSelection.has(idx)) {
          if (items[idx]) {
            items[idx].style.backgroundColor = '#ccc';
          }
        }
      }

      // 2. 高亮新选中的节点 (Next - Previous)
      for (const idx of nextSelection) {
        if (!currentSelection.has(idx)) {
          if (items[idx]) {
            items[idx].style.backgroundColor = 'red';
          }
        }
      }

      // 更新状态引用
      currentSelection = nextSelection;

      requestAnimationFrame(loop);
      f++;
    }
    requestAnimationFrame(loop);
  });

  return {
    buildMs: tBuild1 - tBuild0,
    layoutMs: tLayout1 - tLayout0,
    paintMs,
  };
}
