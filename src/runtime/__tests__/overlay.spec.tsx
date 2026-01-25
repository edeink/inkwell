/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BuildContext, Size } from '@/core/base';
import type { WidgetProps } from '@/core/type';

import { Popconfirm, Select } from '@/comp';
import { Column, Container, CrossAxisAlignment, MainAxisAlignment, Row, Widget } from '@/core';
import { hitTest } from '@/core/events/dispatcher';
import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';

class PaintSpyWidget extends Widget<WidgetProps> {
  constructor(
    key: string,
    private calls: string[],
  ) {
    super({ type: 'PaintSpyWidget', key } as any);
  }

  layout(_constraints: unknown): Size {
    return this.renderObject.size;
  }

  paint(_context: BuildContext): void {
    this.calls.push(this.key);
  }
}

describe('Overlay 运行时能力', () => {
  let container: HTMLElement;
  let runtime: Runtime;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'test-overlay-container';
    document.body.appendChild(container);
    runtime = await Runtime.create('test-overlay-container', { renderer: 'canvas2d' });
  });

  afterEach(() => {
    runtime.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('Select 打开时应通过 Overlay 渲染下拉且不影响布局', async () => {
    await runtime.render(
      <Container key="root" width={420} height={240} pointerEvent="auto">
        <Row
          key="row"
          spacing={16}
          mainAxisAlignment={MainAxisAlignment.Start}
          crossAxisAlignment={CrossAxisAlignment.Start}
        >
          <Column key="col" spacing={12} crossAxisAlignment={CrossAxisAlignment.Start}>
            <Select
              key="select"
              theme={Themes.light}
              width={200}
              options={[
                { label: '北京', value: 'bj' },
                { label: '上海', value: 'sh' },
              ]}
            />
            <Container key="below" width={200} height={28} pointerEvent="auto" />
          </Column>
        </Row>
      </Container>,
    );

    const root1 = runtime.getRootWidget()!;
    const below1 = findWidget(root1, '#below') as Container;
    const y1 = below1.getAbsolutePosition().dy;

    const select = findWidget(root1, '#select') as Select;
    (select as any).toggleOpened({ stopPropagation: vi.fn() } as any);

    await new Promise((r) => setTimeout(r, 20));

    const root2 = runtime.getRootWidget()!;
    const below2 = findWidget(root2, '#below') as Container;
    const y2 = below2.getAbsolutePosition().dy;
    expect(y2).toBe(y1);

    const overlayRoot = runtime.getOverlayRootWidget();
    expect(overlayRoot).not.toBeNull();
    const overlayNode = findWidget(
      overlayRoot!,
      `#${String((select as any).key)}-dropdown-overlay`,
    );
    expect(overlayNode).not.toBeNull();
  });

  it('Popconfirm 打开时应通过 Overlay 渲染面板并可置顶命中', async () => {
    await runtime.render(
      <Container key="root" width={420} height={240} pointerEvent="auto">
        <Popconfirm key="pc" title="标题" description="描述">
          <Container key="pc-trigger" width={80} height={32} pointerEvent="auto" />
        </Popconfirm>
      </Container>,
    );

    const root = runtime.getRootWidget()!;
    const pc = findWidget(root, '#pc') as Popconfirm;
    (pc as any).toggleOpened({ stopPropagation: vi.fn() } as any);

    await new Promise((r) => setTimeout(r, 20));

    const overlayRoot = runtime.getOverlayRootWidget();
    expect(overlayRoot).not.toBeNull();
    const overlayPanel = findWidget(overlayRoot!, `#${String((pc as any).key)}-popconfirm-overlay`);
    expect(overlayPanel).not.toBeNull();

    const overlayHit = hitTest(root, 1, 50);
    expect(overlayHit).not.toBeNull();
    expect(overlayHit?.key).not.toBe('root');
  });

  it('存在 Overlay 时，裁剪不应影响 Overlay 的绘制顺序', () => {
    const calls: string[] = [];
    const stubRenderer = {
      save: vi.fn(() => calls.push('save')),
      restore: vi.fn(() => calls.push('restore')),
      clipRect: vi.fn(() => calls.push('clip')),
      render: vi.fn(() => calls.push('render')),
      destroy: vi.fn(),
      getRawInstance: vi.fn(() => ({ canvas: document.createElement('canvas') })),
    } as any;

    (runtime as any).renderer = stubRenderer;
    (runtime as any).monitorMemory = () => void 0;

    const rootSpy = new PaintSpyWidget('rootPaint', calls);
    rootSpy.renderObject.size = { width: 100, height: 100 };
    rootSpy.runtime = runtime;
    (runtime as any).rootWidget = rootSpy;

    const overlaySpy = new PaintSpyWidget('overlayPaint', calls);
    const overlayChild = new PaintSpyWidget('overlayChild', calls);
    overlaySpy.children = [overlayChild];
    overlayChild.parent = overlaySpy;
    overlaySpy.runtime = runtime;
    (runtime as any).overlayHost = overlaySpy;

    (runtime as any).performRender({ x: 1, y: 2, width: 3, height: 4 });

    expect(calls).toEqual([
      'save',
      'clip',
      'rootPaint',
      'restore',
      'save',
      'overlayPaint',
      'restore',
      'render',
    ]);
  });
});
