/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { Swiper } from '../index';

import type { ComponentType } from '@/core/type';

import { ClipRect, Container, Positioned, Stack, Text } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import Runtime from '@/runtime';

const asType = (type: string) => type as unknown as ComponentType;

// 模拟 Canvas 上下文
const mockContext = {
  canvas: { width: 800, height: 600 },
  scale: vi.fn(),
  translate: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  closePath: vi.fn(),
  setTransform: vi.fn(),
  getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
} as unknown as CanvasRenderingContext2D;

describe('Swiper 动画测试', () => {
  const containerId = 'swiper-animation-test';

  beforeAll(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
      contextId: string,
    ) {
      if (contextId === '2d') {
        (mockContext as any).canvas = this;
        return mockContext;
      }
      return null;
    } as any);

    // 模拟 requestAnimationFrame
    let lastTime = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const currTime = Date.now();
      const timeToCall = Math.max(0, 16 - (currTime - lastTime));
      const id = setTimeout(() => {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      clearTimeout(id as unknown as NodeJS.Timeout);
    });

    WidgetRegistry.registerType('Container', Container);
    WidgetRegistry.registerType('Stack', Stack);
    WidgetRegistry.registerType('Positioned', Positioned);
    WidgetRegistry.registerType('Text', Text);
    WidgetRegistry.registerType('ClipRect', ClipRect);
    WidgetRegistry.registerType('Swiper', Swiper);

    const div = document.createElement('div');
    div.id = containerId;
    div.style.width = '800px';
    div.style.height = '600px';
    document.body.appendChild(div);
  });

  afterAll(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('点击指示器应触发平滑过渡动画', async () => {
    const runtime = await Runtime.create(containerId);

    // 创建 3 个页面的 Swiper
    const items = [
      <Container key="p1" color="red" />,
      <Container key="p2" color="blue" />,
      <Container key="p3" color="green" />,
    ];

    await runtime.render(
      <Swiper
        key="swiper"
        width={800}
        height={600}
        items={items}
        autoplay={false}
        duration={400}
      />,
    );

    const swiper = runtime.getRootWidget() as Swiper;
    expect((swiper as any).state.currentIndex).toBe(0);

    // 模拟点击指示器 2 (第三页)
    // 应该向左滑 (-800px)
    // 由于是私有方法，我们需要通过 any 访问或模拟点击事件
    // 这里我们直接调用 handleIndicatorClick 以测试逻辑
    (swiper as any).handleIndicatorClick(2);

    // 检查状态: pendingNextIndex 应该被设置
    expect((swiper as any).state.pendingNextIndex).toBe(2);

    // 推进时间，检查 offset 变化
    // 动画时长 400ms

    // 初始 offset 应该接近 0 (刚开始)
    expect((swiper as any).state.offset).toBeCloseTo(0);

    // 推进 200ms (一半)
    await vi.advanceTimersByTimeAsync(200);

    // easeSharp(0.5) 约为 0.8 (Fast out)
    // offset 应该移动了很大一部分
    const offsetMid = (swiper as any).state.offset;
    expect(offsetMid).toBeLessThan(-400); // 应该超过一半 (-400)

    // 推进剩余时间
    await vi.advanceTimersByTimeAsync(300);

    // 动画结束
    expect((swiper as any).state.currentIndex).toBe(2);
    expect((swiper as any).state.offset).toBe(0);
    expect((swiper as any).state.pendingNextIndex).toBeUndefined();

    runtime.destroy();
  });

  it('反向点击指示器应触发反向动画', async () => {
    const runtime = await Runtime.create(containerId);

    const items = [
      <Container key="p1" color="red" />,
      <Container key="p2" color="blue" />,
      <Container key="p3" color="green" />,
    ];

    await runtime.render(
      <Swiper key="swiper" width={800} height={600} items={items} autoplay={false} />,
    );

    const swiper = runtime.getRootWidget() as Swiper;

    // 先设置到第 2 页
    swiper.setState({ currentIndex: 2, offset: 0 });
    // 不需要等待 setTimeout，因为 setState 同步更新了 state 对象
    // await new Promise(r => setTimeout(r, 0));

    expect((swiper as any).state.currentIndex).toBe(2);

    // 点击指示器 0 (第一页)
    // 应该向右滑 (+800px)
    (swiper as any).handleIndicatorClick(0);

    expect((swiper as any).state.pendingPrevIndex).toBe(0);

    await vi.advanceTimersByTimeAsync(200);

    // 向右滑，offset 为正
    expect((swiper as any).state.offset).toBeGreaterThan(400);

    await vi.advanceTimersByTimeAsync(300);

    expect((swiper as any).state.currentIndex).toBe(0);
    expect((swiper as any).state.offset).toBe(0);
    expect((swiper as any).state.pendingPrevIndex).toBeUndefined();

    runtime.destroy();
  });

  it('Autoplay should respect prop updates (enable/disable)', async () => {
    const runtime = await Runtime.create(containerId);
    const items = [<Container key="p1" color="red" />, <Container key="p2" color="blue" />];

    // 1. Autoplay OFF
    const swiperOff = (
      <Swiper items={items} width={300} height={200} autoplay={false} interval={1000} />
    );
    runtime.render(swiperOff);
    let root = runtime.getRootWidget() as any;
    expect(root.state.currentIndex).toBe(0);

    await vi.advanceTimersByTimeAsync(1500);
    expect(root.state.currentIndex).toBe(0);

    // 2. Autoplay ON
    const swiperOn = (
      <Swiper items={items} width={300} height={200} autoplay={true} interval={1000} />
    );
    runtime.render(swiperOn);
    root = runtime.getRootWidget() as any;

    await vi.advanceTimersByTimeAsync(1100);
    await vi.advanceTimersByTimeAsync(500);
    expect(root.state.currentIndex).toBe(1);

    runtime.destroy();
  });

  it('Animation Duration should respect prop updates', async () => {
    const runtime = await Runtime.create(containerId);
    const items = [<Container key="p1" color="red" />, <Container key="p2" color="blue" />];

    // 1. Long duration
    const swiperSlow = <Swiper items={items} width={300} height={200} duration={1000} />;
    runtime.render(swiperSlow);
    let root = runtime.getRootWidget() as any;

    // Trigger next() manually to start animation
    root.next();

    // Advance 500ms (halfway)
    await vi.advanceTimersByTimeAsync(500);
    // Offset should be around -150 (half of 300)
    // easeSharp at 0.5 might not be exactly 0.5, but let's check it's not finished
    expect(root.state.offset).not.toBe(0);
    expect(root.state.offset).toBeLessThan(0);
    expect(root.state.offset).toBeGreaterThan(-300);

    // Advance remaining 500ms
    await vi.advanceTimersByTimeAsync(600);
    expect(root.state.offset).toBe(0);
    expect(root.state.currentIndex).toBe(1);

    // 2. Short duration
    const swiperFast = <Swiper items={items} width={300} height={200} duration={100} />;
    runtime.render(swiperFast);
    root = runtime.getRootWidget() as any;

    // Trigger next() manually
    root.next();

    // Advance 150ms (should be finished)
    await vi.advanceTimersByTimeAsync(150);
    expect(root.state.offset).toBe(0);
    expect(root.state.currentIndex).toBe(0); // Index wraps around to 0 (1 -> 2(0))

    runtime.destroy();
  });
});
