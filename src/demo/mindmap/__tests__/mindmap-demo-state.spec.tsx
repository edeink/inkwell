/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { MindmapDemo } from '../app';
import { CustomComponentType } from '../type';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import Runtime from '@/runtime';
import { testLogger } from '@/utils/test-logger';

describe('MindmapDemo State Management', async () => {
  beforeEach(() => {
    WidgetRegistry.registerType('MindmapDemo', MindmapDemo);
    if (!(HTMLCanvasElement.prototype as any)._inkwellCtxPatched) {
      (HTMLCanvasElement.prototype as any)._inkwellCtxPatched = true;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
        if (type !== '2d') {
          return null as any;
        }
        const ctx: any = {
          canvas: this as HTMLCanvasElement,
          save: () => undefined,
          restore: () => undefined,
          translate: () => undefined,
          scale: () => undefined,
          rotate: () => undefined,
          clearRect: () => undefined,
          fillRect: () => undefined,
          strokeRect: () => undefined,
          beginPath: () => undefined,
          closePath: () => undefined,
          moveTo: () => undefined,
          lineTo: () => undefined,
          quadraticCurveTo: () => undefined,
          fill: () => undefined,
          stroke: () => undefined,
          setLineDash: () => undefined,
          fillText: () => undefined,
          drawImage: () => undefined,
          getTransform() {
            return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as any;
          },
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
        };
        return ctx;
      } as any;
    }
  });

  it('initializes with correct state', async () => {
    const container = document.createElement('div');
    container.id = `mm-demo-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const demo = <MindmapDemo key="demo-init" width={800} height={600} />;
    await runtime.renderFromJSX(demo as any);

    const demoInstance = runtime.getRootWidget() as unknown as MindmapDemo;
    if (!demoInstance) {
      throw new Error('Root widget not found');
    }
    const state = (demoInstance as any).state;

    expect(state.activeKey).toBeNull();
    expect(state.editingKey).toBeNull();
    expect(state.graph).toBeDefined();
    // activeKey removed from graph
    expect((state.graph as any).activeKey).toBeUndefined();
  });

  it('updates activeKey when onActive is called', async () => {
    const container = document.createElement('div');
    container.id = `mm-demo-active-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const demo = <MindmapDemo key="demo-active" width={800} height={600} />;
    await runtime.renderFromJSX(demo as any);

    const demoInstance = runtime.getRootWidget() as unknown as MindmapDemo;
    if (!demoInstance) {
      throw new Error('Root widget not found');
    }

    // Simulate onActive callback
    (demoInstance as any).onActive('n1');

    await new Promise((r) => setTimeout(r, 50));

    const state = (demoInstance as any).state;
    expect(state.activeKey).toBe('n1');

    // Check if Viewport receives the new activeKey
    const vp = findWidget(
      demoInstance,
      `#${CustomComponentType.MindMapViewport}`,
    ) as unknown as MindMapViewport;
    expect(vp).not.toBeNull();
    expect(vp.activeKey).toBe('n1');
  });

  it('updates activeKey and editingKey when adding sibling', async () => {
    const container = document.createElement('div');
    container.id = `mm-demo-add-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const demo = <MindmapDemo key="demo-add" width={800} height={600} />;
    await runtime.renderFromJSX(demo as any);

    const demoInstance = runtime.getRootWidget() as unknown as MindmapDemo;
    if (!demoInstance) {
      throw new Error('Root widget not found');
    }
    testLogger.log('onActive keys:', Object.keys(demoInstance));

    // Simulate onActive callbackadding sibling
    (demoInstance as any).onAddSibling('n1', 1);

    await new Promise((r) => setTimeout(r, 0));

    const state = (demoInstance as any).state;
    const newId = `n${state.graph.nextId - 1}`; // The ID of the newly added node

    expect(state.activeKey).toBe(newId);
    expect(state.editingKey).toBe(newId);
  });

  it('clears activeKey when selection is deleted', async () => {
    const container = document.createElement('div');
    container.id = `mm-demo-del-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const demo = <MindmapDemo key="demo-del" width={800} height={600} />;
    await runtime.renderFromJSX(demo as any);

    const demoInstance = runtime.getRootWidget() as unknown as MindmapDemo;
    if (!demoInstance) {
      throw new Error('Root widget not found');
    }

    // Set active key first
    (demoInstance as any).onActive('n1');
    await new Promise((r) => setTimeout(r, 0));

    // Delete selection
    (demoInstance as any).onDeleteSelection();
    await new Promise((r) => setTimeout(r, 0));

    const state = (demoInstance as any).state;
    expect(state.activeKey).toBeNull();
  });

  it('结束编辑时应通过 onEdit 回写节点标题', async () => {
    const container = document.createElement('div');
    container.id = `mm-demo-edit-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const demo = <MindmapDemo key="demo-edit" width={800} height={600} />;
    await runtime.renderFromJSX(demo as any);

    const demoInstance = runtime.getRootWidget() as unknown as MindmapDemo;
    if (!demoInstance) {
      throw new Error('Root widget not found');
    }

    (demoInstance as any).onEdit('n1');
    await new Promise((r) => setTimeout(r, 0));
    expect(((demoInstance as any).state as any).editingKey).toBe('n1');

    (demoInstance as any).onEdit(null, '新的标题');
    await new Promise((r) => setTimeout(r, 0));

    const state = (demoInstance as any).state as any;
    expect(state.editingKey).toBeNull();
    expect(state.graph.nodes.get('n1')?.title).toBe('新的标题');
  });

  it('失焦导致 editingKey 被清空后仍应回写节点标题', async () => {
    const container = document.createElement('div');
    container.id = `mm-demo-blur-commit-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const demo = <MindmapDemo key="demo-blur-commit" width={800} height={600} />;
    await runtime.renderFromJSX(demo as any);

    const demoInstance = runtime.getRootWidget() as unknown as MindmapDemo;
    if (!demoInstance) {
      throw new Error('Root widget not found');
    }

    (demoInstance as any).onEdit('n1');
    await new Promise((r) => setTimeout(r, 0));
    expect(((demoInstance as any).state as any).editingKey).toBe('n1');

    (demoInstance as any).onEditingKeyChange(null);
    await new Promise((r) => setTimeout(r, 0));
    expect(((demoInstance as any).state as any).editingKey).toBeNull();

    (demoInstance as any).commitEditing('失焦后的标题');
    await new Promise((r) => setTimeout(r, 0));

    const state = (demoInstance as any).state as any;
    expect(state.editingKey).toBeNull();
    expect(state.graph.nodes.get('n1')?.title).toBe('失焦后的标题');
  });
});
