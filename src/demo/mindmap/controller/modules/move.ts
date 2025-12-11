import { CustomComponentType } from '../../custom-widget/type';

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
  let wrapper: Widget | null = null;
  if (target.type === CustomComponentType.MindMapNodeToolbar) {
    wrapper = target;
  } else if (target.type === CustomComponentType.MindMapNode) {
    const p = target.parent as Widget | null;
    if (p && p.type === CustomComponentType.MindMapNodeToolbar) {
      wrapper = p;
    } else {
      wrapper = target;
    }
  } else {
    wrapper = target;
  }
  if (wrapper) {
    wrapper.renderObject.offset = { dx, dy } as any;
  }
  controller.runtime.rerender();
}
