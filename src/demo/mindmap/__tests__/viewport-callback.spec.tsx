import { describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapViewport, type MindMapViewportProps } from '../widgets/mindmap-viewport';

describe('MindMapViewport 回调测试', () => {
  it('变换发生时应调用 onViewChange', () => {
    const onViewChange = vi.fn();
    const props: MindMapViewportProps = {
      type: CustomComponentType.MindMapViewport,
      scale: 1,
      tx: 0,
      ty: 0,
      onViewChange,
    };
    const vp = new MindMapViewport(props);

    // 1. 设置变换
    vp.setTransform(2, 100, 100);
    expect(onViewChange).toHaveBeenLastCalledWith({ scale: 2, tx: 100, ty: 100 });

    // 2. 设置位置
    vp.setPosition(200, 200);
    expect(onViewChange).toHaveBeenLastCalledWith({ scale: 2, tx: 200, ty: 200 });

    // 3. 设置缩放
    vp.setScale(3);
    expect(onViewChange).toHaveBeenLastCalledWith({ scale: 3, tx: 200, ty: 200 });
  });
});
