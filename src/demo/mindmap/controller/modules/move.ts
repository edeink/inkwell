import { CustomComponentType } from '../../custom-widget/type';

import type { MindmapController } from '../index';
import type { Offset, Widget } from '@/core/base';

import { findWidget } from '@/core/helper/widget-selector';

export function moveNode(controller: MindmapController, key: string, dx: number, dy: number): void {
  const root = controller.runtime.getRootWidget();
  const target = findWidget(root, `#${key}`) as Widget | null;
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
    wrapper.renderObject.offset = { dx, dy } as Offset;
  }
  controller.runtime.rerender();
}
