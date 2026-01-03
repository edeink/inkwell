/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import Runtime from '../../runtime';
import { Container, Text } from '../index';
import { WidgetRegistry } from '../registry';

import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('RepaintBoundary 显示与开关测试', () => {
  // 注册核心组件
  WidgetRegistry.registerType('Container', Container);
  WidgetRegistry.registerType('Text', Text);

  it('RepaintBoundary 应正确绘制内容到主屏幕', async () => {
    // 1. 设置 Mock Renderer
    const drawImageSpy = vi.fn();
    const mockRenderer = {
      initialize: vi.fn(),
      render: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      drawRect: vi.fn(),
      drawText: vi.fn(),
      drawImage: drawImageSpy,
      getResolution: () => 1,
      // 模拟构造函数
      constructor: class MockLayerRenderer {
        initialize = vi.fn();
        render = vi.fn();
        save = vi.fn();
        restore = vi.fn();
        translate = vi.fn();
        scale = vi.fn();
        rotate = vi.fn();
        transform = vi.fn();
        setTransform = vi.fn();
        drawRect = vi.fn();
        drawText = vi.fn();
        drawImage = vi.fn();
        setContext = vi.fn();
      },
    };

    // 2. 创建 Runtime
    const div = document.createElement('div');
    div.id = 'test-container';
    document.body.appendChild(div);
    const runtime = await Runtime.create('test-container', { renderer: 'canvas2d' });
    // @ts-ignore
    runtime.renderer = mockRenderer;
    // runtime.container is a getter, no need to set it, it's set by create/init
    // But we need to make sure runtime.container returns something useful if it doesn't
    // Actually Runtime.create calls init which sets _container.
    // The getter returns _container. So it should be fine.

    // However, the test failure says "Cannot set property container of #<Runtime> which has only a getter"
    // So we should remove the line setting runtime.container

    // 3. 创建 Widget 树，包含 RepaintBoundary
    const root = (
      <Container width={500} height={500}>
        <Container
          key="node-1"
          width={100}
          height={100}
          color="red"
          // 手动开启 RepaintBoundary
          // @ts-ignore
          isRepaintBoundary={true}
        >
          <Text text="Hello World" />
        </Container>
      </Container>
    );

    // @ts-ignore
    const rootJson = compileElement(root);
    const rootWidget = WidgetRegistry.createWidget(rootJson);
    if (!rootWidget) {
      throw new Error('rootWidget creation failed');
    }
    // 手动构建组件树
    rootWidget.createElement(rootJson);
    // 手动设置 runtime
    rootWidget.runtime = runtime;
    // @ts-ignore
    runtime.rootWidget = rootWidget;

    // 4. 执行渲染
    // 触发 layout
    rootWidget.layout({ minWidth: 0, maxWidth: 500, minHeight: 0, maxHeight: 500 });
    // 触发 paint
    rootWidget!.paint({ renderer: mockRenderer, enableOffscreenRendering: true } as any);

    // 5. 验证
    // 应该调用 drawImage，因为开启了 RepaintBoundary
    expect(drawImageSpy).toHaveBeenCalled();
  });

  it('关闭全局离屏渲染开关后，不应使用 RepaintBoundary', async () => {
    // 1. 设置 Mock Renderer
    const drawImageSpy = vi.fn();
    const drawRectSpy = vi.fn();
    const mockRenderer = {
      initialize: vi.fn(),
      render: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      drawRect: drawRectSpy,
      drawText: vi.fn(),
      drawImage: drawImageSpy,
      getResolution: () => 1,
      constructor: class MockLayerRenderer {
        setContext = vi.fn();
      },
    };

    const div2 = document.createElement('div');
    div2.id = 'test-container-2';
    document.body.appendChild(div2);
    const runtime = await Runtime.create('test-container-2', { renderer: 'canvas2d' });
    // @ts-ignore
    runtime.renderer = mockRenderer;

    const root = (
      <Container
        key="node-2"
        width={100}
        height={100}
        color="blue"
        // @ts-ignore
        isRepaintBoundary={true}
      />
    );

    // @ts-ignore
    const rootJson = compileElement(root);
    const rootWidget = WidgetRegistry.createWidget(rootJson);
    if (!rootWidget) {
      throw new Error('rootWidget creation failed');
    }
    // 手动构建组件树
    rootWidget.createElement(rootJson);
    // 手动设置 runtime
    rootWidget.runtime = runtime;
    // @ts-ignore
    runtime.rootWidget = rootWidget;

    // 4. 执行渲染，但禁用 offscreen
    rootWidget.layout({ minWidth: 0, maxWidth: 500, minHeight: 0, maxHeight: 500 });

    // 模拟 Runtime 传递 enableOffscreenRendering = false
    rootWidget.paint({ renderer: mockRenderer, enableOffscreenRendering: false } as any);

    // 5. 验证
    // 不应该调用 drawImage (因为禁用了离屏渲染)
    expect(drawImageSpy).not.toHaveBeenCalled();
    // 应该直接调用 drawRect (绘制 Container 背景)
    expect(drawRectSpy).toHaveBeenCalled();
  });
});
