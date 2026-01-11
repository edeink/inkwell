import { describe, expect, it } from 'vitest';

import { CustomComponentType } from '../../type';
import { MindMapViewport } from '../../widgets/mindmap-viewport';
import { MindmapController } from '../index';

import type { ControllerPlugin } from '../plugins';
import type Runtime from '@/runtime';

function createFakeRuntime(): Runtime {
  const fake: any = {
    getRenderer: () => ({ getRawInstance: () => null }),
    getContainer: () => undefined,
    getRootWidget: () => null,
    rerender: () => void 0,
  };
  return fake as Runtime;
}

describe('插件注册', () => {
  it('正确注册和注销插件', () => {
    const runtime = createFakeRuntime();
    const viewport = new MindMapViewport({ type: CustomComponentType.MindMapViewport, key: 'vp' });
    const controller = new MindmapController(runtime, viewport);

    let attached = 0;
    let detached = 0;
    const plugin: ControllerPlugin = {
      id: 'test-plugin',
      onAttach: (ctx) => {
        expect(ctx.runtime).toBe(runtime);
        expect(ctx.viewport).toBe(viewport);
        expect(ctx.controller).toBe(controller);
        attached++;
      },
      onDetach: () => {
        detached++;
      },
    };

    controller.registerPlugin(plugin);
    expect(controller.getPlugins().find((p) => p.id === 'test-plugin')).toBeTruthy();
    expect(attached).toBe(1);

    controller.unregisterPlugin(plugin);
    expect(controller.getPlugins().find((p) => p.id === 'test-plugin')).toBeFalsy();
    expect(detached).toBe(1);
  });
});
