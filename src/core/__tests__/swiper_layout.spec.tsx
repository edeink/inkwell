/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import Runtime from '../../runtime';
import { ClipRect } from '../clip-rect';
import { Container } from '../container';
import { Positioned } from '../positioned';
import { WidgetRegistry } from '../registry';
import { Stack } from '../stack';
import { Text } from '../text';

import type { ComponentType } from '@/core/type';

import { StatefulWidget } from '@/core';

const asType = (type: string) => type as unknown as ComponentType;

// 模拟 Context 设置
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
  setTransform: vi.fn(),
  getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
} as unknown as CanvasRenderingContext2D;

// 模拟 Swiper 的测试用 StatefulWidget
class TestSwiper extends StatefulWidget {
  state = {
    index: 0,
  };

  switchPage(index: number) {
    this.setState({ index });
  }

  render() {
    const { width, height } = this.props;
    const { index } = this.state;

    // 直接返回对象结构代替 JSX 以避免测试中的编译器问题
    return {
      type: asType('Container'),
      props: {
        width,
        height,
        children: [
          {
            type: asType('ClipRect'),
            props: {
              children: [
                {
                  type: asType('Stack'),
                  props: {
                    children: [
                      {
                        type: asType('Positioned'),
                        props: {
                          left: 0,
                          top: 0,
                          width,
                          height,
                          children: [
                            {
                              type: asType('Container'),
                              key: `page-${index}`,
                              props: {
                                color: index === 0 ? 'red' : 'blue',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };
  }
}

WidgetRegistry.registerType('TestSwiper', TestSwiper);

describe('Swiper 布局问题', () => {
  const containerId = 'swiper-test';

  beforeAll(() => {
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

    // 注册核心组件
    WidgetRegistry.registerType('Container', Container);
    WidgetRegistry.registerType('Stack', Stack);
    WidgetRegistry.registerType('Positioned', Positioned);
    WidgetRegistry.registerType('Text', Text);
    WidgetRegistry.registerType('ClipRect', ClipRect);
    WidgetRegistry.registerType('TestSwiper', TestSwiper);

    const div = document.createElement('div');
    div.id = containerId;
    div.style.width = '800px';
    div.style.height = '600px';
    document.body.appendChild(div);
  });

  afterAll(() => {
    document.body.innerHTML = '';
  });

  it('更新后 Positioned 内的 Container 应保持尺寸 (JSON)', async () => {
    const runtime = await Runtime.create(containerId);

    // 初始渲染: 第1页
    await runtime.render(
      <Container key="root" width={800} height={600}>
        <Stack key="stack" fit="expand">
          <Positioned key="pos" left={0} right={0} top={0} bottom={0}>
            <Container key="page1" color="red" />
          </Positioned>
        </Stack>
      </Container>,
    );

    const root = runtime.getRootWidget() as Container;
    const stack = root.children[0] as Stack;
    const positioned = stack.children[0] as Positioned;
    const page1 = positioned.children[0] as Container;

    // 验证初始布局
    expect(root.renderObject.size).toEqual({ width: 800, height: 600 });
    expect(stack.renderObject.size).toEqual({ width: 800, height: 600 });
    expect(positioned.renderObject.size).toEqual({ width: 800, height: 600 });
    expect(page1.renderObject.size).toEqual({ width: 800, height: 600 });

    // 模拟切换页面: 用 page2 替换 page1
    await runtime.render(
      <Container key="root" width={800} height={600}>
        <Stack key="stack" fit="expand">
          <Positioned key="pos" left={0} right={0} top={0} bottom={0}>
            <Container key="page2" color="blue" />
          </Positioned>
        </Stack>
      </Container>,
    );

    const newRoot = runtime.getRootWidget() as Container;
    const newStack = newRoot.children[0] as Stack;
    const newPositioned = newStack.children[0] as Positioned;
    const page2 = newPositioned.children[0] as Container;

    // 验证切换后的布局
    expect(newRoot.renderObject.size).toEqual({ width: 800, height: 600 });
    expect(newStack.renderObject.size).toEqual({ width: 800, height: 600 });
    expect(newPositioned.renderObject.size).toEqual({ width: 800, height: 600 });
    expect(page2.renderObject.size).toEqual({ width: 800, height: 600 });

    runtime.destroy();
  });

  it('StatefulWidget setState 应正确更新布局', async () => {
    const runtime = await Runtime.create(containerId);

    // 初始渲染
    await runtime.render(<TestSwiper key="swiper" width={800} height={600} />);

    const swiper = runtime.getRootWidget() as TestSwiper;
    // 结构: Swiper -> Container -> ClipRect -> Stack -> Positioned -> Container
    const container = swiper.children[0] as Container;
    const clipRect = container.children[0] as ClipRect;
    const stack = clipRect.children[0] as Stack;
    const positioned = stack.children[0] as Positioned;
    const page1 = positioned.children[0] as Container;

    expect(page1.renderObject.size).toEqual({ width: 800, height: 600 });
    expect(page1.key).toBe('page-0');

    // 触发 setState
    swiper.switchPage(1);

    // 等待异步更新（如果有）
    await new Promise((resolve) => setTimeout(resolve, 20));

    const newContainer = swiper.children[0] as Container;
    const newClipRect = newContainer.children[0] as ClipRect;
    const newStack = newClipRect.children[0] as Stack;
    const newPositioned = newStack.children[0] as Positioned;
    const page2 = newPositioned.children[0] as Container;

    expect(page2.key).toBe('page-1');
    expect(page2.renderObject.size).toEqual({ width: 800, height: 600 });

    runtime.destroy();
  });
});
