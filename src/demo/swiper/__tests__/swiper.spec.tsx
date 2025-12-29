/** @jsxImportSource @/utils/compiler */
// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Swiper } from '../widgets/swiper';

import { Container, Text } from '@/core';
import { createBoxConstraints } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Swiper 组件', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 模拟 requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (fn) => setTimeout(fn, 16));
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.unstubAllGlobals();
  });

  function createSwiper(props = {}) {
    const items = [
      <Container key="1" color="red">
        <Text text="1" />
      </Container>,
      <Container key="2" color="blue">
        <Text text="2" />
      </Container>,
      <Container key="3" color="green">
        <Text text="3" />
      </Container>,
    ];

    const el = <Swiper items={items} width={300} height={200} {...props} />;

    const data = compileElement(el);
    const swiper = WidgetRegistry.createWidget(data);
    swiper.createElement(data);
    swiper.layout(createBoxConstraints());
    return swiper;
  }

  it('正确渲染初始状态', () => {
    const swiper = createSwiper();

    // Swiper render returns Container
    // swiper.children[0] should be that Container
    const container = swiper.children[0];
    expect(container).toBeDefined();
    // 检查是否为 Container (type 可能是 CustomComponentType.Container 或 'Container'，取决于实现)
    // 这里简单检查 children 是否存在
    expect(container.children.length).toBeGreaterThan(0);

    // Container -> ClipRect -> Stack
    // 我们主要验证 currentIndex 状态
    expect(swiper.state.currentIndex).toBe(0);
  });

  it('自动播放功能', () => {
    const swiper = createSwiper({ autoplay: true, interval: 1000 });

    expect(swiper.state.currentIndex).toBe(0);

    // 第一次切换
    // 前进 1000ms (触发 interval) + 300ms (动画) + 100ms (缓冲)
    vi.advanceTimersByTime(1400);
    expect(swiper.state.currentIndex).toBe(1);

    // 第二次切换
    // 再前进 1000ms (下一个 interval 在 2000ms，当前 1400ms，差 600ms + 动画)
    // 直接前进到足以完成下一次切换的时间点
    // 当前 1400. Next tick 2000. Next completion 2300.
    // 前进 1000 -> 2400.
    vi.advanceTimersByTime(1000);
    expect(swiper.state.currentIndex).toBe(2);

    // 第三次切换 (循环回 0)
    // 当前 2400. Next tick 3000. Next completion 3300.
    // 前进 1000 -> 3400.
    vi.advanceTimersByTime(1000);
    expect(swiper.state.currentIndex).toBe(0);
  });

  it('指示器点击切换', () => {
    const swiper = createSwiper();

    // 模拟点击第二个指示器
    // 直接调用内部方法或模拟事件比较复杂，这里直接测试 handleIndicatorClick
    swiper.handleIndicatorClick(2);

    expect(swiper.state.currentIndex).toBe(2);
    expect(swiper.state.offset).toBe(0);
  });

  it('边界情况：空数据', () => {
    const el = <Swiper items={[]} width={300} height={200} />;
    const data = compileElement(el);
    const swiper = WidgetRegistry.createWidget(data);
    swiper.createElement(data);
    swiper.layout(createBoxConstraints());

    // 应该渲染 "No Items"
    const container = swiper.children[0];
    expect(container).toBeDefined();
    // 验证内容
    // Container -> Center -> Text
    // Container children[0] is Center
    expect(container.children[0]).toBeDefined();
  });

  it('边界情况：单项数据', () => {
    const items = [<Container key="1" />];
    const el = <Swiper items={items} width={300} height={200} />;
    const data = compileElement(el);
    const swiper = WidgetRegistry.createWidget(data);
    swiper.createElement(data);
    swiper.layout(createBoxConstraints());

    expect(swiper.state.currentIndex).toBe(0);

    // 调用 next，应该还是 0
    swiper.next();
    // 动画需要时间
    vi.advanceTimersByTime(500);

    expect(swiper.state.currentIndex).toBe(0);
  });
});
