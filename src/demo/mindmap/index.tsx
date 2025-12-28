import { runApp } from './app';
import { MindmapController } from './controller/index';
import { CustomComponentType } from './type';
import { MindMapViewport } from './widgets/mindmap-viewport';

import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';

export { MindmapDemo } from './widgets/mindmap-demo';

export function setupMindmap(
  runtime: Runtime,
  width: number,
  height: number,
): MindmapController | null {
  runApp(runtime, { width, height });
  const root = runtime.getRootWidget();
  const vp = findWidget<MindMapViewport>(
    root,
    CustomComponentType.MindMapViewport,
  ) as MindMapViewport | null;

  if (vp) {
    // 我们无法直接在此处使用 setZoom，因为它是一个 React 状态设置器
    // Controller 需要提供一种订阅更改或以其他方式使用它的方法
    // 目前，我们返回 Controller 并让调用者根据需要处理订阅
    // 或者我们修改 MindmapController，使其核心逻辑暂时不依赖于外部状态设置器
    const ctrl = new MindmapController(runtime, vp, () => {});
    return ctrl;
  }
  return null;
}
