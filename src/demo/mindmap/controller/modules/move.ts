import type { MindmapController } from '../index';
import type { Widget } from '@/core/base';

function findByKey(widget: Widget | null, key: string): Widget | null {
  if (!widget) {
    return null;
  }
  if (widget.key === key) {
    return widget;
  }
  for (const c of widget.children) {
    const r = findByKey(c, key);
    if (r) {
      return r;
    }
  }
  return null;
}

export function moveNode(controller: MindmapController, key: string, dx: number, dy: number): void {
  const root = controller.runtime.getRootWidget();
  const target = findByKey(root, key);
  if (!target) {
    return;
  }
  target.renderObject.offset = { dx, dy } as any;
  controller.runtime.rerender();
}
