import { describe, it, expect, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapViewport } from '../widgets/mindmap-viewport';

describe('MindMapViewport 状态持久化测试', () => {
  it('当使用未定义的 prop 更新时，应保持 selectionRect 持久化', () => {
    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      width: 800,
      height: 600,
    });

    // 模拟 getWorldXY 以返回一致的坐标
    // (因为我们在这里测试逻辑，而不是坐标数学)
    vp.getWorldXY = vi.fn().mockReturnValue({ x: 100, y: 100 });

    // 1. 模拟按下鼠标 (开始选择)
    const mockEvent = {
      nativeEvent: { buttons: 1, clientX: 100, clientY: 100 },
      x: 100,
      y: 100,
      target: vp,
      currentTarget: vp,
      bubbles: true,
      cancelable: true,
      stopPropagation: () => {},
      preventDefault: () => {},
    } as any;

    vp.onPointerDown(mockEvent);

    // selectionRect 应该被初始化 (width/height 0)
    expect(vp.selectionRect).not.toBeNull();
    expect(vp.selectionRect).toEqual({ x: 100, y: 100, width: 0, height: 0 });

    // 2. 模拟 Widget 更新 (父级重新渲染)
    // 使用新 props 调用 createElement (但 selectionRect 未定义)
    // 这模拟了 React 重新渲染组件时发生的情况
    vp.createElement({
      type: CustomComponentType.MindMapViewport,
      width: 800,
      height: 600,
      // selectionRect 在此处为 undefined
    });

    // 3. 验证 selectionRect 持久化
    // 如果存在 bug，这里将为 null
    expect(vp.selectionRect).not.toBeNull();
    expect(vp.selectionRect).toEqual({ x: 100, y: 100, width: 0, height: 0 });
  });
});
