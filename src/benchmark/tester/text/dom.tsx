import { measureNextPaint, type Timings } from '../../metrics/collector';

import { detPos } from './helper';

export function createTextDomNodes(stage: HTMLElement, count: number): Promise<Timings> {
  const el = stage;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  const tBuild0 = performance.now();
  const frag = document.createDocumentFragment();
  const stageW = stage.clientWidth || 800;
  const stageH = stage.clientHeight || 600;
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    const { x, y } = detPos(i, stageW, stageH);
    d.style.cssText = `position:absolute;left:${x}px;top:${y}px;font-size:12px;line-height:12px;font-weight:normal;color:#111827;font-family:Arial, sans-serif;white-space:nowrap;`;
    d.textContent = `t-${i}`;
    frag.appendChild(d);
  }
  const tBuild1 = performance.now();
  stage.appendChild(frag);
  const tLayout0 = performance.now();
  void stage.offsetHeight; // 强制布局计算
  const tLayout1 = performance.now();
  return measureNextPaint().then((paintMs) => ({
    buildMs: tBuild1 - tBuild0,
    layoutMs: tLayout1 - tLayout0,
    paintMs,
  }));
}
