import { describe, expect, it } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapViewport, type MindMapViewportProps } from '../widgets/mindmap-viewport';

describe('MindMapViewport 状态保持', () => {
  it('更新时若 scale 为 undefined 应保持原有 scale', () => {
    // 1. 创建初始 MindMapViewport
    const props1: MindMapViewportProps = {
      type: CustomComponentType.MindMapViewport,
      scale: 1,
      tx: 0,
      ty: 0,
    };
    const vp = new MindMapViewport(props1);

    // 验证初始状态
    expect(vp.scale).toBe(1);

    // 2. 模拟用户交互（修改内部状态）
    vp.setTransform(2, 100, 100);
    expect(vp.scale).toBe(2);
    expect(vp.tx).toBe(100);

    // 3. 模拟重新渲染（Scene 通过框架调用 createElement）
    // 框架调用：existingWidget.createElement(newProps)
    const props2: MindMapViewportProps = {
      type: CustomComponentType.MindMapViewport,
      // scale, tx, ty 未定义
      width: 800,
      height: 600,
    };

    vp.createElement(props2);

    // 4. 验证状态保持
    expect(vp.scale).toBe(2);
    expect(vp.tx).toBe(100);
  });
});
