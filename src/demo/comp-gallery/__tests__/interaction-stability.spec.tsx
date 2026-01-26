/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { CompGalleryRoot } from '../widgets/comp-gallery-root';

import { message } from '@/comp';
import { dispatchToTree, EventRegistry } from '@/core/events';
import { clearSelectorCache, findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function mountRoot(): CompGalleryRoot {
  const el = <CompGalleryRoot width={800} height={600} theme={Themes.light} />;
  const data = compileElement(el as any);
  const root = WidgetRegistry.createWidget(data as any) as unknown as CompGalleryRoot;
  root.createElement(data as any);
  return root;
}

function findAllBySelector(root: any, selector: string): any[] {
  const res = findWidget<any>(root, selector, { multiple: true });
  return Array.isArray(res) ? res : res ? [res] : [];
}

function findSingleText(root: any, text: string): any {
  const sel = `Text[text="${text}"]`;
  const list = findAllBySelector(root, sel);
  expect(list.length).toBe(1);
  return list[0];
}

function findAncestor(node: any, type: string): any | null {
  let cur = node;
  while (cur) {
    if (cur.type === type) {
      return cur;
    }
    cur = cur.parent;
  }
  return null;
}

function clickButtonFromText(root: any, text: string): void {
  const textNode = findSingleText(root, text);
  const btn = findAncestor(textNode, 'Button');
  expect(btn).toBeTruthy();
  const target = btn.children?.[0] ?? btn;
  dispatchToTree(root, target, 'click', 0, 0);
}

function getState(root: any): any {
  return (root as any).state;
}

describe('CompGalleryRoot 交互稳定性', () => {
  it('点击“打开 Modal”不应同时打开 Drawer', () => {
    const root = mountRoot();

    clickButtonFromText(root, '打开 Modal');
    expect(getState(root).modalOpen).toBe(true);
    expect(getState(root).drawerOpen).toBe(false);
    expect(root.rebuild()).toBe(true);
    clearSelectorCache(root);

    expect(findAllBySelector(root, 'Text[text="打开 Modal"]').length).toBe(1);
    expect(findAllBySelector(root, 'Text[text="打开 Drawer"]').length).toBe(1);
  });

  it('点击“Message.success”只触发一次', () => {
    const root = mountRoot();
    const spy = vi.spyOn(message, 'success');

    clickButtonFromText(root, 'Message.success');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith('操作成功');
  });

  it('重复 rebuild 不应产生重复的关键按钮节点', () => {
    const root = mountRoot();

    const assertCounts = () => {
      expect(findAllBySelector(root, 'Text[text="打开 Modal"]').length).toBe(1);
      expect(findAllBySelector(root, 'Text[text="打开 Drawer"]').length).toBe(1);
      expect(findAllBySelector(root, 'Text[text="Message.success"]').length).toBe(1);
      expect(findAllBySelector(root, 'Text[text="删除"]').length).toBe(1);
    };

    assertCounts();

    for (let i = 0; i < 6; i++) {
      root.setState({ currentPage: (getState(root).currentPage as number) + 1 } as any);
      expect(root.rebuild()).toBe(true);
      clearSelectorCache(root);
      assertCounts();
    }
  });

  it('Popconfirm 打开后只渲染一个 Overlay 且触发按钮宽度不变', async () => {
    const host = document.createElement('div');
    host.id = `cg-interaction-${Math.random().toString(16).slice(2)}`;
    document.body.appendChild(host);
    const runtime = await Runtime.create(host.id, { renderer: 'canvas2d' });
    try {
      await runtime.render(
        <CompGalleryRoot key="cg-root" width={800} height={600} theme={Themes.light} />,
      );
      runtime.tick();
      await new Promise((r) => setTimeout(r, 20));

      const root = runtime.getRootWidget() as unknown as CompGalleryRoot;
      clearSelectorCache(root);
      const deleteText = findSingleText(root, '删除');
      const btn = findAncestor(deleteText, 'Button');
      const pc = findAncestor(deleteText, 'Popconfirm');
      expect(btn).toBeTruthy();
      expect(pc).toBeTruthy();

      const btnBox = (btn as any).children?.[0] ?? btn;
      const widthBefore = (btnBox as any).renderObject?.size?.width ?? 0;
      expect(widthBefore).toBeGreaterThan(0);

      const triggerKey = `${String((pc as any).key)}-trigger`;
      const trigger = findWidget<any>(root, `#${triggerKey}`);
      expect(trigger).toBeTruthy();

      const clickHandlers = EventRegistry.getHandlers(
        String((trigger as any).eventKey),
        'click',
        runtime as any,
      );
      expect(clickHandlers.length).toBe(1);
      expect(clickHandlers[0].capture).toBe(false);
      const originalClickHandler = clickHandlers[0].handler as any;
      const clickSpy = vi.fn((e) => originalClickHandler(e));
      EventRegistry.register(
        String((trigger as any).eventKey),
        'click',
        clickSpy as any,
        {},
        runtime as any,
      );

      dispatchToTree(root as any, trigger as any, 'click', 0, 0);
      runtime.tick();
      await new Promise((r) => setTimeout(r, 20));
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect((pc as any).state?.opened).toBe(true);
      clearSelectorCache(root);
      expect(findAllBySelector(root, `#${triggerKey}`).length).toBe(1);

      const overlayKey = `${String((pc as any).key)}-popconfirm-overlay`;
      const overlayRoot = runtime.getOverlayRootWidget();
      expect(overlayRoot).not.toBeNull();
      const overlayPanels = findWidget<any>(overlayRoot!, `#${overlayKey}`, { multiple: true });
      expect(Array.isArray(overlayPanels) ? overlayPanels.length : overlayPanels ? 1 : 0).toBe(1);

      clearSelectorCache(root);
      const deleteText2 = findSingleText(root, '删除');
      const btn2 = findAncestor(deleteText2, 'Button');
      expect(btn2).toBeTruthy();
      const btnBox2 = (btn2 as any).children?.[0] ?? btn2;
      const widthAfter = (btnBox2 as any).renderObject?.size?.width ?? 0;
      expect(widthAfter).toBe(widthBefore);
    } finally {
      runtime.destroy();
      document.body.removeChild(host);
    }
  });

  it('Modal 打开时应通过 Overlay 渲染', async () => {
    const host = document.createElement('div');
    host.id = `cg-modal-${Math.random().toString(16).slice(2)}`;
    document.body.appendChild(host);
    const runtime = await Runtime.create(host.id, { renderer: 'canvas2d' });
    try {
      await runtime.render(
        <CompGalleryRoot key="cg-root" width={800} height={600} theme={Themes.light} />,
      );
      runtime.tick();
      await new Promise((r) => setTimeout(r, 20));

      const root = runtime.getRootWidget() as unknown as CompGalleryRoot;
      clearSelectorCache(root);

      clickButtonFromText(root as any, '打开 Modal');
      runtime.tick();
      await new Promise((r) => setTimeout(r, 20));

      const overlayRoot = runtime.getOverlayRootWidget();
      expect(overlayRoot).not.toBeNull();
      expect(findWidget<any>(overlayRoot!, '#modal-modal-overlay-dialog')).not.toBeNull();
    } finally {
      runtime.destroy();
      document.body.removeChild(host);
    }
  });
});
