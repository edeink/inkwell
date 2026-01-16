import { measureNextPaint, type Timings } from '../../metrics/collector';
import { getThemeColor } from '../../utils/theme';

/**
 * 创建复杂布局 DOM 测试场景 (Deep Nesting + Mixed Layout)
 * 模拟深度嵌套的 Flex 和 Relative 布局
 *
 * Layout Alignment Notes:
 * - Root: Flex wrap with gap: 2px (matches Widget Wrap spacing).
 * - ChainRoot: 50x50 fixed size.
 * - Nodes:
 *   - Even (Flex): simulates Container(padding) > Center. Uses box-sizing: border-box
 *     to contain padding.
 *   - Odd (Absolute): simulates Stack > Positioned > Container(border). Fills parent via
 *     top/left/right/bottom.
 *   - Leaf: simulates Container(100x100) under tight constraints -> fills 100% of parent.
 */
export async function createLayoutDomNodes(stage: HTMLElement, count: number): Promise<Timings> {
  const tBuild0 = performance.now();

  const root = document.createElement('div');
  const bgBase = getThemeColor('--ink-demo-bg-base');
  // Align with Widget Wrap(spacing=2, runSpacing=2): use gap: 2px
  // Align background: #fff
  // Use box-sizing: border-box for consistent sizing model
  root.style.cssText = [
    'width: 100%',
    'height: 100%',
    'display: flex',
    'flex-wrap: wrap',
    'align-content: flex-start',
    'gap: 2px',
    'overflow: hidden',
    `background: ${bgBase}`,
    'box-sizing: border-box',
  ].join(';');

  // 策略：创建多条深度嵌套的链，模拟复杂组件树
  // 每条链深度 20，剩余节点用于宽度平铺
  const DEPTH = 20;
  const chains = Math.ceil(count / DEPTH);

  for (let i = 0; i < chains; i++) {
    const chainRoot = document.createElement('div');
    // Removed margin: 1px, using gap on parent instead.
    // flex-shrink: 0 prevents accidental shrinking before wrapping
    chainRoot.style.cssText =
      'width: 50px; height: 50px; position: relative; box-sizing: border-box; flex-shrink: 0;';

    let current = chainRoot;
    for (let d = 0; d < DEPTH; d++) {
      const node = document.createElement('div');
      // 交替使用 Flex 和 Absolute 模拟混合布局计算压力
      if (d % 2 === 0) {
        // Even: Container(padding=1) -> Center.
        // Needs position: relative to anchor the next Absolute child (Odd node).
        // box-sizing: border-box ensures padding is contained.
        node.style.cssText = [
          'display: flex',
          'justify-content: center',
          'align-items: center',
          'padding: 1px',
          'width: 100%',
          'height: 100%',
          'position: relative',
          'box-sizing: border-box',
        ].join(';');
      } else {
        // Odd: Stack -> Positioned(1,1,1,1) -> Container(border).
        // Absolute positioning with t/l/r/b mimics Positioned constraints.
        node.style.cssText = [
          'position: absolute',
          'top: 1px',
          'left: 1px',
          'right: 1px',
          'bottom: 1px',
          'border: 1px solid rgba(0,0,0,0.1)',
          'box-sizing: border-box',
        ].join(';');
      }
      current.appendChild(node);
      current = node;
    }
    // 末端节点内容 - Create an explicit leaf node to match Widget structure
    // Widget Leaf is Container(w=100, h=100) but constrained by parent.
    // DOM Leaf uses w/h 100% to simulate filling the constrained parent.
    const leaf = document.createElement('div');
    leaf.style.cssText = [
      'width: 100%',
      'height: 100%',
      `background-color: ${i % 2 ? '#4caf50' : '#2196f3'}`,
      'box-sizing: border-box',
    ].join(';');
    current.appendChild(leaf);

    root.appendChild(chainRoot);
  }

  const tBuild1 = performance.now();
  stage.appendChild(root);

  const tLayout0 = performance.now();
  void root.offsetHeight;
  const tLayout1 = performance.now();

  const paintMs = await measureNextPaint();

  return {
    buildMs: tBuild1 - tBuild0,
    layoutMs: tLayout1 - tLayout0,
    paintMs,
  };
}
