/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BuildContext, Size } from '@/core/base';
import type { WidgetProps } from '@/core/type';

import { DatePicker, Form, FormItem, Modal, Popconfirm, Select } from '@/comp';
import {
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  Row,
  ScrollView,
  Widget,
} from '@/core';
import { dispatchToTree, hitTest } from '@/core/events/dispatcher';
import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';

async function waitForValue<T>(
  getter: () => T,
  predicate: (v: T) => boolean,
  timeoutMs: number = 300,
  intervalMs: number = 10,
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = getter();
    if (predicate(v)) {
      return v;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return getter();
}

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

  it('FormItem 中控件列应按内容高度收缩，不应被父约束拉伸', async () => {
    await runtime.render(
      <Container key="root" width={420} height={260} pointerEvent="auto">
        <Form key="form" theme={Themes.light}>
          <FormItem key="fi" theme={Themes.light} label="城市">
            <Select
              key="select"
              theme={Themes.light}
              width={200}
              options={[
                { label: '北京', value: 'bj' },
                { label: '上海', value: 'sh' },
              ]}
            />
          </FormItem>
        </Form>
      </Container>,
    );

    const root1 = runtime.getRootWidget()!;
    const fi1 = findWidget(root1, '#fi') as any;
    const controlCol1 = fi1.children[1] as any;
    const select1 = findWidget(root1, '#select') as any;

    expect(controlCol1.renderObject.size.height).toBe(select1.renderObject.size.height);

    (select1 as any).toggleOpened({ stopPropagation: vi.fn() } as any);
    runtime.tick();
    await new Promise((r) => setTimeout(r, 20));

    const root2 = runtime.getRootWidget()!;
    const fi2 = findWidget(root2, '#fi') as any;
    const controlCol2 = fi2.children[1] as any;
    const select2 = findWidget(root2, '#select') as any;

    expect(controlCol2.renderObject.size.height).toBe(select2.renderObject.size.height);
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

  it('Modal 打开时应通过 Overlay 渲染且不影响布局', async () => {
    await runtime.render(
      <Container key="root" width={420} height={240} pointerEvent="auto">
        <Column key="col" spacing={12} crossAxisAlignment={CrossAxisAlignment.Start}>
          <Container key="above" width={200} height={28} pointerEvent="auto" />
          <Container key="below" width={200} height={28} pointerEvent="auto" />
          <Modal key="modal" theme={Themes.light} open={true} title="标题">
            <Container key="body" width={100} height={20} pointerEvent="none" />
          </Modal>
        </Column>
      </Container>,
    );

    const root1 = runtime.getRootWidget()!;
    const below1 = findWidget(root1, '#below') as Container;
    const y1 = below1.getAbsolutePosition().dy;

    runtime.tick();
    await new Promise((r) => setTimeout(r, 20));

    const root2 = runtime.getRootWidget()!;
    const below2 = findWidget(root2, '#below') as Container;
    const y2 = below2.getAbsolutePosition().dy;
    expect(y2).toBe(y1);

    const overlayRoot = runtime.getOverlayRootWidget();
    expect(overlayRoot).not.toBeNull();
    expect(findWidget(overlayRoot!, '#modal-modal-overlay-dialog')).not.toBeNull();
  });

  it('Select 打开后滚动 ScrollView 应跟随触发器更新位置', async () => {
    await runtime.render(
      <Container key="root" width={420} height={240} pointerEvent="auto">
        <ScrollView key="sv" enableBounceVertical={false} enableBounceHorizontal={false}>
          <Column key="content" spacing={12} crossAxisAlignment={CrossAxisAlignment.Start}>
            <Container key="spacer" width={200} height={260} pointerEvent="none" />
            <Select
              key="select"
              theme={Themes.light}
              width={200}
              options={[
                { label: '北京', value: 'bj' },
                { label: '上海', value: 'sh' },
              ]}
            />
          </Column>
        </ScrollView>
      </Container>,
    );

    const root = runtime.getRootWidget()!;
    const select = findWidget(root, '#select') as Select;
    (select as any).toggleOpened({ stopPropagation: vi.fn() } as any);
    runtime.tick();
    const overlayKey = `#${String((select as any).key)}-dropdown-overlay`;

    const overlayNode1 = await waitForValue(
      () => {
        const overlayRoot = runtime.getOverlayRootWidget();
        if (!overlayRoot) {
          return null;
        }
        return findWidget(overlayRoot, overlayKey) as any;
      },
      (v) => v != null,
    );
    expect(overlayNode1).not.toBeNull();
    const top1 = overlayNode1.top as number;

    const sv = findWidget(root, '#sv') as ScrollView;
    const prevScrollY = sv.scrollY;
    sv.scrollBy(0, 120);
    runtime.tick();
    const overlayNode2 = await waitForValue(
      () => {
        const overlayRoot = runtime.getOverlayRootWidget();
        if (!overlayRoot) {
          return null;
        }
        return findWidget(overlayRoot, overlayKey) as any;
      },
      (v) => v != null,
    );
    const nextScrollY = sv.scrollY;
    const actualDeltaY = nextScrollY - prevScrollY;
    expect(overlayNode2).not.toBeNull();
    const top2 = overlayNode2.top as number;

    expect(Math.round(top2 - top1)).toBe(-Math.round(actualDeltaY));
  });

  it('点击空白区域应收起 Overlay 面板', async () => {
    await runtime.render(
      <Container key="root" width={420} height={260} pointerEvent="auto">
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
          <Popconfirm key="pc" title="标题" description="描述">
            <Container key="pc-trigger" width={80} height={32} pointerEvent="auto" />
          </Popconfirm>
          <DatePicker key="dp" theme={Themes.light} width={200} />
        </Column>
      </Container>,
    );

    const root = runtime.getRootWidget()!;

    const select = findWidget(root, '#select') as Select;
    (select as any).toggleOpened({ stopPropagation: vi.fn() } as any);
    runtime.tick();
    await new Promise((r) => setTimeout(r, 20));

    const selectOverlayKey = `${String((select as any).key)}-dropdown-overlay`;
    const overlayRoot1 = runtime.getOverlayRootWidget()!;
    const selectMask = findWidget(overlayRoot1, `#${selectOverlayKey}-mask`) as any;
    const p1 = selectMask.getAbsolutePosition();
    dispatchToTree(overlayRoot1, selectMask, 'pointerdown', p1.dx + 1, p1.dy + 1);
    runtime.tick();
    await new Promise((r) => setTimeout(r, 20));
    expect(runtime.getOverlayRootWidget()).toBeNull();

    const pc = findWidget(root, '#pc') as Popconfirm;
    (pc as any).toggleOpened({ stopPropagation: vi.fn() } as any);
    runtime.tick();
    await new Promise((r) => setTimeout(r, 20));

    const pcOverlayKey = `${String((pc as any).key)}-popconfirm-overlay`;
    const overlayRoot2 = runtime.getOverlayRootWidget()!;
    const pcMask = findWidget(overlayRoot2, `#${pcOverlayKey}-mask`) as any;
    const p2 = pcMask.getAbsolutePosition();
    dispatchToTree(overlayRoot2, pcMask, 'pointerdown', p2.dx + 1, p2.dy + 1);
    runtime.tick();
    await new Promise((r) => setTimeout(r, 20));
    expect(runtime.getOverlayRootWidget()).toBeNull();

    const dp = findWidget(root, '#dp') as DatePicker;
    (dp as any).toggleOpened({ stopPropagation: vi.fn() } as any);
    runtime.tick();
    await new Promise((r) => setTimeout(r, 20));

    const dpOverlayKey = `${String((dp as any).key)}-date-picker-overlay`;
    const overlayRoot3 = runtime.getOverlayRootWidget()!;
    const dpMask = findWidget(overlayRoot3, `#${dpOverlayKey}-mask`) as any;
    const p3 = dpMask.getAbsolutePosition();
    dispatchToTree(overlayRoot3, dpMask, 'pointerdown', p3.dx + 1, p3.dy + 1);
    runtime.tick();
    await new Promise((r) => setTimeout(r, 20));
    expect(runtime.getOverlayRootWidget()).toBeNull();
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
