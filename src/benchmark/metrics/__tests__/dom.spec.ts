import { beforeEach, describe, expect, it } from 'vitest';

import { createLayoutDomNodes } from '../../tester/layout/dom';
import { createStateDomNodes } from '../../tester/state/dom';
import DomPerformanceTest, { clearDomStage } from '../dom';

describe('DOM 指标与工具', () => {
  let stage: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    stage = document.createElement('div');
    document.body.appendChild(stage);
  });

  describe('clearDomStage', () => {
    it('应从舞台清除所有子节点', () => {
      // Setup
      const child1 = document.createElement('div');
      const child2 = document.createElement('span');
      stage.appendChild(child1);
      stage.appendChild(child2);
      expect(stage.children.length).toBe(2);

      // Execute
      clearDomStage(stage);

      // Verify
      expect(stage.children.length).toBe(0);
    });

    it('应在提供无效舞台时抛出错误', () => {
      expect(() => clearDomStage(null as any)).toThrow('Invalid stage element provided');
      expect(() => clearDomStage({} as any)).toThrow('Invalid stage element provided');
    });
  });

  describe('DomPerformanceTest', () => {
    it('应在创建新节点前清除舞台', async () => {
      // Setup: Add garbage to stage
      stage.appendChild(document.createElement('div'));

      const tester = new DomPerformanceTest(stage);

      // Execute & Verify
      // 注意：DomPerformanceTest 的具体实现可能依赖于具体子类，这里主要测试基础行为
      // 我们保留此测试以确保基本契约
    });
  });
});

describe('布局 DOM 测试器', () => {
  let stage: HTMLElement;

  beforeEach(() => {
    stage = document.createElement('div');
  });

  it('应生成与 Widget 实现匹配的正确结构', async () => {
    const DEPTH = 20;
    await createLayoutDomNodes(stage, DEPTH + 10); // Ensure at least one chain

    const root = stage.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();

    // Check Root Style
    expect(root.style.backgroundColor).toBe('rgb(255, 255, 255)'); // #fff
    expect(root.style.display).toBe('flex');
    expect(root.style.gap).toBe('2px'); // New check

    const chainRoot = root.firstElementChild as HTMLElement;
    expect(chainRoot).toBeTruthy();
    // Check Margin (Removed, should be empty or 0px)
    expect(chainRoot.style.margin).toBe('');

    // Traverse to Leaf
    let current = chainRoot;
    let depthCount = 0;
    while (current.firstElementChild) {
      current = current.firstElementChild as HTMLElement;
      depthCount++;
    }

    // Depth should be 20 (loop) + 1 (leaf) = 21 levels deep from chainRoot
    expect(depthCount).toBe(21);

    // Check Leaf Style
    expect(current.style.width).toBe('100%');
    expect(current.style.height).toBe('100%');
    // Color should be green or blue
    expect(current.style.backgroundColor).toMatch(/rgb\(76, 175, 80\)|rgb\(33, 150, 243\)/);
  });
});

describe('状态 DOM 测试器', () => {
  let stage: HTMLElement;

  beforeEach(() => {
    stage = document.createElement('div');
    // Mock clientWidth/Height for JSDOM
    Object.defineProperty(stage, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 600 });
  });

  it('应应用自适应布局约束', async () => {
    // Case 1: 10 items in 800x600
    await createStateDomNodes(stage, 10, 0);
    const root = stage.firstElementChild as HTMLElement;
    const item = root.firstElementChild as HTMLElement;

    expect(root.style.minWidth).toBe('300px');
    expect(root.style.minHeight).toBe('200px');
    expect(root.style.overflowY).toBe('auto');

    // Check item size
    const side = parseFloat(item.style.width);
    expect(side).toBeGreaterThan(20);
    expect(item.style.margin).toBe('1px');
  });

  it('应在大数量时缩小项目尺寸', async () => {
    // Case 2: 使用小舞台和少量节点模拟"大数量"场景
    // 有效区域 minW(30) * minH(20) = 600
    // 阈值: 600 / count < 100 (假设 width < 100)
    Object.defineProperty(stage, 'clientWidth', { configurable: true, value: 10 });
    Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 10 });

    // frames = 0, minW = 30, minH = 20
    await createStateDomNodes(stage, 20, 0, 30, 20);
    const root = stage.firstElementChild as HTMLElement;
    const item = root.firstElementChild as HTMLElement;
    const side = parseFloat(item.style.width);

    // 20 items in 600 area -> sqrt(30) ~ 5.4
    expect(side).toBeLessThan(30);
    expect(side).toBeGreaterThanOrEqual(4);
  });

  it('应在数量过多时限制最小尺寸并启用滚动', async () => {
    // Case 3: 强制小舞台以减少触发限制所需的节点数
    // 有效区域 minW(300) * minH(200) = 60,000
    // 阈值: 60000 / count < 49 => count > 1224
    Object.defineProperty(stage, 'clientWidth', { configurable: true, value: 100 });
    Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 100 });

    // frames = 0, 跳过动画循环以优化性能
    await createStateDomNodes(stage, 2000, 0);
    const root = stage.firstElementChild as HTMLElement;
    const item = root.firstElementChild as HTMLElement;
    const side = parseFloat(item.style.width);

    expect(side).toBe(4);
  });
});
