import { measureNextPaint, type Timings } from '../../metrics/collector';
import { BENCHMARK_CONFIG } from '../../utils/config';
import { getThemeColor } from '../../utils/theme';

export async function createStateTextDomNodes(
  stage: HTMLElement,
  count: number,
  frames: number = BENCHMARK_CONFIG.STATE.FRAMES,
  minW: number = BENCHMARK_CONFIG.STATE.MIN_WIDTH,
  minH: number = BENCHMARK_CONFIG.STATE.MIN_HEIGHT,
): Promise<Timings> {
  const tBuild0 = performance.now();

  const w = stage.clientWidth || 800;
  const h = stage.clientHeight || 600;

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
    div.style.cssText =
      `width: ${side}px; height: ${side}px; ` +
      `margin: ${MARGIN}px; background: #ccc; ` +
      `display: flex; align-items: center; justify-content: center; ` +
      `font-size: 12px; color: ${textColor}; user-select: none;`;
    div.textContent = 'A';
    root.appendChild(div);
    items.push(div);
  }

  const tBuild1 = performance.now();
  stage.appendChild(root);

  const tLayout0 = performance.now();
  void root.offsetHeight;
  const tLayout1 = performance.now();

  const paintMs = await measureNextPaint();

  const BATCH_SIZE = BENCHMARK_CONFIG.STATE.BATCH_SIZE;
  let currentSelection = new Set<number>();

  await new Promise<void>((resolve) => {
    let f = 0;
    const loop = () => {
      if (f >= frames) {
        resolve();
        return;
      }

      const nextSelection = new Set<number>();
      for (let k = 0; k < BATCH_SIZE; k++) {
        nextSelection.add(Math.floor(Math.random() * count));
      }

      for (const idx of currentSelection) {
        if (!nextSelection.has(idx)) {
          if (items[idx]) {
            items[idx].textContent = 'A';
          }
        }
      }

      for (const idx of nextSelection) {
        if (!currentSelection.has(idx)) {
          if (items[idx]) {
            items[idx].textContent = 'B';
          }
        }
      }

      currentSelection = nextSelection;
      f++;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  return {
    buildMs: tBuild1 - tBuild0,
    layoutMs: tLayout1 - tLayout0,
    paintMs,
  };
}
